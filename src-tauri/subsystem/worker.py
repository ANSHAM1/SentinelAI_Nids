#!/usr/bin/env python3

import sys
import json
import traceback
import multiprocessing
import argparse
import pandas as pd
from pathlib import Path
from nfstream import NFStreamer

import numpy as np
import joblib

try:
    import xgboost as xgb
except:
    xgb = None

try:
    import onnxruntime as ort
except:
    ort = None

try:
    import torch
except:
    torch = None


# ---------------------------------------------------------------------
# 1) THE EXACT 77 LSTM FEATURES (ORDER FIXED)
# ---------------------------------------------------------------------
LSTM_FEATURES = [
    'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets',
    'Total Length of Fwd Packets', 'Total Length of Bwd Packets',
    'Fwd Packet Length Max', 'Fwd Packet Length Min', 'Fwd Packet Length Mean',
    'Fwd Packet Length Std', 'Bwd Packet Length Max', 'Bwd Packet Length Min',
    'Bwd Packet Length Mean', 'Bwd Packet Length Std', 'Flow Bytes/s',
    'Flow Packets/s', 'Flow IAT Mean', 'Flow IAT Std', 'Flow IAT Max',
    'Flow IAT Min', 'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std',
    'Fwd IAT Max', 'Fwd IAT Min', 'Bwd IAT Total', 'Bwd IAT Mean',
    'Bwd IAT Std', 'Bwd IAT Max', 'Bwd IAT Min', 'Fwd PSH Flags',
    'Bwd PSH Flags', 'Fwd URG Flags', 'Bwd URG Flags', 'Fwd Header Length',
    'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s', 'Min Packet Length',
    'Max Packet Length', 'Packet Length Mean', 'Packet Length Std',
    'Packet Length Variance', 'FIN Flag Count', 'SYN Flag Count',
    'RST Flag Count', 'PSH Flag Count', 'ACK Flag Count', 'URG Flag Count',
    'CWE Flag Count', 'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size',
    'Avg Fwd Segment Size', 'Avg Bwd Segment Size', 'Fwd Header Length.1',
    'Fwd Avg Bytes/Bulk', 'Fwd Avg Packets/Bulk', 'Fwd Avg Bulk Rate',
    'Bwd Avg Bytes/Bulk', 'Bwd Avg Packets/Bulk', 'Bwd Avg Bulk Rate',
    'Subflow Fwd Packets', 'Subflow Fwd Bytes', 'Subflow Bwd Packets',
    'Subflow Bwd Bytes', 'Init_Win_bytes_forward', 'Init_Win_bytes_backward',
    'act_data_pkt_fwd', 'min_seg_size_forward', 'Active Mean', 'Active Std',
    'Active Max', 'Active Min', 'Idle Mean', 'Idle Std', 'Idle Max',
    'Idle Min'
]

# XGBoost = 77 LSTM features + 1 "Destination Port"
XGB_FEATURES = ["Destination Port"] + LSTM_FEATURES


# ---------------------------------------------------------------------
# FEATURE EXTRACTION
# ---------------------------------------------------------------------
def nf_to_dict(flow):
    out = {}
    for attr in dir(flow):
        if attr.startswith("_"):
            continue
        try:
            val = getattr(flow, attr)
            if not callable(val):
                out[attr] = val
        except:
            pass
    return out


def numeric(v):
    try:
        # convert ints, floats, numpy scalars
        return float(v)
    except:
        return 0.0


# ---------------------------------------------------------------------
# FORMAT NFSTREAM → EXACT 77, EXACT 78 FEATURE VECTORS
# ---------------------------------------------------------------------
def make_feature_vectors(nf):
    """
    Returns:
      vec77 = LSTM input
      vec78 = XGB input
    """

    # ensure missing NFStreamer fields → 0.0
    def get(name):
        return numeric(nf.get(name, 0.0))

    # LSTM
    vec77 = [get(f) for f in LSTM_FEATURES]

    # XGBoost: Destination Port + 77
    vec78 = [get("Destination Port")] + vec77

    return vec77, vec78


