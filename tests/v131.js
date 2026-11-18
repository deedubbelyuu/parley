// v1.3.1, end to end: Electron app (Alice) ↔ Chrome web version (Bob).
// - reacting never moves the chat (at the bottom, or while reading further up), and the chat
//   keeps following new messages when photos and link cards finish loading
// - Settings lives at the top right (chat header / empty screen), Ctrl+, opens it
// - one status indicator next to your own name (the dot on your picture)
// - Teams-style link cards inside the bubble; long YouTube links shown tidied
// Needs fixtures in /tmp/fx (see tests/README.md).
const fs = require('fs');
const http = require('http');
const H = require('./harness');
const { check, sleep } = H;
const FX = '/tmp/fx';

function startSite(port) {
  const png = fs.readFileSync(`${FX}/photo.png`);
  return http
    .createServer((req, res) => {
      if (req.url.startsWith('/pic.png')) return res.writeHead(200, { 'Content-Type': 'image/png' }), res.end(png);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.url.startsWith('/clip'))
        return res.end('<meta property="og:title" content="Big Buck Bunny — official trailer"><meta property="og:type" content="video.other"><meta property="og:site_name" content="YouTube"><meta property="og:description" content="Blender Foundation"><meta property="og:image" content="/pic.png">');
      res.end('<meta property="og:title" content="Fluffy pancakes"><meta property="og:site_name" content="Breakfast Weekly"><meta property="og:description" content="Rest the batter."><meta property="og:image" content="/pic.png">');
    })
    .listen(port);
}

