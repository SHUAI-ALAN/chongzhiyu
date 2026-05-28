const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const runtimeDir = path.join(root, 'server', 'runtime');
const infoFile = path.join(runtimeDir, 'tunnel-info.json');
const outFile = path.join(runtimeDir, 'tunnel-serveo.out.log');
const errFile = path.join(runtimeDir, 'tunnel-serveo.err.log');

function getArgValue(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const options = {
  port: Number(getArgValue('port', process.env.PORT || 8787)),
  host: getArgValue('host', process.env.TUNNEL_HOST || '127.0.0.1'),
  subdomain: getArgValue('subdomain', process.env.TUNNEL_SUBDOMAIN || 'chongzhiyu-shuai'),
  restart: process.argv.includes('--restart') || process.argv.includes('-r')
};

function ensureRuntimeDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
}

function isProcessRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return false;
  }
}

function readExistingInfo() {
  try {
    return JSON.parse(fs.readFileSync(infoFile, 'utf8'));
  } catch (error) {
    return null;
  }
}

function stopProcess(pid) {
  if (!pid) return;
  try {
    process.kill(Number(pid));
  } catch (error) {
    // The process may already have exited.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkLocalServer() {
  const localUrl = `http://${options.host}:${options.port}`;
  try {
    const response = await fetch(`${localUrl}/health`, { signal: AbortSignal.timeout(5000) });
    const payload = await response.json();
    if (payload.code !== 0) throw new Error('Unexpected health response');
  } catch (error) {
    throw new Error(`Local server is not ready at ${localUrl}. Start it first with 'npm start'.`);
  }
}

function readLogOutput() {
  let output = '';
  for (const file of [outFile, errFile]) {
    try {
      output += fs.readFileSync(file, 'utf8');
    } catch (error) {
      // Log file may not exist yet.
    }
  }
  return output.replace(/\x1B\[[0-9;]*m/g, '');
}

async function waitForPublicUrl(child) {
  let registrationUrl = '';
  for (let i = 0; i < 24; i += 1) {
    await sleep(500);
    const output = readLogOutput();
    const registrationMatch = output.match(/https:\/\/console\.serveo\.net\/ssh\/keys\?[^\s]+/);
    if (registrationMatch) {
      registrationUrl = registrationMatch[0].trim();
    }
    const match = output.match(/Forwarding HTTP traffic from\s+(https:\/\/[A-Za-z0-9.-]+)/);
    if (match) {
      return { publicUrl: match[1].trim(), registrationUrl };
    }
    if (!isProcessRunning(child.pid)) {
      break;
    }
  }
  return { publicUrl: '', registrationUrl };
}

async function main() {
  ensureRuntimeDir();

  const existing = readExistingInfo();
  if (existing && isProcessRunning(existing.pid)) {
    if (!options.restart) {
      console.log('Tunnel is already running.');
      console.log(`PID: ${existing.pid}`);
      console.log(`Public URL: ${existing.publicUrl}`);
      console.log(`Official URL: ${existing.officialUrl}`);
      console.log("Use 'npm run tunnel:stop' before starting a new tunnel.");
      return;
    }
    stopProcess(existing.pid);
    await sleep(1000);
  }

  await checkLocalServer();

  fs.rmSync(outFile, { force: true });
  fs.rmSync(errFile, { force: true });

  const remoteSpec = options.subdomain
    ? `${options.subdomain}:80:${options.host}:${options.port}`
    : `80:${options.host}:${options.port}`;
  const sshCommand = process.platform === 'win32' ? 'ssh.exe' : 'ssh';
  const sshArgs = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=60',
    '-R', remoteSpec,
    'serveo.net'
  ];

  const outFd = fs.openSync(outFile, 'a');
  const errFd = fs.openSync(errFile, 'a');
  const child = spawn(sshCommand, sshArgs, {
    detached: true,
    windowsHide: true,
    stdio: ['ignore', outFd, errFd]
  });
  child.unref();

  const { publicUrl, registrationUrl } = await waitForPublicUrl(child);
  fs.closeSync(outFd);
  fs.closeSync(errFd);

  if (!publicUrl) {
    stopProcess(child.pid);
    throw new Error(`Tunnel started but no public URL was detected. Check ${outFile} and ${errFile}.`);
  }

  const requestedFixedUrl = options.subdomain
    ? `https://${options.subdomain}.serveousercontent.com`
    : '';
  const info = {
    provider: 'serveo',
    pid: child.pid,
    localUrl: `http://${options.host}:${options.port}`,
    publicUrl,
    officialUrl: `${publicUrl}/official/`,
    adminUrl: `${publicUrl}/admin/`,
    startedAt: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
    subdomain: options.subdomain,
    requestedFixedUrl,
    fixedUrlActive: Boolean(options.subdomain && publicUrl === requestedFixedUrl),
    registrationUrl,
    command: `ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R ${remoteSpec} serveo.net`
  };

  fs.writeFileSync(infoFile, `${JSON.stringify(info, null, 2)}\n`, 'utf8');

  console.log('Tunnel started.');
  console.log(`PID: ${child.pid}`);
  console.log(`Public URL: ${publicUrl}`);
  console.log(`Official URL: ${publicUrl}/official/`);
  console.log(`Admin URL: ${publicUrl}/admin/`);
  if (options.subdomain && publicUrl !== requestedFixedUrl) {
    console.log(`Requested fixed URL: ${requestedFixedUrl}`);
    console.log('Serveo did not assign the fixed URL yet. Register the SSH key first:');
    console.log(registrationUrl || '(registration URL was not found in Serveo output)');
  }
  console.log(`Info saved to: ${infoFile}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
