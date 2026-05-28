const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtimeDir = path.join(root, 'server', 'runtime');
const infoFile = path.join(runtimeDir, 'tunnel-info.json');

function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return false;
  }
}

if (!fs.existsSync(infoFile)) {
  console.log('No tunnel-info.json found. Nothing to stop.');
  process.exit(0);
}

const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
if (isProcessRunning(info.pid)) {
  try {
    process.kill(Number(info.pid));
    console.log(`Stopped tunnel process PID: ${info.pid}`);
  } catch (error) {
    console.log(`Tunnel process was not running: ${info.pid}`);
  }
} else {
  console.log(`Tunnel process was not running: ${info.pid}`);
}

fs.rmSync(infoFile, { force: true });
console.log('Removed tunnel info file.');
