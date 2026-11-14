// Shared test harness: local server + Electron app (Alice) + Chrome page (Bob).
// Run under Xvfb:  xvfb-run -a node tests/<test>.js
const path = require('path');
const { spawn } = require('child_process');
const { _electron, chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 3999;
const URL = `http://localhost:${PORT}`;
const FAKE = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const srv = spawn(process.execPath, [path.join(ROOT, 'server', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), ACCESS_CODE: 'test' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(URL + '/health');
      if (r.ok) return srv;
    } catch {}
    await sleep(100);
  }
  throw new Error('server did not start');
}

async function launchElectron(extraArgs = []) {
  const app = await _electron.launch({
    executablePath: path.join(ROOT, 'app', 'node_modules', 'electron', 'dist', 'electron'),
    args: ['--no-sandbox', '--ozone-platform=x11', ...FAKE.filter((f) => !f.includes('fake-ui')), ...extraArgs, path.join(ROOT, 'app')],
    env: { ...process.env, PARLEY_TEST: '1' },
  });
  const page = await app.firstWindow();
  page.on('console', (m) => process.env.VERBOSE && console.log('[alice]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[alice pageerror]', e.message));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return { app, page };
}

async function launchChrome() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', ...FAKE], headless: false });
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  page.on('console', (m) => process.env.VERBOSE && console.log('[bob]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[bob pageerror]', e.message));
  await page.goto(URL);
  return { browser, page };
}

async function login(page, name, withServer) {
  await page.evaluate(
    ([name, url, withServer]) => {
      if (withServer) document.querySelector('#serverUrl').value = url;
      document.querySelector('#displayName').value = name;
      document.querySelector('#accessCode').value = 'test';
      document.querySelector('#loginForm').requestSubmit();
    },
    [name, URL, withServer]
  );
  await page.waitForSelector('#main:not(.hidden)', { timeout: 10000 });
}

async function openContact(page, name) {
  await page.waitForSelector(`#contacts li:has-text("${name}")`, { timeout: 10000 });
  await page.click(`#contacts li:has-text("${name}")`);
}

// Alice (electron) video-calls Bob (chrome); Bob accepts with video.
async function connectCall(alice, bob) {
  await openContact(alice, 'Bob');
  await alice.waitForSelector('#videoCallBtn:not([disabled])');
  await alice.click('#videoCallBtn');
  await bob.waitForSelector('#incoming:not(.hidden)', { timeout: 10000 });
  await bob.click('#acceptVideoBtn');
  await alice.waitForFunction(() => window.__parleyDebug.Call.state === 'active', null, { timeout: 20000 });
  await bob.waitForFunction(() => window.__parleyDebug.Call.state === 'active', null, { timeout: 20000 });
}

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    const ok = await fn();
    if (ok === false) throw new Error('returned false');
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failed++;
    console.log('  ✗', name, '—', e.message.split('\n')[0]);
  }
}
const summary = () => {
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed;
};

const fail = () => failed++;
module.exports = { fail, startServer, launchElectron, launchChrome, login, openContact, connectCall, check, summary, sleep, URL };
