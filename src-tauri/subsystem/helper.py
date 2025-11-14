from scapy.all import get_if_list, get_if_addr, get_if_hwaddr
import psutil
import json

def list_ifaces():
    out = []

    addrs = psutil.net_if_addrs()

    for iface in get_if_list():
        ipv4 = None

        try:
            ipv4 = get_if_addr(iface)
        except Exception:
            ipv4 = None

        if iface in addrs:
            for a in addrs[iface]:
                if a.family == psutil.AF_INET:
                    ipv4 = a.address

        out.append({
            "name": iface,
            "ipv4": ipv4,
        })

    return out


if __name__ == "__main__":
    print(json.dumps(list_ifaces(), indent=2))
