//! Finds the League Client (LCU) port and auth token: first from the lockfile in the League
//! install folder, then from the LeagueClientUx.exe command line.

use std::path::Path;

#[derive(Clone, Debug)]
pub struct Credentials {
    pub port: u16,
    pub password: String,
    /// "lockfile" or "process", shown in the status for troubleshooting.
    pub source: &'static str,
}

const DEFAULT_DIRS: [&str; 3] = [
    "T:\\Riot Games\\League of Legends",
    "C:\\Riot Games\\League of Legends",
    "D:\\Riot Games\\League of Legends",
];

/// The lockfile reads "LeagueClient:<pid>:<port>:<password>:<protocol>".
fn from_lockfile(dir: &Path) -> Option<Credentials> {
    let text = std::fs::read_to_string(dir.join("lockfile")).ok()?;
    let parts: Vec<&str> = text.trim().split(':').collect();
    let port = parts.get(2)?.parse().ok()?;
    let password = parts.get(3)?.to_string();
    Some(Credentials { port, password, source: "lockfile" })
}

fn arg_value(command_line: &str, name: &str) -> Option<String> {
    let start = command_line.find(name)? + name.len();
    let value: String = command_line[start..].chars().take_while(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
    (!value.is_empty()).then_some(value)
}

/// The client's command line carries --app-port and --remoting-auth-token.
#[cfg(windows)]
fn from_process() -> Option<Credentials> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let script = "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine";
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let command_line = String::from_utf8_lossy(&output.stdout);
    let port = arg_value(&command_line, "--app-port=")?.parse().ok()?;
    let password = arg_value(&command_line, "--remoting-auth-token=")?;
    Some(Credentials { port, password, source: "process" })
}

#[cfg(not(windows))]
fn from_process() -> Option<Credentials> {
    None
}

/// custom_dir: the League folder set in Settings (empty: only the default places).
pub fn find(custom_dir: &str) -> Option<Credentials> {
    let custom = (!custom_dir.is_empty()).then_some(custom_dir);
    custom.into_iter().chain(DEFAULT_DIRS).find_map(|dir| from_lockfile(Path::new(dir))).or_else(from_process)
}

#[cfg(test)]
mod tests {
    use super::arg_value;

    #[test]
    fn reads_arguments_from_the_command_line() {
        let line = "\"LeagueClientUx.exe\" \"--remoting-auth-token=abc-DEF_1\" \"--app-port=51234\"";
        assert_eq!(arg_value(line, "--app-port=").as_deref(), Some("51234"));
        assert_eq!(arg_value(line, "--remoting-auth-token=").as_deref(), Some("abc-DEF_1"));
        assert_eq!(arg_value(line, "--missing="), None);
    }
}
