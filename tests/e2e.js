// End-to-end: Electron app (Alice) ↔ Chrome web version (Bob) through a local server.
// Needs fixtures in /tmp/fx (movie.mp4, noise.wav, ring.wav) — see tests/README.md.
const fs = require('fs');
const H = require('./harness');
const { check, sleep } = H;

const FX = '/tmp/fx';
const OPENED = '/tmp/parley-opened.txt';

// Bytes received on Bob's side for a given role/kind.
const inboundBytes = (page, kind) =>
  page.evaluate(async (kind) => {
    const st = await window.__parleyDebug.Call.pc.getStats();
    let b = 0;
    st.forEach((r) => {
      if (r.type === 'inbound-rtp' && r.kind === kind) b += r.bytesReceived || 0;
    });
    return b;
  }, kind);

// RMS of a track measured inside the page for ~1s.
const rmsOf = (page, which) =>
  page.evaluate(async (which) => {
    const C = window.__parleyDebug.Call;
    const t = which === 'raw' ? C.audioTrack._raw || C.audioTrack : C.audioTrack;
    const ctx = new AudioContext();
    await ctx.resume();
    const src = ctx.createMediaStreamSource(new MediaStream([t]));
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    let acc = 0;
    let n = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 50));
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (const v of buf) s += v * v;
      acc += Math.sqrt(s / buf.length);
      n++;
    }
    ctx.close();
    return acc / n;
  }, which);

