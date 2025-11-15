use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

pub struct PythonRunner {
    python: PathBuf,
}

impl PythonRunner {
    pub fn new(dir: &Path) -> Self {
        Self {
            python: dir.join("python.exe"),
        }
    }

    pub fn run(&self, script: impl AsRef<Path>) -> Option<String> {
        let output = Command::new(&self.python)
            .arg(script.as_ref())
            .stderr(Stdio::piped())
            .output()
            .ok()?;

        Some(String::from_utf8_lossy(&output.stdout).to_string())
    }

    pub fn run_args(&self, script: impl AsRef<Path>, iface_name: &str) -> Option<Child> {
        let mut cmd = Command::new(&self.python);

        cmd.arg(script.as_ref())
            .arg("--iface")
            .arg(iface_name)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        cmd.spawn().ok()
    }
}
