// Built-in stickers: "Pip", Parley's own little blob, drawn as SVG (no image files, nothing borrowed).
// A sticker message only carries its id ("pip-love"), so these cost nothing to send.
(() => {
  const OUT = '#ffffff';
  const INK = '#2b2233';

  // Blob body with a white sticker outline.
  const body = (fill, shade) => `
    <path d="M80 22c30 0 52 20 54 50 2 34-20 62-54 62S24 106 26 72c2-30 24-50 54-50z" fill="${fill}" stroke="${OUT}" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>
    <path d="M44 112c10 14 24 20 36 20 20 0 38-10 46-30-14 14-30 18-46 18-14 0-26-3-36-8z" fill="${shade}" opacity=".45"/>
    <ellipse cx="58" cy="44" rx="14" ry="8" fill="#fff" opacity=".35" transform="rotate(-25 58 44)"/>`;

  const eyes = {
    dots: `<circle cx="62" cy="72" r="6" fill="${INK}"/><circle cx="98" cy="72" r="6" fill="${INK}"/><circle cx="64" cy="70" r="2" fill="#fff"/><circle cx="100" cy="70" r="2" fill="#fff"/>`,
    happy: `<path d="M54 74q8-10 16 0M90 74q8-10 16 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    hearts: `<path d="M62 80l-9-9a5.5 5.5 0 0 1 9-6 5.5 5.5 0 0 1 9 6z" fill="#ff3b6b"/><path d="M98 80l-9-9a5.5 5.5 0 0 1 9-6 5.5 5.5 0 0 1 9 6z" fill="#ff3b6b"/>`,
    stars: `<path d="M62 62l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd23f" stroke="${INK}" stroke-width="2"/><path d="M98 62l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>`,
    closed: `<path d="M54 72q8 6 16 0M90 72q8 6 16 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    big: `<circle cx="62" cy="70" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="98" cy="70" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="63" cy="72" r="5" fill="${INK}"/><circle cx="99" cy="72" r="5" fill="${INK}"/>`,
    sad: `<path d="M54 68l14 4M106 68l-14 4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="62" cy="78" r="5" fill="${INK}"/><circle cx="98" cy="78" r="5" fill="${INK}"/>`,
    angry: `<path d="M52 62l18 8M108 62l-18 8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="63" cy="76" r="5" fill="${INK}"/><circle cx="97" cy="76" r="5" fill="${INK}"/>`,
    wink: `<circle cx="62" cy="72" r="6" fill="${INK}"/><path d="M90 74q8-8 16 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    sleepy: `<path d="M54 76h16M90 76h16" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
  };
  const mouths = {
    smile: `<path d="M68 92q12 12 24 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    grin: `<path d="M64 90q16 22 32 0z" fill="${INK}"/><path d="M70 100q10 6 20 0" fill="#ff7a93"/>`,
    open: `<ellipse cx="80" cy="98" rx="10" ry="12" fill="${INK}"/><ellipse cx="80" cy="104" rx="6" ry="4" fill="#ff7a93"/>`,
    o: `<ellipse cx="80" cy="98" rx="6" ry="7" fill="${INK}"/>`,
    frown: `<path d="M68 100q12-10 24 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    flat: `<path d="M70 96h20" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    tongue: `<path d="M66 90q14 14 28 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 96q-8 0-7 8 1 7 7 7t7-7q1-8-7-8z" fill="#ff7a93"/>`,
    kiss: `<path d="M76 90q8 3 0 7 8 3 0 7" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  };
  const blush = `<ellipse cx="50" cy="88" rx="8" ry="5" fill="#ff7a93" opacity=".55"/><ellipse cx="110" cy="88" rx="8" ry="5" fill="#ff7a93" opacity=".55"/>`;
  const heart = (x, y, s = 1, c = '#ff3b6b') =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 10L-11-1a7 7 0 0 1 11-9 7 7 0 0 1 11 9z" fill="${c}" stroke="${OUT}" stroke-width="3" paint-order="stroke"/>`;
  const tear = (x, y) => `<path d="M${x} ${y}q-6 10 0 14q6-4 0-14z" fill="#5ec8ff" stroke="${OUT}" stroke-width="2" paint-order="stroke"/>`;
  const sparkle = (x, y, s = 1) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0-10L3-3 10 0 3 3 0 10-3 3-10 0-3-3z" fill="#ffd23f" stroke="${OUT}" stroke-width="2" paint-order="stroke"/>`;
  const bubble = (text, x = 112, y = 26, w = 44) =>
    `<g><rect x="${x - w / 2}" y="${y - 14}" width="${w}" height="26" rx="12" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M${x - 10} ${y + 11}l-6 10 14-9" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" font-size="15" fill="${INK}">${text}</text></g>`;
  const hand = (x, y, rot = 0, fill) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="13" ry="11" fill="${fill}" stroke="${OUT}" stroke-width="5" paint-order="stroke"/></g>`;
  const thumb = (x, y, fill) =>
    `<g transform="translate(${x} ${y})"><rect x="-12" y="-6" width="24" height="22" rx="8" fill="${fill}" stroke="${OUT}" stroke-width="5" paint-order="stroke"/><rect x="-6" y="-24" width="11" height="22" rx="5.5" fill="${fill}" stroke="${OUT}" stroke-width="5" paint-order="stroke"/></g>`;

  const C = {
    blue: ['#5aa9ff', '#2d6fd6'],
    pink: ['#ff8fb8', '#e0477e'],
    yellow: ['#ffd45c', '#e09a1a'],
    green: ['#7ee0a0', '#2fa866'],
    purple: ['#b79cff', '#7451e0'],
    orange: ['#ffa463', '#e0632a'],
    red: ['#ff7a6e', '#d63b2f'],
    teal: ['#6fe0dc', '#22a3a0'],
  };

  const make = (color, parts) => {
    const [f, s] = C[color];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${body(f, s)}${parts(f)}</svg>`;
  };

  const LIST = [
    ['pip-hi', 'Hi!', make('blue', (f) => eyes.dots + mouths.smile + blush + hand(132, 70, -20, f) + bubble('hi!', 118, 24, 40))],
    ['pip-love', 'Love', make('pink', () => eyes.hearts + mouths.smile + blush + heart(130, 36, 1.2) + heart(28, 40, 0.8))],
    ['pip-lol', 'LOL', make('yellow', () => eyes.happy + mouths.grin + tear(44, 70) + tear(116, 70) + bubble('LOL', 116, 22, 48))],
    ['pip-yay', 'Yay', make('purple', () => eyes.stars + mouths.open + blush + sparkle(26, 34, 1.2) + sparkle(136, 40) + sparkle(130, 120, 0.8))],
    ['pip-thumbs', 'Thumbs up', make('green', (f) => eyes.wink + mouths.smile + thumb(132, 104, f))],
    ['pip-hug', 'Hug', make('orange', (f) => eyes.closed + mouths.smile + blush + hand(28, 100, 30, f) + hand(132, 100, -30, f) + heart(80, 26, 0.8))],
    ['pip-kiss', 'Kiss', make('pink', () => eyes.wink + mouths.kiss + blush + heart(118, 92, 0.7) + heart(132, 70, 0.5))],
    ['pip-wow', 'Wow', make('teal', () => eyes.big + mouths.o + sparkle(30, 40, 0.9) + sparkle(132, 34, 0.9))],
    ['pip-sad', 'Sad', make('blue', () => eyes.sad + mouths.frown + tear(56, 84))],
    ['pip-cry', 'Crying', make('teal', () => eyes.closed + mouths.open + tear(52, 80) + tear(108, 80) + tear(46, 100) + tear(114, 100))],
    ['pip-grr', 'Grr', make('red', () => eyes.angry + mouths.flat + `<g transform="translate(126 40)" fill="none" stroke-linecap="round"><path d="M-11-4q5 0 5-7M4-11q0 5 7 5M11 4q-5 0-5 7M-4 11q0-5-7-5" stroke="#fff" stroke-width="9"/><path d="M-11-4q5 0 5-7M4-11q0 5 7 5M11 4q-5 0-5 7M-4 11q0-5-7-5" stroke="#c0281d" stroke-width="5"/></g>`)],
    ['pip-sleepy', 'Sleepy', make('purple', () => eyes.sleepy + mouths.o + `<text x="118" y="44" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="${INK}" stroke="#fff" stroke-width="4" paint-order="stroke">z</text><text x="134" y="28" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="${INK}" stroke="#fff" stroke-width="4" paint-order="stroke">z</text>`)],
    ['pip-party', 'Party', make('yellow', () => eyes.happy + mouths.grin + blush + `<g transform="translate(-4 12)"><path d="M62 30L84 0l14 30z" fill="#ff3b6b" stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/><circle cx="84" cy="0" r="6" fill="#ffd23f" stroke="#fff" stroke-width="3" paint-order="stroke"/><path d="M68 22l22-4M74 12l14-2" stroke="#fff" stroke-width="3"/></g>` + sparkle(28, 60, 0.8) + sparkle(138, 70, 0.8))],
    ['pip-tongue', 'Silly', make('orange', () => eyes.wink + mouths.tongue + blush)],
    ['pip-ok', 'OK', make('green', () => eyes.dots + mouths.smile + bubble('OK!', 118, 24, 44))],
    ['pip-miss', 'Miss you', make('blue', () => eyes.sad + mouths.smile + blush + `<g><rect x="78" y="6" width="78" height="26" rx="12" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M96 31l-6 10 14-9" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><text x="117" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="13" fill="${INK}">miss you</text></g>` + heart(30, 40, 0.7))],
    ['pip-gn', 'Good night', make('purple', () => eyes.closed + mouths.smile + `<path d="M128 22a16 16 0 1 0 14 24 13 13 0 1 1-14-24z" fill="#ffd23f" stroke="#fff" stroke-width="3" paint-order="stroke"/>` + sparkle(30, 36, 0.7))],
    ['pip-coffee', 'Coffee?', make('orange', (f) => eyes.dots + mouths.smile + `<g transform="translate(124 104)"><rect x="-16" y="-14" width="28" height="30" rx="6" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M12-6h5a6 6 0 0 1 0 12h-5" fill="none" stroke="${INK}" stroke-width="3"/><path d="M-8-22q4-5 0-10M2-22q4-5 0-10" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/></g>` + hand(104, 116, 0, f))],
  ];

  const url = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  window.PARLEY_STICKERS = LIST.map(([id, name, svg]) => ({ id, name, src: url(svg) }));
})();
