// Takes screenshots of the main UI states into /tmp/shots (for eyeballing design changes).
const fs = require('fs');
const H = require('./harness');
const FX = '/tmp/fx';
(async () => {
  fs.mkdirSync('/tmp/shots', { recursive: true });
  const srv = await H.startServer();
  const A = await H.launchElectron();
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  const shot = (p, name) => p.screenshot({ path: `/tmp/shots/${name}.png` });
  try {
    await a.setViewportSize?.({ width: 1200, height: 760 }).catch(() => {});
    for (const p of [a, b]) await p.evaluate(() => localStorage.setItem('parley:autoHideUi', 'false'));
    await shot(a, '0-login');
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);
    await a.setInputFiles('#avatarFile', `${FX}/photo.png`);
    await H.openContact(b, 'Alice');
    await H.openContact(a, 'Bob');
    const say = async (p, t) => {
      await p.fill('#msgInput', t);
      await p.press('#msgInput', 'Enter');
      await H.sleep(150);
    };
    await say(b, 'hey! are we still on for tonight?');
    await say(b, 'I can bring the snacks 🍿');
    await say(a, 'yes!! 7pm works');
    await say(a, 'I’ll set up the movie');
    await say(b, '😂');
    await a.click('#emojiBtn');
    await a.click('#picker .tab[data-tab=stickers]');
    await a.click('#pickerStickers .sticker-grid button[title="Love"]');
    await a.setInputFiles('#attachFile', `${FX}/photo.png`);
    await H.sleep(1500);
    await b.setInputFiles('#attachFile', `${FX}/doc.bin`);
    await H.sleep(1500);
    await say(a, 'got it, thanks 👍 https://example.com/plan');
    await H.sleep(800);
    await shot(a, '1-chat');
    await shot(b, '2-chat-bob-web');
    await b.click('#typing').catch(() => {});
    await a.click('#emojiBtn');
    await a.click('#picker .tab[data-tab=emoji]');
    await H.sleep(200);
    await shot(a, '3-emoji-picker');
    await a.click('#picker .tab[data-tab=stickers]');
    await H.sleep(200);
    await shot(a, '4-sticker-picker');
    await a.keyboard.press('Escape');
    await a.click('#settingsBtn');
    await H.sleep(900);
    await shot(a, '5-settings-top');
    await a.evaluate(() => document.querySelector('.settings-card').scrollTo(0, 420));
    await H.sleep(200);
    await shot(a, '6-settings-themes');
    for (const t of ['light', 'sunset', 'grape']) {
      await a.click(`#themeGrid .theme[data-theme=${t}]`);
      await a.click('#settingsDone');
      await H.sleep(300);
      await shot(a, `7-theme-${t}`);
      await a.click('#settingsBtn');
      await H.sleep(300);
    }
    await a.click('#themeGrid .theme[data-theme=midnight]');
    await a.click('#settingsDone');
    await H.connectCall(a, b);
    await H.sleep(2500);
    await shot(a, '8-call');
    await a.setInputFiles('#mediaFile', `${FX}/movie.mp4`);
    await b.waitForFunction(() => document.querySelector('#mediaVideo').videoWidth > 0, null, { timeout: 15000 });
    await H.sleep(1500);
    await shot(b, '9-bob-watching');
    const p = A.app.waitForEvent('window');
    await A.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('window.__parleyMini.open()', true));
    const mini = await p;
    await H.sleep(1500);
    await mini.mouse.move(100, 100);
    await H.sleep(200);
    await mini.screenshot({ path: '/tmp/shots/10-mini.png' });
    await a.click('#mediaStopBtn');
    await H.sleep(1500);
    await mini.screenshot({ path: '/tmp/shots/11-mini-cam.png' });
  } catch (e) {
    console.log('screens failed:', e.message);
  } finally {
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
  }
})();
