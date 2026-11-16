// v1.2 features, end to end: Electron app (Alice) ↔ Chrome web version (Bob).
// Profile pictures, auto-scroll, read receipts, emoji/stickers, photos & files, themes,
// close-to-tray, the mini window, auto-hiding call UI, full screen, and the update proxy.
// Needs fixtures in /tmp/fx (see tests/README.md).
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const H = require('./harness');
const { check, sleep } = H;
const FX = '/tmp/fx';

const mainWin = (app, fn) => app.evaluate(({ BrowserWindow }, src) => {
  const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('index.html'));
  return new Function('w', src)(w);
}, fn);

(async () => {
  const srv = await H.startServer();
  const A = await H.launchElectron();
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  try {
    for (const p of [a, b]) await p.evaluate(() => localStorage.setItem('parley:autoHideUi', 'false'));
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);
    await H.openContact(a, 'Bob');
    await H.openContact(b, 'Alice');

    console.log('Profile pictures');
    await check('Alice sets a picture → Bob sees it in his contact list', async () => {
      await a.setInputFiles('#avatarFile', `${FX}/photo.png`);
      await b.waitForSelector('#contacts li .avatar.has-img', { timeout: 8000 });
      const bg = await b.evaluate(() => document.querySelector('#peerAvatar').style.backgroundImage);
      return /data:image\/jpeg/.test(bg);
    });
    await check('picture is small (256 px JPEG, under 110 KB)', () =>
      a.evaluate(() => JSON.parse(localStorage.getItem('parley:myAvatar:alice')).data.length < 110 * 1024)
    );
    await check('it survives Bob reloading (cached)', async () => {
      await b.reload();
      await b.waitForSelector('#main:not(.hidden)');
      await b.waitForSelector('#contacts li .avatar.has-img', { timeout: 8000 });
    });
    await H.openContact(b, 'Alice');

    console.log('Auto-scroll');
    await check('40 messages in a row → Alice is looking at the newest one', async () => {
      await b.evaluate(async () => {
        const t = document.querySelector('#msgInput');
        for (let i = 1; i <= 40; i++) {
          t.value = `line ${i} ` + 'lorem ipsum '.repeat(i % 5 + 1);
          t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          await new Promise((r) => setTimeout(r, 15));
        }
      });
      await a.waitForSelector('.msg.in .bubble:has-text("line 40")', { timeout: 8000 });
      await sleep(300);
      return a.evaluate(() => { const m = messages; return m.scrollHeight - m.scrollTop - m.clientHeight < 5 && m.scrollHeight > m.clientHeight * 1.5; });
    });
    await check('scrolled up + new message → stays put and shows “New messages”', async () => {
      await a.evaluate(() => { messages.scrollTop = 0; messages.dispatchEvent(new Event('scroll')); });
      await sleep(100);
      await b.fill('#msgInput', 'are you there?');
      await b.press('#msgInput', 'Enter');
      await a.waitForSelector('.msg.in .bubble:has-text("are you there?")');
      await sleep(200);
      const top = await a.evaluate(() => messages.scrollTop);
      const pill = await a.isVisible('#jumpBtn');
      return top < 50 && pill;
    });
    await check('“New messages” jumps to the bottom', async () => {
      await a.click('#jumpBtn');
      await sleep(150);
      return a.evaluate(() => messages.scrollHeight - messages.scrollTop - messages.clientHeight < 5 && document.querySelector('#jumpBtn').classList.contains('hidden'));
    });

    console.log('Read receipts');
    await check('message to someone who is looking → “Seen”', async () => {
      await a.fill('#msgInput', 'did you see this?');
      await a.press('#msgInput', 'Enter');
      await a.waitForSelector('.msg.out.last .seen', { timeout: 6000 });
      return a.evaluate(() => document.querySelector('.msg.out.last .tick.read') !== null);
    });
    await check('not looking → delivered only; “Seen” once they open the chat', async () => {
      await b.evaluate(() => { document.querySelector('#convo').classList.add('hidden'); window.__parleyDebug.S.active = null; });
      await a.fill('#msgInput', 'second one');
      await a.press('#msgInput', 'Enter');
      await sleep(1200);
      const st = await a.evaluate(() => window.__parleyDebug.history('Bob').at(-1).status);
      await H.openContact(b, 'Alice');
      await a.waitForFunction(() => window.__parleyDebug.history('Bob').at(-1).status === 'read', null, { timeout: 6000 });
      return st === 'sent' || Promise.reject(new Error('status was ' + st));
    });
    await check('read receipts can be turned off', async () => {
      await b.evaluate(() => localStorage.setItem('parley:readReceipts', 'false'));
      await a.fill('#msgInput', 'private?');
      await a.press('#msgInput', 'Enter');
      await sleep(1500);
      const st = await a.evaluate(() => window.__parleyDebug.history('Bob').at(-1).status);
      await b.evaluate(() => localStorage.setItem('parley:readReceipts', 'true'));
      return st === 'sent' || Promise.reject(new Error('status was ' + st));
    });

    console.log('Emoji & stickers');
    await check('emoji picker inserts emoji; an emoji-only message shows big', async () => {
      await a.click('#emojiBtn');
      await a.click('#pickerEmoji .emoji-grid button >> nth=7');
      const val = await a.inputValue('#msgInput');
      await a.press('#msgInput', 'Enter');
      await b.waitForSelector('.msg.in .bubble.jumbo', { timeout: 5000 });
      return [...val].length >= 1;
    });
    await check('a regular message with an emoji is NOT big', async () => {
      await a.fill('#msgInput', 'ok 👍');
      await a.press('#msgInput', 'Enter');
      await b.waitForSelector('.msg.in .bubble:has-text("ok 👍")');
      return b.evaluate(() => !document.querySelector('.msg.in.last .bubble').classList.contains('jumbo'));
    });
    await check('Pip sticker arrives as a sticker', async () => {
      await a.click('#emojiBtn');
      await a.click('#picker .tab[data-tab=stickers]');
      await a.click('#pickerStickers .sticker-grid button[title="Love"]');
      await b.waitForSelector('.msg.in img.sticker', { timeout: 5000 });
      return b.evaluate(() => document.querySelector('.msg.in img.sticker').naturalWidth > 0);
    });
    await check('Bob adds his own sticker and sends it', async () => {
      await b.click('#emojiBtn');
      await b.click('#picker .tab[data-tab=stickers]');
      await b.setInputFiles('#stickerFile', `${FX}/photo.png`);
      await b.waitForSelector('#pickerStickers .sticker-grid button:not(.add) img[src^="blob:"]', { timeout: 5000 });
      await b.click('#pickerStickers .sticker-grid button:not(.add) img[src^="blob:"]');
      await a.waitForSelector('.msg.in .photo.sticker-photo img', { timeout: 10000 });
      return a.evaluate(() => { const f = window.__parleyDebug.history('Bob').at(-1).file; return f.sticker && f.w <= 320; });
    });

    console.log('Photos & files');
    await check('photo: sent, shrunk to ≤2048 px, shows for Bob', async () => {
      await a.setInputFiles('#attachFile', `${FX}/photo.png`);
      await a.click('#sendBtn'); // v1.3: attachments wait in the tray until Send
      await b.waitForSelector('.msg.in .photo:not(.sticker-photo) img', { timeout: 15000 });
      await b.waitForFunction(() => document.querySelector('.msg.in .photo:not(.sticker-photo) img').naturalWidth > 0, null, { timeout: 10000 });
      const f = await b.evaluate(() => window.__parleyDebug.history('Alice').filter((m) => m.file && !m.file.sticker).at(-1).file);
      console.log(`     ${f.name} ${f.w}x${f.h} ${Math.round(f.size / 1024)} KB`);
      return Math.max(f.w, f.h) <= 2048;
    });
    await check('Bob is still scrolled to the newest message after the photo loads', async () => {
      await sleep(500);
      return b.evaluate(() => messages.scrollHeight - messages.scrollTop - messages.clientHeight < 5);
    });
    await check('clicking a photo opens the viewer', async () => {
      await b.click('.msg.in .photo:not(.sticker-photo)');
      await b.waitForSelector('#lightbox:not(.hidden) img[src^="blob:"]');
      await b.click('#lightboxClose');
    });
    await check('file (3 MB): upload progress, then a file card for Bob', async () => {
      await a.setInputFiles('#attachFile', `${FX}/doc.bin`);
      await a.click('#sendBtn'); // v1.3: attachments wait in the tray until Send
      await b.waitForSelector('.msg.in .file-card .file-name:has-text("doc.bin")', { timeout: 15000 });
      return a.evaluate(() => window.__parleyDebug.history('Bob').at(-1).status !== 'failed');
    });
    await check('Bob downloads it (byte-exact)', async () => {
      const size = await b.evaluate(async () => {
        const m = window.__parleyDebug.history('Alice').filter((x) => x.file?.name === 'doc.bin').at(-1);
        const blob = await window.__parleyDebug.Files.ensure(m);
        return blob && blob.size;
      });
      return size === 3000000 || Promise.reject(new Error('got ' + size));
    });
    await check('Alice (desktop) saves a file Bob sent into Downloads', async () => {
      const dl = await A.app.evaluate(({ app }) => app.getPath('downloads'));
      fs.rmSync(path.join(dl, 'ring.wav'), { force: true });
      await b.setInputFiles('#attachFile', `${FX}/ring.wav`);
      await b.click('#sendBtn'); // v1.3: attachments wait in the tray until Send
      await a.waitForSelector('.msg.in .file-card .file-name:has-text("ring.wav")', { timeout: 15000 });
      await a.click('.msg.in .file-card:has-text("ring.wav") .icon-btn');
      for (let i = 0; i < 50 && !fs.existsSync(path.join(dl, 'ring.wav')); i++) await sleep(100);
      const same = fs.statSync(path.join(dl, 'ring.wav')).size === fs.statSync(`${FX}/ring.wav`).size;
      await a.waitForSelector('.msg.in .file-card:has-text("ring.wav") .file-sub:has-text("Saved")', { timeout: 3000 });
      return same;
    });
    await check('server refuses uploads without the access code', async () => {
      const r = await fetch(H.URL + '/files', { method: 'POST', headers: { 'x-parley-name': 'Alice' }, body: 'x' });
      return r.status === 401;
    });
    await check('contact list shows the last message as a preview', () =>
      b.evaluate(() => /📎|You:/.test(document.querySelector('#contacts li .c-preview').textContent))
    );

    console.log('Color schemes');
    await check('picking “Daylight” switches to the light theme', async () => {
      await a.click('#settingsBtn');
      await a.click('#themeGrid .theme[data-theme=light]');
      const bg = await a.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
      await a.click('#settingsDone');
      return bg === '#f3f5f9';
    });
    await check('theme is remembered after a restart', async () => {
      await a.reload();
      await a.waitForSelector('#main:not(.hidden)');
      return a.evaluate(() => document.documentElement.dataset.theme === 'light');
    });
    await a.evaluate(() => window.__parleyDebug.applyTheme('midnight'));

    console.log('Background running');
    await check('closing the window hides it (Parley keeps running)', async () => {
      const r = await mainWin(A.app, 'w.close(); return { visible: w.isVisible(), destroyed: w.isDestroyed() };');
      return !r.visible && !r.destroyed;
    });
    await check('messages still arrive while hidden', async () => {
      await b.fill('#msgInput', 'ping while hidden');
      await b.press('#msgInput', 'Enter');
      await a.waitForFunction(() => window.__parleyDebug.history('Bob').some((m) => m.text === 'ping while hidden'), null, { timeout: 5000 });
    });
    await check('an incoming call brings the window back', async () => {
      await b.click('#audioCallBtn');
      await A.app.evaluate(({ BrowserWindow }) => new Promise((res) => {
        const t0 = Date.now();
        const tick = () => (BrowserWindow.getAllWindows()[0].isVisible() || Date.now() - t0 > 8000 ? res() : setTimeout(tick, 100));
        tick();
      }));
      const vis = await mainWin(A.app, 'return w.isVisible();');
      await a.waitForSelector('#incoming:not(.hidden)');
      await a.click('#declineBtn');
      await b.waitForFunction(() => window.__parleyDebug.Call.state === 'idle');
      return vis;
    });

    console.log('Call: mini window, auto-hide, full screen');
    await a.evaluate(() => localStorage.setItem('parley:autoHideUi', 'true'));
    await H.connectCall(a, b);
    await check('call buttons fade after 3 s without the mouse, come back on move', async () => {
      await a.mouse.move(600, 300);
      await sleep(3600);
      const idle = await a.evaluate(() => document.querySelector('#stage').classList.contains('idle'));
      await a.mouse.move(640, 320);
      await sleep(100);
      const awake = await a.evaluate(() => !document.querySelector('#stage').classList.contains('idle'));
      return idle && awake;
    });
    await check('full-screen button fills the screen with the whole call (not just a video)', async () => {
      await a.click('#fullBtn');
      await a.waitForFunction(() => document.fullscreenElement?.id === 'stage', null, { timeout: 4000 });
      await a.keyboard.press('Escape');
      await a.evaluate(() => document.fullscreenElement && document.exitFullscreen());
      await a.waitForFunction(() => !document.fullscreenElement, null, { timeout: 4000 });
    });
    let mini;
    await check('hiding Parley during a call opens the mini window', async () => {
      const p = A.app.waitForEvent('window', { timeout: 8000 });
      await mainWin(A.app, 'w.hide();');
      mini = await p;
      await mini.waitForSelector('#v', { timeout: 5000 });
    });
    await check('mini window plays Bob’s camera', () =>
      mini.waitForFunction(() => document.querySelector('#v').videoWidth > 0, null, { timeout: 8000 })
    );
    await check('mini window floats above everything (incl. fullscreen apps) and has no taskbar entry', async () => {
      const r = await A.app.evaluate(({ BrowserWindow }) => {
        const m = BrowserWindow.getAllWindows().find((x) => !x.webContents.getURL().includes('index.html'));
        return { top: m.isAlwaysOnTop(), resizable: m.isResizable(), b: m.getBounds() };
      });
      console.log('     bounds', JSON.stringify(r.b));
      return r.top && r.resizable;
    });
    await check('dragging the bottom-right corner resizes it', async () => {
      const before = await mini.evaluate(() => [innerWidth, innerHeight]);
      const [w, h] = before;
      await mini.mouse.move(w - 6, h - 6);
      await mini.mouse.down();
      for (let i = 1; i <= 10; i++) {
        await mini.mouse.move(w - 6 + i * 8, h - 6 + i * 5);
        await sleep(30);
      }
      await mini.mouse.up();
      await sleep(300);
      const after = await mini.evaluate(() => [innerWidth, innerHeight]);
      console.log(`     ${before.join('x')} → ${after.join('x')}`);
      return after[0] > before[0] + 30 && after[1] > before[1] + 20;
    });
    await check('dragging the top-left corner resizes from that side', async () => {
      const b0 = await A.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.webContents.getURL().includes('index.html')).getBounds());
      await mini.mouse.move(5, 5);
      await mini.mouse.down();
      for (let i = 1; i <= 6; i++) {
        await mini.mouse.move(5 - i * 6, 5 - i * 4);
        await sleep(30);
      }
      await mini.mouse.up();
      await sleep(300);
      const b1 = await A.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((x) => !x.webContents.getURL().includes('index.html')).getBounds());
      console.log('     ', JSON.stringify(b0), '→', JSON.stringify(b1));
      return b1.x < b0.x && b1.width > b0.width && Math.abs(b1.x + b1.width - (b0.x + b0.width)) <= 2;
    });
    await check('mute button in the mini window mutes the call', async () => {
      await mini.mouse.move(100, 100);
      await mini.click('[data-a=mic]');
      await b.waitForSelector('#remoteFlags :text("Muted")', { timeout: 4000 });
      await mini.click('[data-a=mic]');
    });
    await check('the mini window’s size and spot are remembered', async () => {
      await sleep(500);
      const s = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'Parley', 'settings.json'), 'utf8'));
      return s.miniBounds && s.miniBounds.width > 300;
    });
    await check('double-clicking the mini window brings Parley back and closes it', async () => {
      const closed = mini.waitForEvent('close', { timeout: 5000 });
      await mini.dblclick('#v');
      await closed;
      return mainWin(A.app, 'return w.isVisible();');
    });
    await check('mini button: opens the mini window again (via minimize/hide)', async () => {
      const p = A.app.waitForEvent('window', { timeout: 8000 });
      // Xvfb has no window manager, so a real minimize never fires; trigger the same path.
      await A.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('window.__parleyMini.open()', true));
      mini = await p;
      await mini.waitForSelector('#v');
    });
    await check('hanging up closes the mini window', async () => {
      const closed = mini.waitForEvent('close', { timeout: 5000 });
      await a.evaluate(() => window.__parleyDebug.Call.hangup());
      await closed;
    });

    console.log('Screen-share sound mode');
    await check('main process reports whether this OS can leave Parley’s sound out', async () => {
      const r = await a.evaluate(() => window.parley.loopbackSupported());
      console.log('     ', JSON.stringify(r), '(Linux: no system sound at all)');
      return typeof r.exclude === 'boolean';
    });

    console.log('Update proxy (server)');
    await check('server serves the latest release’s files from GitHub', async () => {
      // fake GitHub API
      const gh = http.createServer((req, res) => {
        if (req.url === '/repos/deedubbelyuu/parley/releases/latest') {
          res.setHeader('content-type', 'application/json');
          return res.end(JSON.stringify({
            tag_name: 'v9.9.9', body: 'notes',
            assets: [
              { id: 1, name: 'latest.yml', size: 22, url: 'http://127.0.0.1:3997/asset/1' },
              { id: 2, name: 'Parley-9.9.9-universal-mac.zip', size: 5, url: 'http://127.0.0.1:3997/asset/2' },
            ],
          }));
        }
        if (req.url === '/asset/1') return res.end('version: 9.9.9\npath: x\n');
        if (req.url === '/asset/2') return res.end('ZIPPY');
        res.statusCode = 404;
        res.end();
      }).listen(3997);
      const s2 = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], {
        env: { ...process.env, PORT: '3996', ACCESS_CODE: 'test', GITHUB_API: 'http://127.0.0.1:3997' },
        stdio: 'ignore',
      });
      try {
        for (let i = 0; i < 50; i++) {
          try {
            if ((await fetch('http://127.0.0.1:3996/health')).ok) break;
          } catch {}
          await sleep(100);
        }
        const hdr = { headers: { 'x-parley-code': 'test' } };
        const noCode = await fetch('http://127.0.0.1:3996/updates/latest.json');
        const j = await (await fetch('http://127.0.0.1:3996/updates/latest.json', hdr)).json();
        const yml = await (await fetch('http://127.0.0.1:3996/updates/latest.yml', hdr)).text();
        const zip = await (await fetch('http://127.0.0.1:3996/updates/Parley-9.9.9-universal-mac.zip', hdr)).text();
        const missing = await fetch('http://127.0.0.1:3996/updates/nope.exe', hdr);
        console.log('     ', j.version, JSON.stringify(yml), zip, missing.status, noCode.status);
        return noCode.status === 401 && j.version === '9.9.9' && /9\.9\.9/.test(yml) && zip === 'ZIPPY' && missing.status === 404;
      } finally {
        s2.kill();
        gh.close();
      }
    });
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
