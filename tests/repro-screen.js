const H = require('./harness');
(async () => {
  const srv = await H.startServer();
  const A = await H.launchElectron();
  const B = await H.launchChrome();
  try {
    await H.login(A.page, 'Alice', true);
    await H.login(B.page, 'Bob', false);
    await H.connectCall(A.page, B.page);
    console.log('call connected');
    await A.page.click('#screenBtn');
    await A.page.waitForSelector('#screenPicker:not(.hidden) .source', { timeout: 10000 }).catch(() => console.log('no picker sources'));
    console.log('picker html:', (await A.page.innerHTML('#sourceGrid')).slice(0, 200));
    await A.page.click('#sourceGrid .source').catch((e) => console.log('click fail', e.message));
    await H.sleep(4000);
    console.log('alice screenTrack:', await A.page.evaluate(() => !!window.__parleyDebug.Call.screenTrack));
    console.log('alice toast:', await A.page.textContent('#toast'));
    console.log('bob remote-screen:', await B.page.evaluate(() => document.querySelector('#stage').classList.contains('remote-screen')));
  } finally {
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
  }
})();