(async () => {
  fs.rmSync(OPENED, { force: true });
  fs.writeFileSync('/tmp/fakebrowser.sh', `#!/bin/sh\necho "$@" > ${OPENED}\n`, { mode: 0o755 });
  const srv = await H.startServer();
  const A = await H.launchElectron([`--use-file-for-fake-audio-capture=${FX}/noise.wav`]);
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  try {
    // The call buttons fade out after 3 s without mouse movement (tested in tests/v12.js);
    // keep them visible here so the robot can click them.
    for (const p of [a, b]) await p.evaluate(() => localStorage.setItem('parley:autoHideUi', 'false'));
    console.log('Sign-in & chat');
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);
    await check('both signed in and see each other', async () => {
      await H.openContact(a, 'Bob');
      await H.openContact(b, 'Alice');
    });
    await check('chat Bob → Alice', async () => {
      await b.fill('#msgInput', 'hello alice https://example.com/parley-test');
      await b.press('#msgInput', 'Enter');
      await a.waitForSelector('.msg.in .bubble:has-text("hello alice")', { timeout: 5000 });
    });

    console.log('Contact bar');
    await check('sidebar hides via toggle', async () => {
      await a.click('.convo-header .sidebar-toggle');
      return a.evaluate(() => getComputedStyle(document.querySelector('.sidebar')).display === 'none');
    });
    await check('sidebar stays hidden after restart (reload)', async () => {
      await a.reload();
      await a.waitForSelector('#main:not(.hidden)', { timeout: 10000 });
      return a.evaluate(() => document.querySelector('#main').classList.contains('sidebar-hidden'));
    });
    await check('Ctrl+B shows it again', async () => {
      await a.keyboard.press('Control+b');
      return a.evaluate(() => getComputedStyle(document.querySelector('.sidebar')).display !== 'none');
    });

    console.log('Links open in chosen browser');
    await check('browser list detected', async () => {
      const list = await a.evaluate(() => window.parley.listBrowsers());
      console.log('     found:', list.map((x) => x.name).join(', ') || '(none)');
      return Array.isArray(list);
    });
    await check('chat link opens in the chosen browser, not the default', async () => {
      await a.evaluate(() => {
        localStorage.setItem('parley:linkBrowser', JSON.stringify('/tmp/fakebrowser.sh'));
        window.parley.setLinkBrowser('/tmp/fakebrowser.sh');
      });
      await H.openContact(a, 'Bob');
      await a.click('.msg.in .bubble a');
      for (let i = 0; i < 30 && !fs.existsSync(OPENED); i++) await sleep(100);
      const got = fs.readFileSync(OPENED, 'utf8').trim();
      return got === 'https://example.com/parley-test' || Promise.reject(new Error('got ' + got));
    });

    console.log('Ringtone');
    await check('custom ringtone file saved from Settings', async () => {
      await b.click('#settingsBtn');
      await b.waitForSelector('#ringSelect option', { state: 'attached' });
      await b.setInputFiles('#ringFile', `${FX}/ring.wav`);
      await b.waitForFunction(() => JSON.parse(localStorage.getItem('parley:ringtone')) === 'custom', null, { timeout: 5000 });
      await b.waitForSelector('#ringSelect option[value=custom]', { state: 'attached' });
      await b.click('#settingsDone');
    });
    await check('Alice picks a built-in ringtone (Marimba)', async () => {
      await a.click('#settingsBtn');
      await a.waitForSelector('#ringSelect option[value=marimba]', { state: 'attached' });
      await a.selectOption('#ringSelect', 'marimba');
      await sleep(300);
      const on = await a.evaluate(() => !!window.__parleyDebug && document.querySelector('#ringPreviewBtn').textContent.includes('Stop'));
      await a.click('#settingsDone');
      return on && (await a.evaluate(() => JSON.parse(localStorage.getItem('parley:ringtone')) === 'marimba'));
    });

    console.log('Call');
    await H.openContact(a, 'Bob');
    await a.waitForSelector('#videoCallBtn:not([disabled])');
    await a.click('#videoCallBtn');
    await b.waitForSelector('#incoming:not(.hidden)', { timeout: 10000 });
    await check('Bob hears his custom ringtone', async () => {
      await b.waitForFunction(() => !document.querySelector('#ringAudio').paused, null, { timeout: 4000 });
    });
    await b.click('#acceptVideoBtn');
    await check('call connects', async () => {
      await a.waitForFunction(() => window.__parleyDebug.Call.state === 'active', null, { timeout: 20000 });
      await b.waitForFunction(() => window.__parleyDebug.Call.state === 'active', null, { timeout: 20000 });
    });
    await check('ringtone stops on answer', () => b.evaluate(() => document.querySelector('#ringAudio').paused));

    console.log('Noise removal + audio quality');
    await check('Alice mic runs through AI noise removal (standard)', () => a.evaluate(() => window.__parleyDebug.Call.audioTrack._noise === 'standard'));
    await check('Bob (browser) mic runs through AI noise removal', () => b.evaluate(() => window.__parleyDebug.Call.audioTrack._noise === 'standard'));
    await check('noise removal actually removes noise (pink-noise mic)', async () => {
      const raw = await rmsOf(a, 'raw');
      const out = await rmsOf(a, 'out');
      console.log(`     raw ${raw.toFixed(4)} → processed ${out.toFixed(4)} (${Math.round((1 - out / raw) * 100)}% quieter)`);
      return raw > 0.01 && out < raw * 0.25;
    });
    await check('voice audio is reaching Bob', async () => {
      const x = await inboundBytes(b, 'audio');
      await sleep(1500);
      return (await inboundBytes(b, 'audio')) > x;
    });
    await check('Opus tuned: 64 kbps voice + FEC negotiated', async () => {
      const line = await a.evaluate(async () => {
        const st = await window.__parleyDebug.Call.pc.getStats();
        let f = '';
        st.forEach((r) => {
          if (r.type === 'codec' && /opus/i.test(r.mimeType) && r.sdpFmtpLine && /maxaveragebitrate/.test(r.sdpFmtpLine)) f += r.sdpFmtpLine + ' | ';
        });
        return f || window.__parleyDebug.Call.pc.remoteDescription.sdp.match(/a=fmtp:\d+ .*opus|a=fmtp:111[^\r\n]*/)?.[0];
      });
      console.log('     ', line);
      return /maxaveragebitrate=64000/.test(line) && /useinbandfec=1/.test(line);
    });
    await check('switch to Strong (GTCRN) mid-call', async () => {
      await a.click('#settingsBtn'); // the gear is always at the right end of the chat header
      await a.selectOption('#noiseSelect', 'strong');
      await a.waitForFunction(() => window.__parleyDebug.Call.audioTrack._noise === 'strong', null, { timeout: 8000 });
      await a.click('#settingsDone');
      const sent = await a.evaluate(() => window.__parleyDebug.Call.audioSender.track === window.__parleyDebug.Call.audioTrack);
      const x = await inboundBytes(b, 'audio');
      await sleep(1500);
      return sent && (await inboundBytes(b, 'audio')) > x;
    });
    await check('GTCRN also removes noise', async () => {
      const raw = await rmsOf(a, 'raw');
      const out = await rmsOf(a, 'out');
      console.log(`     raw ${raw.toFixed(4)} → processed ${out.toFixed(4)}`);
      return out < raw * 0.25;
    });
    await check('turning noise removal off sends the plain mic', async () => {
      await a.click('#settingsBtn'); // the gear is always at the right end of the chat header
      await a.selectOption('#noiseSelect', 'off');
      await a.waitForFunction(() => !window.__parleyDebug.Call.audioTrack._noise, null, { timeout: 5000 });
      await a.selectOption('#noiseSelect', 'standard');
      await a.waitForFunction(() => window.__parleyDebug.Call.audioTrack._noise === 'standard', null, { timeout: 5000 });
      await a.click('#settingsDone');
    });
    await check('mute still works with processed mic', async () => {
      await a.click('#micBtn');
      await b.waitForSelector('#remoteFlags :text("Muted")', { timeout: 4000 });
      const en = await a.evaluate(() => window.__parleyDebug.Call.audioTrack.enabled);
      await a.click('#micBtn');
      return en === false;
    });

    console.log('Screen sharing (desktop app)');
    await a.click('#screenBtn');
    await a.waitForSelector('#screenPicker:not(.hidden) .source', { timeout: 10000 });
    await a.click('#sourceGrid .source');
    await check('Alice sees a "You’re sharing" banner', async () => {
      await a.waitForSelector('#shareBanner:not(.hidden)', { timeout: 10000 });
    });
    await check('screen button shows as on', () => a.evaluate(() => document.querySelector('#screenBtn').classList.contains('on')));
    await check('Bob sees the "Sharing screen" indicator', async () => {
      await b.waitForSelector('#remoteFlags :text("Sharing screen")', { timeout: 6000 });
    });
    await check('Bob receives the screen picture (not the camera)', async () => {
      // v1.3: the screen arrives as its own video, and Alice's camera keeps going in its tile
      await b.waitForFunction(() => document.querySelector('#stage').classList.contains('has-screen') && document.querySelector('#screenVideo').videoWidth >= 1000, null, { timeout: 10000 });
      const w = await b.evaluate(() => `${screenVideo.videoWidth}x${screenVideo.videoHeight}`);
      console.log('     remote picture', w);
    });
    await check('log file records the share', async () => {
      const p = require('path').join(require('os').homedir(), '.config', 'Parley', 'parley.log');
      const alt = require('path').join(require('os').homedir(), '.config', 'parley', 'parley.log');
      const f = fs.existsSync(p) ? p : alt;
      const txt = fs.readFileSync(f, 'utf8');
      return /display media: granting/.test(txt) && /screen share running/.test(txt);
    });
    await check('banner Stop button ends the share for both', async () => {
      await a.click('#shareStopBtn');
      await b.waitForFunction(() => !document.querySelector('#stage').classList.contains('has-screen') && !document.querySelector('#screenVideo').srcObject, null, { timeout: 5000 });
      return a.evaluate(() => document.querySelector('#shareBanner').classList.contains('hidden'));
    });
    await check('cancelling the picker does nothing bad', async () => {
      await a.click('#screenBtn');
      await a.waitForSelector('#screenPicker:not(.hidden)');
      await a.click('#pickerCancel');
      await sleep(300);
      return a.evaluate(() => !window.__parleyDebug.Call.screenTrack && !document.querySelector('#screenBtn').classList.contains('busy'));
    });

    console.log('Watch together (Alice has the file)');
    await a.setInputFiles('#mediaFile', `${FX}/movie.mp4`);
    await check('Bob sees the movie', async () => {
      await b.waitForFunction(() => document.querySelector('#stage').classList.contains('has-media') && document.querySelector('#mediaVideo').videoWidth > 0, null, { timeout: 15000 });
      console.log('     movie at Bob', await b.evaluate(() => `${mediaVideo.videoWidth}x${mediaVideo.videoHeight}`));
    });
    await check('movie sound is sent in stereo at high bitrate', async () => {
      const sample = () =>
        a.evaluate(async () => {
          const C = window.__parleyDebug.Call;
          const mediaAudio = C.mediaSenders.find((x) => x.track && x.track.kind === 'audio');
          const st = await mediaAudio.getStats();
          let bytes = 0;
          let fmtp = '';
          const codecs = {};
          st.forEach((r) => r.type === 'codec' && (codecs[r.id] = r));
          st.forEach((r) => {
            if (r.type === 'outbound-rtp') {
              bytes += r.bytesSent;
              fmtp = codecs[r.codecId]?.sdpFmtpLine || '';
            }
          });
          return { bytes, fmtp, t: performance.now() };
        });
      await sleep(2500);
      const s1 = await sample();
      await sleep(3000);
      const s2 = await sample();
      const kbps = ((s2.bytes - s1.bytes) * 8) / (s2.t - s1.t);
      console.log(`     movie audio ${Math.round(kbps)} kbps, ${s2.fmtp}`);
      return /stereo=1/.test(s2.fmtp) && kbps > 90;
    });
    await check('Bob can pause Alice’s movie', async () => {
      await b.click('#mediaPlayBtn');
      await a.waitForFunction(() => document.querySelector('#mediaVideo').paused, null, { timeout: 4000 });
      await b.waitForFunction(() => document.querySelector('#mediaPlayBtn').dataset.icon === 'play', null, { timeout: 4000 });
    });
    await check('Bob can skip forward 10 s', async () => {
      const t0 = await a.evaluate(() => mediaVideo.currentTime);
      await b.click('#mediaFwdBtn');
      await a.waitForFunction((t0) => mediaVideo.currentTime > t0 + 8, t0, { timeout: 4000 });
    });
    await check('Bob can resume it', async () => {
      await b.click('#mediaPlayBtn');
      await a.waitForFunction(() => !document.querySelector('#mediaVideo').paused, null, { timeout: 4000 });
    });
    await check('Alice stops sharing → Bob’s view clears', async () => {
      await a.click('#mediaStopBtn');
      await b.waitForFunction(() => !document.querySelector('#stage').classList.contains('has-media'), null, { timeout: 5000 });
    });

    console.log('Hang up');
    await check('hang up ends call on both sides', async () => {
      await a.click('#hangupBtn');
      await b.waitForFunction(() => window.__parleyDebug.Call.state === 'idle', null, { timeout: 5000 });
      return a.evaluate(() => window.__parleyDebug.Call.state === 'idle');
    });
    await check('mic is released after hang-up', () =>
      a.evaluate(() => !window.__parleyDebug.Call.audioTrack)
    );
  } catch (e) {
    console.log('  ✗ ABORTED —', e.message.split('\n').slice(0, 3).join(' '));
    H.fail();
  } finally {
    const failed = H.summary();
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
    process.exit(failed ? 1 : 0);
  }
})();
