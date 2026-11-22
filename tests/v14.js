// v1.4.0, end to end: Electron app (Alice) ↔ Chrome web version (Bob).
// - microphone / camera / speaker choices apply the moment you pick them, during a call too,
//   and the exact device you picked is the one that opens
// - call volume (friend's voice + shared sound), from the call controls and Settings
// - call snapshots: full-resolution screen + camera from each side, sent in the chat, and
//   saved in Pictures/Parley Snapshots for the person who pressed it
// - the mini window's back button brings the full window back
// - Mac screen-recording help (permission check IPC, the fix panel)
// Needs fixtures in /tmp/fx (see tests/README.md).
const fs = require('fs');
const os = require('os');
const path = require('path');
const H = require('./harness');
const { check, sleep } = H;

const mainWin = (app, fn) =>
  app.evaluate(({ BrowserWindow }, src) => {
    const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('index.html'));
    return new Function('w', src)(w);
  }, fn);

(async () => {
  const srv = await H.startServer();
  const A = await H.launchElectron();
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  const pictures = await A.app.evaluate(({ app }) => app.getPath('pictures'));
  const snapRoot = path.join(pictures, 'Parley Snapshots');
  fs.rmSync(snapRoot, { recursive: true, force: true });
  try {
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);
    await a.evaluate(() => localStorage.setItem('parley:autoHideUi', 'false'));
    await b.evaluate(() => localStorage.setItem('parley:autoHideUi', 'false'));
    await H.connectCall(a, b);
    await sleep(1500);

    console.log('Devices');
    const mics = await a.evaluate(async () => (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput').map((d) => ({ id: d.deviceId, label: d.label })));
    console.log('      mics:', mics.map((m) => m.label).join(' | '));
    await check('the exact microphone you pick opens (not "something close")', async () => {
      const want = mics.find((m) => m.id !== 'default' && m.id !== 'communications') || mics[0];
      const got = await a.evaluate(async (id) => {
        const t = await window.__parleyDebug.getMic(id);
        const d = t.getSettings().deviceId;
        t.stop();
        return d;
      }, want.id);
      return got === want.id || Promise.reject(new Error(`asked ${want.id.slice(0, 8)}, got ${String(got).slice(0, 8)}`));
    });
    await check('picking another microphone in Settings switches it live during the call', async () => {
      await a.click('#settingsBtn');
      await a.waitForSelector('#settings:not(.hidden)');
      await sleep(500);
      const before = await a.evaluate(() => (window.__parleyDebug.Call.audioTrack._raw || window.__parleyDebug.Call.audioTrack).getSettings().deviceId);
      const other = mics.find((m) => m.id !== before && m.id !== 'default' && m.id !== 'communications');
      if (!other) throw new Error('only one fake mic');
      await a.selectOption('#micSelect', other.id);
      await a.waitForFunction((id) => {
        const t = window.__parleyDebug.Call.audioTrack;
        return (t._raw || t).getSettings().deviceId === id;
      }, other.id, { timeout: 6000 });
      const sent = await a.evaluate(() => {
        const C = window.__parleyDebug.Call;
        return C.audioSender.track === C.audioTrack && C.audioTrack.readyState === 'live';
      });
      const stored = await a.evaluate(() => JSON.parse(localStorage.getItem('parley:devices') || '{}').mic);
      return sent && stored === other.id;
    });
    await check('…and it is still the one in use when Settings closes', async () => {
      const id = await a.evaluate(() => document.querySelector('#micSelect').value);
      await a.click('#settingsDone');
      await sleep(400);
      return a.evaluate((id) => {
        const t = window.__parleyDebug.Call.audioTrack;
        return (t._raw || t).getSettings().deviceId === id;
      }, id);
    });
    await check('Bob still hears Alice after the switch', async () => {
      await sleep(1500);
      const kbps = async () =>
        b.evaluate(async () => {
          const st = await window.__parleyDebug.Call.pc.getStats();
          let bytes = 0;
          st.forEach((r) => r.type === 'inbound-rtp' && r.kind === 'audio' && (bytes += r.bytesReceived));
          return bytes;
        });
      const b0 = await kbps();
      await sleep(1000);
      const b1 = await kbps();
      return b1 - b0 > 1000 || Promise.reject(new Error(`${b1 - b0} bytes/s`));
    });

    console.log('Volume');
    await check('the volume button opens Voice (and Shared sound when there is some)', async () => {
      await a.click('#volBtn');
      const r = await a.evaluate(() => ({ open: !document.querySelector('#volPop').classList.contains('hidden'), shared: !document.querySelector('#volSharedRow').classList.contains('hidden') }));
      return r.open && !r.shared;
    });
    await check('turning Voice down changes how loud Bob is for Alice (and is remembered)', async () => {
      await a.evaluate(() => {
        const r = document.querySelector('#volVoice');
        r.value = '0.3';
        r.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const r = await a.evaluate(() => ({ el: document.querySelector('#remoteVideo').volume, stored: localStorage.getItem('parley:callVolume'), text: document.querySelector('#volVoiceText').textContent }));
      return Math.abs(r.el - 0.3) < 0.01 && r.stored === '0.3' && r.text === '30%';
    });
    await check('Voice at 0 shows the speaker as off; Settings has the same slider', async () => {
      await a.evaluate(() => {
        const r = document.querySelector('#volVoice');
        r.value = '0';
        r.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const off = await a.evaluate(() => document.querySelector('#volBtn').dataset.icon === 'volumeOff');
      await a.mouse.click(5, 300); // click elsewhere closes the popover
      const closed = await a.evaluate(() => document.querySelector('#volPop').classList.contains('hidden'));
      await a.click('#settingsBtn');
      await a.waitForSelector('#settings:not(.hidden)');
      const inSettings = await a.evaluate(() => Number(document.querySelector('#callVolume').value));
      await a.evaluate(() => {
        const r = document.querySelector('#callVolume');
        r.value = '1';
        r.dispatchEvent(new Event('input', { bubbles: true }));
      });
      const back = await a.evaluate(() => document.querySelector('#remoteVideo').volume);
      await a.click('#settingsDone');
      return off && closed && inSettings === 0 && back === 1;
    });

    console.log('Snapshots');
    await check('a snapshot button is in the call controls', () => a.isVisible('#snapBtn'));
    let aliceShots = [];
    await check('Alice presses it: full-size screen + camera of her own go to Bob in the chat', async () => {
      await a.click('#snapBtn');
      await b.waitForFunction(() => {
        const h = window.__parleyDebug.history('Alice');
        return h.filter((m) => m.file?.snap && m.file.id).length >= 2;
      }, null, { timeout: 20000 });
      aliceShots = await b.evaluate(() => window.__parleyDebug.history('Alice').filter((m) => m.file?.snap).map((m) => ({ ...m.file.snap, w: m.file.w, h: m.file.h, type: m.file.type, size: m.file.size })));
      console.log('     ', JSON.stringify(aliceShots));
      const screen = aliceShots.find((x) => x.what === 'screen');
      const face = aliceShots.find((x) => x.what === 'face');
      return !!screen && !!face && screen.of === 'Alice' && screen.type === 'image/png';
    });
    await check('Alice’s screen picture is the real display size (not the 1080p share video)', async () => {
      const disp = await A.app.evaluate(({ screen }) => {
        const d = screen.getPrimaryDisplay();
        return { w: Math.round(d.size.width * d.scaleFactor), h: Math.round(d.size.height * d.scaleFactor) };
      });
      const s = aliceShots.find((x) => x.what === 'screen');
      return (s.w === disp.w && s.h === disp.h) || Promise.reject(new Error(`${s.w}x${s.h} vs display ${disp.w}x${disp.h}`));
    });
    await check('Alice’s camera picture is bigger than the call video (the camera’s own maximum)', async () => {
      const call = await a.evaluate(() => window.__parleyDebug.Call.camTrack.getSettings());
      const f = aliceShots.find((x) => x.what === 'face');
      console.log(`      call video ${call.width}x${call.height}, snapshot ${f.w}x${f.h}`);
      return f.w >= call.width && f.w * f.h > call.width * call.height;
    });
    await check('…and the call video goes back to its normal size afterwards', async () => {
      await sleep(1500);
      const st = await a.evaluate(() => window.__parleyDebug.Call.camTrack.getSettings());
      return st.width <= 1280 || Promise.reject(new Error(`${st.width}x${st.height}`));
    });
    await check('Bob saw the flash + a note, and his camera picture came back to Alice', async () => {
      await a.waitForFunction(() => window.__parleyDebug.history('Bob').some((m) => m.file?.snap?.of === 'Bob' && m.file.id), null, { timeout: 20000 });
      const fromBob = await a.evaluate(() => window.__parleyDebug.history('Bob').filter((m) => m.file?.snap && m.dir === 'in').map((m) => m.file.snap.what));
      console.log('      from Bob:', JSON.stringify(fromBob));
      // the web version can't screenshot without asking, so Bob sends only his camera
      return fromBob.length === 1 && fromBob[0] === 'face';
    });
    await check('snapshot photos show a caption with whose picture it is', async () => {
      const cap = await b.evaluate(() => [...document.querySelectorAll('.snap-caption')].map((x) => x.textContent));
      console.log('     ', JSON.stringify(cap));
      return cap.some((t) => /Alice’s screen/.test(t)) && cap.some((t) => /Alice’s camera/.test(t));
    });
    await check('all three pictures are saved in Pictures/Parley Snapshots for Alice', async () => {
      for (let i = 0; i < 40; i++) {
        const dirs = fs.existsSync(snapRoot) ? fs.readdirSync(snapRoot) : [];
        const files = dirs.length ? fs.readdirSync(path.join(snapRoot, dirs[0])) : [];
        if (files.length >= 3) {
          console.log('     ', dirs[0], '→', files.join(', '));
          const png = fs.readFileSync(path.join(snapRoot, dirs[0], files.find((f) => /screen/.test(f))));
          return png.slice(1, 4).toString() === 'PNG' && /Alice & Bob/.test(dirs[0]);
        }
        await sleep(250);
      }
      throw new Error('not saved');
    });
    await check('“include my screen” off → only the camera is sent', async () => {
      await b.evaluate(() => localStorage.setItem('parley:snapScreen', 'false'));
      await a.evaluate(() => localStorage.setItem('parley:snapScreen', 'false'));
      const fromAlice = () => b.evaluate(() => window.__parleyDebug.history('Alice').filter((m) => m.dir === 'in' && m.file?.snap).map((m) => m.file.snap.what));
      const n0 = (await fromAlice()).length;
      await a.click('#snapBtn');
      await b.waitForFunction((n0) => window.__parleyDebug.history('Alice').filter((m) => m.dir === 'in' && m.file?.snap).length >= n0 + 1, n0, { timeout: 20000 });
      await sleep(1500);
      const added = (await fromAlice()).slice(n0);
      await a.evaluate(() => localStorage.setItem('parley:snapScreen', 'true'));
      return added.length === 1 && added[0] === 'face';
    });

    console.log('Mini window');
    let mini;
    await check('mini window ↗ brings the full window back (and closes the mini window)', async () => {
      const p = A.app.waitForEvent('window');
      await mainWin(A.app, 'w.hide()');
      mini = await p;
      await sleep(800);
      const hidden = await mainWin(A.app, 'return !w.isVisible()');
      await mini.mouse.move(100, 100);
      await mini.click('[data-a=expand]');
      await sleep(900);
      const shown = await mainWin(A.app, 'return w.isVisible()');
      const closed = mini.isClosed() || (await a.evaluate(() => !window.__parleyDebug.Mini.isOpen()));
      return (hidden && shown && closed) || Promise.reject(new Error(JSON.stringify({ hidden, shown, closed })));
    });

    console.log('Screen sharing help (Mac)');
    await check('the permission check answers (granted outside macOS)', async () => (await a.evaluate(() => window.parley.screenPermission())) === 'granted');
    await check('the fix panel opens with Fix it / Open System Settings / Restart', async () => {
      await a.evaluate(() => window.__parleyDebug.ScreenFix.open());
      const r = await a.evaluate(() => ({
        modal: !document.querySelector('#screenPicker').classList.contains('hidden'),
        fix: !document.querySelector('#pickerFix').classList.contains('hidden'),
        relaunch: document.querySelector('#pickerRelaunch').textContent,
      }));
      await a.click('#pickerCancel');
      return r.modal && r.fix && /Hang up & restart/.test(r.relaunch);
    });
    await check('a normal screen share still starts afterwards (fix panel hidden)', async () => {
      await a.click('#screenBtn');
      await a.waitForSelector('#screenPicker:not(.hidden) .source', { timeout: 8000 });
      const fixHidden = await a.evaluate(() => document.querySelector('#pickerFix').classList.contains('hidden'));
      await a.click('#sourceGrid .source');
      await b.waitForFunction(() => document.querySelector('#stage').classList.contains('has-screen'), null, { timeout: 10000 });
      await a.click('#shareStopBtn');
      return fixHidden;
    });

    await a.click('#hangupBtn');
    await b.waitForFunction(() => window.__parleyDebug.Call.state === 'idle', null, { timeout: 5000 });
    await check('mic is released after hang-up', async () => {
      await sleep(500);
      return a.evaluate(() => !window.__parleyDebug.Call.audioTrack);
    });
  } catch (e) {
    console.log('v14 test crashed:', e.message);
    H.fail();
  } finally {
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
    fs.rmSync(snapRoot, { recursive: true, force: true });
    process.exit(H.summary() ? 1 : 0);
  }
})();
