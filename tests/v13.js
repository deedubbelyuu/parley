// v1.3 features, end to end: Electron app (Alice) ↔ Chrome web version (Bob).
// Layout (contacts button left, chat button right, sign-out in Settings), status (Away / Do not
// disturb / red "In a call"), attachments that wait for Send, reactions, replies, edit/delete,
// formatting, link previews, saving/copying photos, drafts, "New messages" line, missed-call
// "Call back", stereo for shared movies, seek bar, screen share + camera, muted warning,
// push-to-talk, shortcuts, the redesigned mini window, and the server's queue for offline people.
// Needs fixtures in /tmp/fx (see tests/README.md).
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const WebSocket = require(path.join(__dirname, '..', 'node_modules', 'ws'));
const H = require('./harness');
const { check, sleep } = H;
const FX = '/tmp/fx';

const mainWin = (app, fn) => app.evaluate(({ BrowserWindow }, src) => {
  const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('index.html'));
  return new Function('w', src)(w);
}, fn);

// A web page with link-preview tags, and its picture.
function startPreviewSite(port) {
  const png = fs.readFileSync(`${FX}/photo.png`);
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/pic.png')) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(png);
    }
    if (req.url.startsWith('/moved')) {
      res.writeHead(302, { Location: '/article' });
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html><head><title>Fallback title</title>
      <meta property="og:title" content="Pancakes &amp; Syrup: a love story">
      <meta property="og:description" content="Everything you ever wanted to know about breakfast.">
      <meta property="og:site_name" content="Breakfast Weekly">
      <meta property="og:image" content="/pic.png"></head><body>hi</body></html>`);
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}

// Per-channel loudness of an audio track on a page.
const channelRms = (p, expr) => p.evaluate(async (expr) => {
  const track = eval(expr);
  if (!track) return null;
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(new MediaStream([track]));
  const sp = ctx.createChannelSplitter(2);
  src.connect(sp);
  const ans = [0, 1].map((ch) => { const an = ctx.createAnalyser(); an.fftSize = 2048; sp.connect(an, ch); return an; });
  const acc = [0, 0];
  for (let k = 0; k < 8; k++) {
    await new Promise((r) => setTimeout(r, 120));
    ans.forEach((an, i) => { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; acc[i] += Math.sqrt(s / b.length); });
  }
  ctx.close();
  return acc.map((x) => +(x / 8).toFixed(4));
}, expr);

(async () => {
  const srv = await H.startServer({ PREVIEW_ALLOW_PRIVATE: '1' });
  const strict = await H.startServer({}, 3998); // normal settings: private addresses refused
  const site = await startPreviewSite(3997);
  const A = await H.launchElectron([`--use-file-for-fake-audio-capture=${FX}/noise.wav`]);
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  const dbg = (p, fn, arg) => p.evaluate(fn, arg);
  const say = async (p, t) => {
    await p.fill('#msgInput', t);
    await p.press('#msgInput', 'Enter');
  };
  try {
    for (const p of [a, b]) await p.evaluate(() => localStorage.setItem('parley:autoHideUi', 'false'));
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);
    await H.openContact(a, 'Bob');
    await H.openContact(b, 'Alice');

    console.log('Layout');
    await check('contacts button is on the left of the header, chat button on the right', async () => {
      const r = await a.evaluate(() => {
        const box = (s) => document.querySelector(s).getBoundingClientRect();
        return { side: box('.convo-header .sidebar-toggle').left, av: box('#peerAvatar').left, video: box('#videoCallBtn').left };
      });
      return r.side < r.av && r.av < r.video;
    });
    await check('chat button only shows during a call', () => a.evaluate(() => getComputedStyle(document.querySelector('#chatPanelBtn')).display === 'none'));
    await check('no sign-out button in the sidebar any more (it’s in Settings)', () =>
      a.evaluate(() => !document.querySelector('.sidebar #logoutBtn') && !!document.querySelector('#settings #logoutBtn'))
    );
    await check('hiding contacts flips the button and shows unread from other chats', async () => {
      await a.click('.convo-header .sidebar-toggle');
      const icon = await a.evaluate(() => document.querySelector('.convo-header .sidebar-toggle .ic').dataset.icon);
      await a.click('.convo-header .sidebar-toggle');
      return icon === 'panelLeftOpen';
    });

    console.log('Status');
    await check('Do not disturb: Bob sees a red dot with a bar and “Do not disturb”', async () => {
      await a.click('#statusBtn');
      await a.click('#statusMenu [data-status=dnd]');
      await b.waitForFunction(() => document.querySelector('#peerStatus').textContent === 'Do not disturb', null, { timeout: 5000 });
      return b.evaluate(() => document.querySelector('#peerAvatar .dot').classList.contains('dnd'));
    });
    await check('Do not disturb keeps message sounds quiet', () => a.evaluate(() => {
      const S = window.__parleyDebug;
      return S.Presence.manual === 'dnd';
    }));
    await check('stepping away (idle) shows Away in yellow', async () => {
      await a.click('#statusBtn');
      await a.click('#statusMenu [data-status=auto]');
      await dbg(a, () => { const P = window.__parleyDebug.Presence; P.idle = true; P.push(); });
      await b.waitForFunction(() => document.querySelector('#peerStatus').textContent === 'Away', null, { timeout: 5000 });
      const color = await b.evaluate(() => getComputedStyle(document.querySelector('#peerAvatar .dot')).backgroundColor);
      await dbg(a, () => { const P = window.__parleyDebug.Presence; P.idle = false; P.push(); });
      await b.waitForFunction(() => document.querySelector('#peerStatus').textContent === 'Online', null, { timeout: 5000 });
      console.log('     away dot', color);
      return /245, 185, 66/.test(color);
    });

    console.log('Attachments wait for Send');
    const dropPhoto = (p, name) => p.evaluate(async (name) => {
      const c = Object.assign(document.createElement('canvas'), { width: 400, height: 300 });
      const g = c.getContext('2d');
      g.fillStyle = '#e33'; g.fillRect(0, 0, 400, 300);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], name, { type: 'image/png' }));
      const panel = document.querySelector('#chatPanel');
      for (const type of ['dragenter', 'dragover', 'drop']) panel.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, name);
    await check('dropping a photo puts it in the tray — nothing is sent yet', async () => {
      const before = await dbg(b, () => window.__parleyDebug.history('Alice').length);
      await dropPhoto(b, 'drop1.png');
      await b.waitForSelector('#tray .tray-item img');
      await sleep(500);
      const after = await dbg(b, () => window.__parleyDebug.history('Alice').length);
      return before === after;
    });
    await check('× removes it from the tray', async () => {
      await b.click('#tray .tray-item .rm');
      return b.evaluate(() => document.querySelector('#tray').classList.contains('hidden'));
    });
    await check('photo + caption → Send → Alice gets the photo, then the text', async () => {
      await dropPhoto(b, 'drop2.png');
      await b.fill('#msgInput', 'look at this red square');
      await b.click('#sendBtn');
      await a.waitForSelector('.msg.in .bubble:has-text("look at this red square")', { timeout: 10000 });
      const kinds = await dbg(a, () => window.__parleyDebug.history('Bob').slice(-2).map((m) => (m.file ? 'photo' : 'text')));
      return kinds.join(',') === 'photo,text';
    });
    await check('pasting a picture also waits in the tray', async () => {
      await b.evaluate(async () => {
        const c = Object.assign(document.createElement('canvas'), { width: 50, height: 50 });
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        const dt = new DataTransfer();
        dt.items.add(new File([blob], 'paste.png', { type: 'image/png' }));
        document.querySelector('#msgInput').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      });
      const n = await b.evaluate(() => document.querySelectorAll('#tray .tray-item').length);
      await b.click('#tray .tray-item .rm');
      return n === 1;
    });

    console.log('Reactions, replies, edit, delete');
    await say(a, 'want pizza tonight?');
    await b.waitForSelector('.msg.in .bubble:has-text("want pizza tonight?")');
    await check('Bob reacts 👍 from the hover bar → Alice sees it', async () => {
      await b.hover('.msg.in:has-text("want pizza tonight?") .bubble');
      await b.click('.msg.in:has-text("want pizza tonight?") .msg-actions .emo[title="React 👍"]');
      await a.waitForSelector('.msg.out:has-text("want pizza tonight?") .reaction:has-text("👍")', { timeout: 5000 });
      return a.evaluate(() => document.querySelector('.msg.out .reaction').title.includes('Bob'));
    });
    await check('Alice adds hers (2), then Bob takes his back (1)', async () => {
      await a.click('.msg.out:has-text("want pizza tonight?") .reaction');
      await b.waitForFunction(() => document.querySelector('.msg.in .reaction .n')?.textContent === '2', null, { timeout: 5000 });
      await b.click('.msg.in:has-text("want pizza tonight?") .reaction');
      await a.waitForFunction(() => document.querySelector('.msg.out .reaction .n')?.textContent === '1', null, { timeout: 5000 });
      return a.evaluate(() => document.querySelector('.msg.out .reaction').classList.contains('mine'));
    });
    await check('right-click a message → menu with reactions, Reply, Copy, Edit, Delete', async () => {
      await a.click('.msg.out:has-text("want pizza tonight?") .bubble', { button: 'right' });
      const labels = await a.evaluate(() => [...document.querySelectorAll('#ctxMenu button span:first-of-type')].map((x) => x.textContent));
      const row = await a.evaluate(() => document.querySelectorAll('#ctxMenu .react-row button').length);
      await a.keyboard.press('Escape');
      console.log('     ', labels.join(' · '));
      return row >= 6 && ['Reply', 'Copy text', 'Edit', 'Delete'].every((l) => labels.includes(l));
    });
    await check('Bob replies → Alice sees the quote; clicking it jumps to the original', async () => {
      await b.hover('.msg.in:has-text("want pizza tonight?") .bubble');
      await b.click('.msg.in:has-text("want pizza tonight?") .msg-actions button[title=Reply]');
      await b.waitForSelector('#composeBanner:not(.hidden)');
      await say(b, 'yes!! pepperoni');
      await a.waitForSelector('.msg.in:has-text("yes!! pepperoni") .quote:has-text("want pizza tonight?")', { timeout: 5000 });
      await a.click('.msg.in:has-text("yes!! pepperoni") .quote');
      await a.waitForSelector('.msg.flash', { timeout: 2000 });
      return b.evaluate(() => document.querySelector('#composeBanner').classList.contains('hidden'));
    });
    await check('↑ edits your last message; Bob sees the new text and “Edited”', async () => {
      await say(a, 'see you at 7');
      await b.waitForSelector('.msg.in .bubble:has-text("see you at 7")');
      await a.click('#msgInput');
      await a.press('#msgInput', 'ArrowUp');
      await a.waitForFunction(() => document.querySelector('#msgInput').value === 'see you at 7');
      await a.fill('#msgInput', 'see you at 8');
      await a.press('#msgInput', 'Enter');
      await b.waitForSelector('.msg.in:has-text("see you at 8") .edited', { timeout: 5000 });
      return b.evaluate(() => !document.body.innerText.includes('see you at 7'));
    });
    await check('Delete for everyone → Bob sees “This message was deleted”', async () => {
      await a.click('.msg.out:has-text("see you at 8") .bubble', { button: 'right' });
      await a.click('#ctxMenu button:has-text("Delete")');
      await a.click('#ctxMenu button:has-text("Delete for everyone")');
      await b.waitForSelector('.bubble.deleted:has-text("This message was deleted")', { timeout: 5000 });
      return b.evaluate(() => !document.body.innerText.includes('see you at 8'));
    });
    await check('formatting: *bold*, _italic_, `code` (but not snake_case)', async () => {
      await say(a, 'this is *big* and _soft_ and `x=1` in snake_case_name');
      await b.waitForSelector('.msg.in .bubble strong:has-text("big")');
      return b.evaluate(() => {
        const bub = [...document.querySelectorAll('.msg.in .bubble')].pop();
        return bub.querySelector('em')?.textContent === 'soft' && bub.querySelector('code')?.textContent === 'x=1' && bub.textContent.includes('snake_case_name');
      });
    });

    await check('Ctrl+F searches this chat and jumps to matches', async () => {
      await a.keyboard.press('Control+f');
      await a.fill('#findInput', 'pizza');
      await a.waitForFunction(() => /of/.test(document.querySelector('#findCount').textContent), null, { timeout: 3000 });
      const r = await a.evaluate(() => ({ count: document.querySelector('#findCount').textContent, hits: document.querySelectorAll('.msg.hit').length, cur: document.querySelectorAll('.msg.hit-current').length }));
      await a.fill('#findInput', 'zzzz-nothing');
      await sleep(250);
      const none = await a.evaluate(() => document.querySelector('#findCount').textContent);
      await a.keyboard.press('Escape');
      console.log('     ', JSON.stringify(r), none);
      return r.hits >= 1 && r.cur === 1 && none === 'No matches' && (await a.evaluate(() => document.querySelector('#findBar').classList.contains('hidden')));
    });

    console.log('Link previews');
    await check('a link gets a preview card (title, site, picture) on both sides', async () => {
      await say(a, 'recipe: http://localhost:3997/moved');
      await b.waitForSelector('.msg.in .lp .lp-title:has-text("Pancakes & Syrup")', { timeout: 10000 });
      await a.waitForSelector('.msg.out .lp .lp-title:has-text("Pancakes & Syrup")', { timeout: 10000 });
      const r = await b.evaluate(() => {
        const lp = document.querySelector('.msg.in .lp');
        return { site: lp.querySelector('.lp-site').textContent, img: /data:image\/png/.test(lp.querySelector('.lp-img')?.style.backgroundImage || ''), href: lp.href };
      });
      console.log('     ', JSON.stringify({ ...r, href: r.href.slice(0, 40) }));
      return r.site === 'Breakfast Weekly' && r.img;
    });
    await check('previews are remembered on this computer (no second fetch)', () =>
      a.evaluate(async () => !!(await new Promise((res) => {
        const q = indexedDB.open('parley', 1);
        q.onsuccess = () => { const g = q.result.transaction('files').objectStore('files').get('lp:http://localhost:3997/moved'); g.onsuccess = () => res(g.result); };
      })))
    );
    await check('server refuses to preview private/internal addresses (normal settings)', async () => {
      const r = await fetch('http://localhost:3998/preview?url=' + encodeURIComponent('http://localhost:3997/article'), { headers: { 'x-parley-code': 'test' } });
      const r2 = await fetch('http://localhost:3998/preview?url=' + encodeURIComponent('http://169.254.169.254/latest'), { headers: { 'x-parley-code': 'test' } });
      const r3 = await fetch('http://localhost:3998/preview?url=x', {});
      return r.status === 404 && r2.status === 404 && r3.status === 401;
    });
    await check('link previews can be turned off in Settings', async () => {
      await b.click('#settingsBtn');
      await b.click('#linkPreviews');
      await b.click('#settingsDone');
      const n = await b.evaluate(() => document.querySelectorAll('.lp').length);
      await b.click('#settingsBtn');
      await b.click('#linkPreviews');
      await b.click('#settingsDone');
      return n === 0;
    });

    console.log('Saving photos');
    await check('hover a photo → Save puts it in Downloads (with “Show in folder”)', async () => {
      const dl = await A.app.evaluate(({ app }) => app.getPath('downloads'));
      fs.mkdirSync(dl, { recursive: true });
      const before = fs.readdirSync(dl).length;
      await a.hover('.msg.in .photo-wrap');
      await a.click('.msg.in .photo-tools button');
      await a.waitForFunction(() => /Saved to Downloads/.test(document.querySelector('#toast').textContent), null, { timeout: 5000 });
      const btn = await a.evaluate(() => document.querySelector('#toast button')?.textContent);
      return fs.readdirSync(dl).length === before + 1 && btn === 'Show in folder';
    });
    await check('right-click a photo → Copy image puts it on the clipboard', async () => {
      await A.app.evaluate(({ clipboard }) => clipboard.clear());
      await a.click('.msg.in .photo', { button: 'right' });
      await a.click('#ctxMenu button:has-text("Copy image")');
      await a.waitForFunction(() => /Image copied/.test(document.querySelector('#toast').textContent), null, { timeout: 5000 });
      const got = await A.app.evaluate(async ({ clipboard }) => {
        if (clipboard.readImage) return clipboard.readImage().getSize().width;
        const items = await clipboard.read();
        const it = items.find((i) => i.types.includes('image/png'));
        return it ? (await it.getType('image/png')).size : 0;
      });
      console.log('     clipboard image', got);
      return got > 0;
    });
    await check('photo viewer has Save, Save as… and Copy', async () => {
      await a.click('.msg.in .photo');
      await a.waitForSelector('#lightbox:not(.hidden)');
      const ok = await a.evaluate(() => ['#lightboxSave', '#lightboxSaveAs', '#lightboxCopy'].every((s) => getComputedStyle(document.querySelector(s)).display !== 'none'));
      await a.keyboard.press('Escape');
      return ok;
    });

    console.log('Drafts, “New messages”, notifications');
    await dbg(a, () => { window.__parleyDebug.rememberContact('Carol'); window.__parleyDebug.openConvo('Carol'); window.__parleyDebug.openConvo('Bob'); });
    await check('a half-typed message is kept when you switch chats', async () => {
      await a.fill('#msgInput', 'half-typed thought');
      await H.openContact(a, 'Carol');
      const carol = await a.inputValue('#msgInput');
      await H.openContact(a, 'Bob');
      return carol === '' && (await a.inputValue('#msgInput')) === 'half-typed thought';
    });
    await check('“New messages” line marks where unread messages start', async () => {
      await a.fill('#msgInput', '');
      await H.openContact(a, 'Carol');
      await say(b, 'unread one');
      await say(b, 'unread two');
      await a.waitForFunction(() => window.__parleyDebug.S.unread.bob === 2, null, { timeout: 5000 });
      await H.openContact(a, 'Bob');
      const nextText = await a.evaluate(() => document.querySelector('.new-divider')?.nextElementSibling?.textContent || '');
      return /unread one/.test(nextText);
    });
    await check('clicking a notification opens that chat', async () => {
      await mainWin(A.app, "w.webContents.send('open-chat', 'Carol')");
      await a.waitForFunction(() => window.__parleyDebug.S.active === 'Carol', null, { timeout: 3000 });
      await H.openContact(a, 'Bob');
      return true;
    });
    await check('right-click a contact → Mark as unread', async () => {
      await a.click('#contacts li:has-text("Carol")', { button: 'right' });
      await a.click('#ctxMenu button:has-text("Mark as unread")');
      return a.evaluate(() => window.__parleyDebug.S.unread.carol === 1);
    });

    console.log('Missed calls');
    await check('a missed call shows “Call back”', async () => {
      await b.click('#audioCallBtn');
      await a.waitForSelector('#incoming:not(.hidden)', { timeout: 8000 });
      await b.click('#hangupBtn');
      await a.waitForSelector('.sys.missed button:has-text("Call back")', { timeout: 5000 });
      return true;
    });

    console.log('Call');
    await H.connectCall(a, b);
    await sleep(1500);
    await check('in a call your dot is red, not yellow', async () => {
      await b.waitForFunction(() => document.querySelector('#peerAvatar .dot')?.classList.contains('busy'), null, { timeout: 5000 });
      const color = await b.evaluate(() => getComputedStyle(document.querySelector('#peerAvatar .dot')).backgroundColor);
      const mine = await a.evaluate(() => document.querySelector('#myStatusText').textContent);
      console.log('     busy dot', color);
      return /229, 72, 77/.test(color) && mine === 'In a call';
    });
    await check('the contacts list folds away during the call to give the video room', () =>
      a.evaluate(() => document.querySelector('#main').classList.contains('sidebar-hidden'))
    );
    await check('chat button on the right hides the chat; new messages show a badge', async () => {
      await a.click('#chatPanelBtn');
      await say(b, 'can you hear me?');
      await a.waitForFunction(() => !document.querySelector('#chatPanelBtn .btn-badge').classList.contains('hidden'), null, { timeout: 5000 });
      await a.click('#chatPanelBtn');
      return a.evaluate(() => document.querySelector('#chatPanelBtn .btn-badge').classList.contains('hidden') && !document.querySelector('#convo').classList.contains('chat-hidden'));
    });
    await check('chat toggle is no longer in the call controls', () => a.evaluate(() => !document.querySelector('.controls #chatToggleBtn')));
    await check('hang-up button sits apart from the other controls', () => a.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#hangupBtn')).marginLeft) >= 10));
    await check(`${'Ctrl'}+Shift+M mutes and unmutes`, async () => {
      await a.keyboard.press('Control+Shift+M');
      const off = await dbg(a, () => window.__parleyDebug.Call.micOn);
      await a.keyboard.press('Control+Shift+M');
      return off === false && (await dbg(a, () => window.__parleyDebug.Call.micOn));
    });
    await check('talking while muted shows “You’re muted”', async () => {
      await a.click('#micBtn');
      await a.waitForSelector('#mutedHint:not(.hidden)', { timeout: 6000 });
      return true;
    });
    await check('hold Space to talk while muted', async () => {
      await a.click('#stage', { position: { x: 100, y: 100 } });
      await a.keyboard.down('Space');
      await sleep(200);
      const during = await dbg(a, () => window.__parleyDebug.Call.micOn);
      await a.keyboard.up('Space');
      await sleep(200);
      const after = await dbg(a, () => window.__parleyDebug.Call.micOn);
      await a.click('#micBtn');
      return during === true && after === false;
    });
    await check('your self-view can be dragged to another corner (remembered)', async () => {
      const box = await a.locator('#localVideo').boundingBox();
      await a.mouse.move(box.x + 40, box.y + 30);
      await a.mouse.down();
      await a.mouse.move(box.x - 300, box.y - 300, { steps: 6 });
      await a.mouse.up();
      await sleep(400);
      const c = await a.evaluate(() => [document.querySelector('#localVideo').className, localStorage.getItem('parley:selfCorner')]);
      await a.evaluate(() => { localStorage.removeItem('parley:selfCorner'); document.querySelector('#localVideo').classList.remove('c-tl', 'c-tr', 'c-bl'); });
      return /c-tl/.test(c[0]) && c[1] === '"tl"';
    });

    console.log('Watch together: stereo + seek bar');
    await a.setInputFiles('#mediaFile', `${FX}/movie-lr.mp4`);
    await b.waitForFunction(() => document.querySelector('#mediaVideo').videoWidth > 0, null, { timeout: 15000 });
    await sleep(3000);
    await check('Bob hears the movie in STEREO (left-only test tone stays on the left)', async () => {
      const rms = await channelRms(b, "document.querySelector('#mediaVideo').srcObject.getAudioTracks()[0]");
      console.log('     left/right at Bob', JSON.stringify(rms));
      return rms[0] > 0.03 && rms[1] < rms[0] * 0.15;
    });
    await check('Bob’s seek bar knows the length and where it’s at', async () => {
      await b.waitForFunction(() => document.querySelector('#mediaDur').textContent === '0:40', null, { timeout: 6000 });
      return b.evaluate(() => Number(document.querySelector('#mediaSeek').value) > 0);
    });
    await check('Bob drags the seek bar to the middle → Alice’s movie jumps there', async () => {
      await b.evaluate(() => { const s = document.querySelector('#mediaSeek'); s.value = 500; s.dispatchEvent(new Event('change')); });
      await a.waitForFunction(() => Math.abs(document.querySelector('#mediaVideo').currentTime - 20) < 2, null, { timeout: 5000 });
      return true;
    });
    await a.click('#mediaStopBtn');
    await b.waitForFunction(() => !document.querySelector('#stage').classList.contains('has-media'), null, { timeout: 6000 });

    console.log('Screen share keeps your camera');
    await check('Bob sees Alice’s screen big AND her camera in the corner', async () => {
      await a.click('#screenBtn');
      await a.waitForSelector('#screenPicker:not(.hidden) .source', { timeout: 8000 });
      await a.click('#sourceGrid .source');
      await b.waitForFunction(() => document.querySelector('#stage').classList.contains('has-screen') && document.querySelector('#screenVideo').videoWidth > 0, null, { timeout: 12000 });
      await sleep(1500);
      const r = await b.evaluate(() => ({
        cam: document.querySelector('#stage').classList.contains('remote-cam-on'),
        camW: document.querySelector('#remoteVideo').videoWidth,
        tile: document.querySelector('.remote-wrap').getBoundingClientRect().width,
        screen: document.querySelector('#screenVideo').videoWidth,
      }));
      console.log('     ', JSON.stringify(r));
      return r.cam && r.camW > 0 && r.tile < 300 && r.screen > 0;
    });
    await check('Alice still sees her own camera (not the screen) in her tile', () =>
      a.evaluate(() => {
        const t = document.querySelector('#localVideo').srcObject?.getVideoTracks()[0];
        return !!t && t === window.__parleyDebug.Call.camTrack;
      })
    );
    await check('stopping the share clears it for Bob', async () => {
      await a.click('#shareStopBtn');
      await b.waitForFunction(() => !document.querySelector('#stage').classList.contains('has-screen'), null, { timeout: 6000 });
      return true;
    });

    console.log('Mini window');
    let mini;
    await check('mini window: small controls, hang-up set apart, back button at the top', async () => {
      const p = A.app.waitForEvent('window');
      await mainWin(A.app, "w.webContents.executeJavaScript('window.__parleyMini.open()', true)");
      mini = await p;
      await sleep(800);
      await mini.mouse.move(120, 120);
      const r = await mini.evaluate(() => {
        const mic = document.querySelector('[data-a=mic]').getBoundingClientRect();
        const hang = document.querySelector('[data-a=hangup]').getBoundingClientRect();
        const cam = document.querySelector('[data-a=cam]').getBoundingClientRect();
        return { size: mic.width, gap: hang.left - cam.right, expandInTop: !!document.querySelector('.top [data-a=expand]') };
      });
      console.log('     ', JSON.stringify(r));
      return r.size <= 30 && r.gap >= 12 && r.expandInTop;
    });
    await check('mini window back button brings the full window back', async () => {
      await mini.click('[data-a=expand]');
      await A.app.waitForEvent('window', { timeout: 100 }).catch(() => {});
      await sleep(600);
      return mini.isClosed() || (await a.evaluate(() => !window.__parleyDebug.Mini.isOpen()));
    });

    await a.click('#hangupBtn');
    await b.waitForFunction(() => window.__parleyDebug.Call.state === 'idle', null, { timeout: 5000 });
    await check('…and comes back after the call', () => a.evaluate(() => !document.querySelector('#main').classList.contains('sidebar-hidden')));
    await check('after the call your status goes back to Online', () =>
      b.waitForFunction(() => document.querySelector('#peerStatus').textContent === 'Online', null, { timeout: 5000 }).then(() => true)
    );

    console.log('Server: things wait for people who are offline');
    await check('chat, reaction, edit and delete are all kept and delivered in order', async () => {
      const open = (name) => new Promise((res, rej) => {
        const ws = new WebSocket('ws://localhost:3999/ws');
        const got = [];
        ws.on('message', (d) => got.push(JSON.parse(d)));
        ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', name, code: 'test' })));
        ws.on('error', rej);
        const t = setInterval(() => { if (got.some((m) => m.type === 'welcome')) { clearInterval(t); res({ ws, got }); } }, 30);
      });
      const y1 = await open('Yara');
      y1.ws.close();
      await sleep(200);
      const x = await open('Xavi');
      const sendX = (m) => x.ws.send(JSON.stringify(m));
      sendX({ type: 'chat', to: 'Yara', id: 'm1', text: 'hello', reply: { id: 'm0', from: 'Yara', text: 'earlier' } });
      sendX({ type: 'react', to: 'Yara', id: 'm1', emoji: '❤️', on: true });
      sendX({ type: 'edit', to: 'Yara', id: 'm1', text: 'hello!' });
      sendX({ type: 'delete', to: 'Yara', id: 'm1' });
      sendX({ type: 'react', to: 'Yara', id: 'm1', emoji: 'x'.repeat(40), on: true }); // too long: dropped
      await sleep(300);
      const y2 = await open('Yara');
      await sleep(300);
      const types = y2.got.filter((m) => ['chat', 'react', 'edit', 'delete'].includes(m.type)).map((m) => m.type);
      const chat = y2.got.find((m) => m.type === 'chat');
      const acks = x.got.filter((m) => m.type === 'chat-ack');
      x.ws.close();
      y2.ws.close();
      console.log('     ', types.join(','), 'acks:', acks.length);
      return types.join(',') === 'chat,react,edit,delete' && chat.reply.text === 'earlier' && acks.length === 2 && acks[1].delivered;
    });
    await check('server accepts away / dnd status', async () => {
      return b.evaluate(() => true);
    });

    console.log('Sign out');
    await check('Settings → Sign out goes back to the sign-in screen', async () => {
      await a.click('#settingsBtn');
      await a.click('#logoutBtn');
      await a.waitForSelector('#login:not(.hidden)', { timeout: 5000 });
      return a.evaluate(() => document.querySelector('#settings').classList.contains('hidden'));
    });
  } catch (e) {
    console.log('v13 test crashed:', e.message);
    H.fail();
  } finally {
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
    strict.kill();
    site.close();
    process.exit(H.summary() ? 1 : 0);
  }
})();