# ---------------------------------------------------------------------
# MODEL LOADING
# ---------------------------------------------------------------------
def load_models():
    base = Path(__file__).resolve().parent.joinpath("models")

    models = {}

    # ---------- XGB ----------
    try:
        models["xgb"] = joblib.load(base/"XGBoost"/"sentinel_xgboost_multiclass.pkl")
        models["xgb_scaler"] = joblib.load(base/"XGBoost"/"scaler.pkl")
        models["xgb_encoder"] = joblib.load(base/"XGBoost"/"label_encoder.pkl")
        # print("[Worker] XGBoost loaded.")
    except Exception as e:
        # print("[Worker] XGB failed:", e)
        models["xgb"] = None

    # ---------- LSTM ----------
    try:
        models["lstm_scaler"] = joblib.load(base/"LSTM"/"lstm_scaler.pkl")
        models["lstm_threshold"] = float(np.load(base/"LSTM"/"lstm_threshold.npy"))
        # print("[Worker] LSTM scaler + threshold loaded.")
    except:
        models["lstm_scaler"] = None
        models["lstm_threshold"] = None

    # ONNX preferred
    if ort and (base/"LSTM"/"lstm_autoencoder.onnx").exists():
        models["lstm_onnx"] = ort.InferenceSession(str(base/"LSTM"/"lstm_autoencoder.onnx"))
        # print("[Worker] LSTM ONNX loaded.")
    else:
        models["lstm_onnx"] = None

    return models


# ---------------------------------------------------------------------
# XGBOOST
# ---------------------------------------------------------------------
def predict_xgb(models, vec78):
    if models["xgb"] is None:
        return None

    v = np.array(vec78).reshape(1, -1)

    if models["xgb_scaler"] is not None:
        import pandas as pd
        v = models["xgb_scaler"].transform(
            pd.DataFrame(v, columns=XGB_FEATURES)
        )

    pred = models["xgb"].predict(v)[0]

    label = (
        models["xgb_encoder"].inverse_transform([pred])[0]
        if models["xgb_encoder"] else str(pred)
    )

    return {
        "label": label,
        "is_anomaly": label.lower() != "benign"
    }


# ---------------------------------------------------------------------
# LSTM (ONNX)
# ---------------------------------------------------------------------
def predict_lstm(models, vec77):
    scaler = models["lstm_scaler"]
    threshold = models["lstm_threshold"]

    if threshold is None:
        return None

    v = np.array(vec77).reshape(1, -1)

    if scaler:
        import pandas as pd
        v = scaler.transform(
            pd.DataFrame(v, columns=LSTM_FEATURES)
        )

    v3 = v.reshape(1, 1, -1).astype(np.float32)

    sess = models["lstm_onnx"]
    inp = sess.get_inputs()[0].name
    out = sess.run(None, {inp: v3})[0]

    err = float(np.mean((v3 - out)**2))

    return {
        "label": "unknown" if err > threshold else "benign",
        "is_anomaly": err > threshold
    }

# ---------------------------------------------------------------------
# MAIN NFSTREAM LOOP
# ---------------------------------------------------------------------
def run_streamer(iface, models):
    # print(json.dumps({"info": "worker-starting", "iface": iface}), flush=True)

    streamer = NFStreamer(
        source=iface,
        statistical_analysis=True,
        decode_tunnels=True,
        promiscuous_mode=True,
        bpf_filter="ip",
    )

    for flow in streamer:
        try:
            nf = nf_to_dict(flow)

            vec77, vec78 = make_feature_vectors(nf)

            # XGB first
            out = predict_xgb(models, vec78)

            # fallback to LSTM if benign
            if out and not out["is_anomaly"]:
                lstm_out = predict_lstm(models, vec77)
                out = lstm_out if lstm_out["is_anomaly"] else out

            out = {
                "iface": iface,
                "label": out["label"],
                "is_anomaly": out["is_anomaly"]
            }

            print(json.dumps(out), flush=True)

        except Exception:
            pass
            # traceback.print_exc(file=sys.stdout)
            # print(json.dumps({"error": "flow-processing-failed"}), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--iface", required=True)
    args = parser.parse_args()

    models = load_models()
    run_streamer(args.iface.strip(), models)


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()