(async () => {
  const srv = await H.startServer({ PREVIEW_ALLOW_PRIVATE: '1' });
  const site = startSite(3996);
  const A = await H.launchElectron();
  const B = await H.launchChrome();
  const a = A.page;
  const b = B.page;
  const say = async (p, t) => {
    await p.fill('#msgInput', t);
    await p.press('#msgInput', 'Enter');
    await sleep(60);
  };
  // plain DOM clicks: Playwright's own clicks scroll the target into view first, which
  // would hide exactly the jumps we're looking for
  const clickReact = (p, dir, text, emoji) =>
    p.evaluate(([dir, text, emoji]) => {
      const n = [...document.querySelectorAll(`#msgList .msg.${dir}`)].find((x) => x.textContent.includes(text));
      n.querySelector(`.msg-actions .emo[title="React ${emoji}"]`).click();
    }, [dir, text, emoji]);
  const topOf = (text) =>
    a.evaluate((text) => {
      const n = [...document.querySelectorAll('#msgList .msg')].find((x) => x.textContent.includes(text));
      return Math.round(n.getBoundingClientRect().top - document.querySelector('#messages').getBoundingClientRect().top);
    }, text);
  const gap = () => a.evaluate(() => { const m = document.querySelector('#messages'); return Math.round(m.scrollHeight - m.scrollTop - m.clientHeight); });
  const center = (text) =>
    a.evaluate((text) => {
      const n = [...document.querySelectorAll('#msgList .msg')].find((x) => x.textContent.includes(text));
      n.scrollIntoView({ block: 'center' });
    }, text);
  try {
    await H.login(a, 'Alice', true);
    await H.login(b, 'Bob', false);

    console.log('Your own status');
    await check('one status indicator by your name: the dot on your picture, just the word underneath', () =>
      a.evaluate(() => !document.querySelector('#myStatus .sdot') && !!document.querySelector('#myAvatar .dot.online') && document.querySelector('#myStatusText').textContent === 'Online')
    );
    await check('the word still follows your status (Do not disturb)', async () => {
      await a.click('#statusBtn');
      await a.click('#statusMenu button[data-status=dnd]');
      const r = await a.evaluate(() => [document.querySelector('#myStatusText').textContent, !!document.querySelector('#myAvatar .dot.dnd')]);
      await a.click('#statusBtn');
      await a.click('#statusMenu button[data-status=auto]');
      return r[0] === 'Do not disturb' && r[1];
    });

    console.log('Settings on the right');
    await check('no chat open: the gear is at the top right of the window', async () => {
      const box = await a.locator('#emptySettingsBtn').boundingBox();
      const w = await a.evaluate(() => innerWidth);
      return box && box.x > w - 80 && box.y < 40 && (await a.locator('.sidebar #settingsBtn').count()) === 0;
    });
    await check('…and opens Settings', async () => {
      await a.click('#emptySettingsBtn');
      const open = await a.isVisible('#settings .settings-card');
      await a.click('#settingsDone');
      return open;
    });
    await H.openContact(b, 'Alice');
    await H.openContact(a, 'Bob');
    await check('in a chat: the gear is the last thing at the right end of the header', () =>
      a.evaluate(() => {
        const btn = document.querySelector('#settingsBtn');
        const r = btn.getBoundingClientRect();
        const header = document.querySelector('.convo-header').getBoundingClientRect();
        const visible = [...document.querySelectorAll('.convo-header > *')].filter((x) => x.getBoundingClientRect().width > 0);
        return btn.closest('.convo-header') && visible.at(-1) === btn && r.right > header.right - 60;
      })
    );
    await check('Ctrl+, opens Settings', async () => {
      await a.keyboard.press('Control+Comma');
      const open = await a.isVisible('#settings .settings-card');
      await a.click('#settingsDone');
      return open;
    });

    console.log('Link cards (Teams style)');
    await say(a, 'trailer http://localhost:3996/clip');
    await say(b, 'breakfast http://localhost:3996/article');
    await b.waitForSelector('.msg.in .lp .lp-title:has-text("Big Buck Bunny")', { timeout: 10000 });
    await a.waitForSelector('.msg.in .lp .lp-title:has-text("Fluffy pancakes")', { timeout: 10000 });
    await check('the card sits inside the message bubble, under the text', () =>
      b.evaluate(() => !!document.querySelector('.msg.in .bubble > .lp') && !document.querySelector('.msg > .lp'))
    );
    await check('video card: thumbnail with play button on the left; title, channel, site on the right', () =>
      b.evaluate(() => {
        const lp = document.querySelector('.msg.in .lp.video');
        const img = lp.querySelector('.lp-img').getBoundingClientRect();
        const body = lp.querySelector('.lp-body').getBoundingClientRect();
        return (
          !!lp.querySelector('.lp-img .lp-play') &&
          lp.querySelector('.lp-desc').textContent === 'Blender Foundation' &&
          lp.querySelector('.lp-site').textContent === 'YouTube' &&
          img.right <= body.left &&
          Math.abs(img.width / img.height - 16 / 9) < 0.05
        );
      })
    );
    await check('page card: title, description and site name', () =>
      a.evaluate(() => {
        const lp = document.querySelector('.msg.in .lp:not(.video)');
        return lp.querySelector('.lp-title').textContent === 'Fluffy pancakes' && lp.querySelector('.lp-desc').textContent === 'Rest the batter.' && lp.querySelector('.lp-site').textContent === 'Breakfast Weekly';
      })
    );
    const yt = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&si=AbCdEfGhIjKlMnOp&pp=ygUJYnVubnk%3D';
    await say(b, yt);
    await sleep(500);
    await check('long YouTube links read tidy in the bubble; the link itself is unchanged', () =>
      a.evaluate((yt) => {
        const link = [...document.querySelectorAll('.msg.in .bubble a:not(.lp)')].find((x) => x.href.includes('aqz-KE'));
        return link.textContent === 'youtube.com/watch?v=aqz-KE-bpKQ' && link.href === yt && link.title === yt;
      }, yt)
    );
    await check('a narrow chat (beside a call) stacks the card: picture on top', async () => {
      await a.setViewportSize({ width: 760, height: 760 });
      await sleep(300);
      const r = await a.evaluate(() => {
        const lp = document.querySelector('.msg.in .lp');
        const bubble = lp.closest('.bubble').getBoundingClientRect();
        const box = document.querySelector('#messages').getBoundingClientRect();
        return { dir: getComputedStyle(lp).flexDirection, inside: bubble.left >= box.left && bubble.right <= box.right };
      });
      await a.setViewportSize({ width: 1280, height: 800 });
      await sleep(300);
      return r.dir === 'column' && r.inside;
    });

    console.log('Reactions don’t move the chat');
    for (let i = 0; i < 24; i++) await say(b, `message number ${i}`);
    await b.setInputFiles('#attachFile', `${FX}/photo.png`);
    await b.click('#sendBtn');
    await sleep(1500);
    await say(b, 'last one http://localhost:3996/clip?x=2');
    await sleep(2500);
    await check('the chat follows new messages to the bottom even as photos and cards load', async () => (await gap()) < 2);
    await check('reacting to the link card at the bottom keeps you at the bottom', async () => {
      await clickReact(a, 'in', 'last one', '👍');
      await sleep(1000);
      const g1 = await gap();
      await clickReact(a, 'in', 'last one', '❤️');
      await sleep(400);
      await clickReact(a, 'in', 'last one', '👍');
      await sleep(1000);
      const g2 = await gap();
      console.log('      px from bottom:', g1, g2);
      return g1 < 2 && g2 < 2;
    });
    await check('reacting rebuilds nothing: same message element, same card', async () => {
      const before = await a.evaluate(() => {
        const n = [...document.querySelectorAll('#msgList .msg.in')].find((x) => x.textContent.includes('last one'));
        window.__rxNode = n;
        window.__rxCard = n.querySelector('.lp');
        return !!n;
      });
      await clickReact(a, 'in', 'last one', '😂');
      await sleep(300);
      return before && a.evaluate(() => {
        const n = [...document.querySelectorAll('#msgList .msg.in')].find((x) => x.textContent.includes('last one'));
        return n === window.__rxNode && n.querySelector('.lp') === window.__rxCard && /😂/.test(n.querySelector('.reactions').textContent);
      });
    });
    for (const [label, text] of [['in the middle', 'message number 12'], ['near the top', 'message number 2'], ['on a photo', '']]) {
      await check(`reading further up, reacting ${label} doesn’t move anything`, async () => {
        if (text) await center(text);
        else
          await a.evaluate(() => {
            document.querySelector('#msgList .msg.in .photo').closest('.msg').scrollIntoView({ block: 'center' });
            document.querySelector('#messages').scrollTop -= 120; // well clear of the bottom
          });
        await sleep(300);
        console.log('      px from bottom before reacting:', await gap());
        const sel = text || null;
        const pos = () => (sel ? topOf(sel) : a.evaluate(() => Math.round(document.querySelector('#msgList .msg.in .photo').getBoundingClientRect().top)));
        const t0 = await pos();
        if (sel) await clickReact(a, 'in', sel, '👍');
        else await a.evaluate(() => document.querySelector('#msgList .msg.in .photo').closest('.msg').querySelector('.msg-actions .emo[title="React 👍"]').click());
        await sleep(800);
        const t1 = await pos();
        return Math.abs(t1 - t0) <= 1 || Promise.reject(new Error(`moved ${t1 - t0}px`));
      });
    }
    await check('your friend reacting to something above (off screen) doesn’t move what you’re reading', async () => {
      await center('message number 18');
      await a.evaluate(() => { document.querySelector('#messages').scrollTop -= 100; });
      await sleep(300);
      const t0 = await topOf('message number 18');
      await clickReact(b, 'out', 'message number 3', '😂');
      await clickReact(b, 'out', 'message number 1', '❤️'); // both above what Alice can see
      await sleep(1200);
      const t1 = await topOf('message number 18');
      return Math.abs(t1 - t0) <= 1 || Promise.reject(new Error(`moved ${t1 - t0}px`));
    });
    await check('…and new messages then show the “New messages” pill instead of yanking you down', async () => {
      const t0 = await topOf('message number 18');
      await say(b, 'are you there?');
      await sleep(800);
      const t1 = await topOf('message number 18');
      return Math.abs(t1 - t0) <= 1 && (await a.isVisible('#jumpBtn'));
    });
  } catch (e) {
    console.log('v131 test crashed:', e.message);
    H.fail();
  } finally {
    await A.app.close().catch(() => {});
    await B.browser.close().catch(() => {});
    srv.kill();
    site.close();
    process.exit(H.summary() ? 1 : 0);
  }
})();
