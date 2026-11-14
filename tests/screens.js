// Takes screenshots of the new UI states into /tmp/shots.
const fs = require('fs');
const H = require('./harness');
(async () => {
  fs.mkdirSync('/tmp/shots', { recursive: true });
  const srv = await H.startServer();
  const A = await H.launchElectron();
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  try {
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);
    await H.connectCall(a, b);
    await a.click('#screenBtn');
    await a.waitForSelector('#screenPicker:not(.hidden) .source');
    await a.click('#sourceGrid .source');
    await a.waitForSelector('#shareBanner:not(.hidden)');
    await H.sleep(1500);
    await a.screenshot({ path: '/tmp/shots/1-sharing.png' });
    await b.screenshot({ path: '/tmp/shots/2-bob-sees-share.png' });
    await a.click('#shareStopBtn');
    await a.setInputFiles('#mediaFile', '/tmp/fx/movie.mp4');
    await b.waitForFunction(() => document.querySelector('#mediaVideo').videoWidth > 0, null, { timeout: 15000 });
    await H.sleep(1500);
    await b.screenshot({ path: '/tmp/shots/3-bob-watching.png' });
    await a.click('.convo-header .sidebar-toggle');
    await H.sleep(300);
    await a.screenshot({ path: '/tmp/shots/4-alice-sidebar-hidden.png' });
    await a.click('.convo-header .sidebar-toggle');
    await a.click('#settingsBtn');
    await H.sleep(1200);
    await a.screenshot({ path: '/tmp/shots/5-settings.png' });
    await a.evaluate(() => document.querySelector('.settings-card').scrollTo(0, 9999));
    await H.sleep(300);
    await a.screenshot({ path: '/tmp/shots/6-settings-bottom.png' });
  } finally {
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
  }
})();
