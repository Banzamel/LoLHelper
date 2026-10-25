// Finds the League Client (LCU) port and auth token: first from the lockfile in the
// League install folder, then from the LeagueClientUx.exe command line as a fallback.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DEFAULT_DIRS = [
  'T:\\Riot Games\\League of Legends',
  'C:\\Riot Games\\League of Legends',
  'D:\\Riot Games\\League of Legends',
];

function fromLockfile(dir) {
  try {
    const [, pid, port, password, protocol] = fs.readFileSync(path.join(dir, 'lockfile'), 'utf8').trim().split(':');
    return { pid: Number(pid), port: Number(port), password, protocol, source: 'lockfile' };
  } catch {
    return null;
  }
}

function fromProcess() {
  return new Promise((resolve) => {
    const cmd = "Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine";
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 8000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const port = stdout.match(/--app-port=(\d+)/);
      const token = stdout.match(/--remoting-auth-token=([\w-]+)/);
      const dir = stdout.match(/--install-directory=([^"]+?)(?:"|\s--)/);
      if (!port || !token) return resolve(null);
      resolve({ port: Number(port[1]), password: token[1], protocol: 'https', source: 'process', installDir: dir ? dir[1].trim() : null });
    });
  });
}

async function findCredentials(customDir) {
  const dirs = [customDir, ...DEFAULT_DIRS].filter(Boolean);
  for (const dir of dirs) {
    const creds = fromLockfile(dir);
    if (creds) return { ...creds, installDir: dir };
  }
  return fromProcess();
}

module.exports = { findCredentials, DEFAULT_DIRS };
