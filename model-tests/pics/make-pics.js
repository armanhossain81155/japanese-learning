// Generates the listening pictures (SVG) and attaches them to the test questions.
// Run after editing drawings or the ATTACH list:  node model-tests/pics/make-pics.js
// Pictures are simple flat drawings made in code: free to use, sharp at any size.
// To use your own artwork instead, replace a file in model-tests/images/ with the same name.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'images');
const INK = '#2b2b2b';
const st = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const frame = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#fff" stroke="#d8d2c8" stroke-width="2"/>${body}</svg>`;
const g = (x, y, s, body) => `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
const text = (x, y, t, size = 16, fill = INK) =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-weight="700" font-size="${size}" text-anchor="middle" fill="${fill}">${t}</text>`;

// ---------- People ----------
// Drawn with the feet at (0,0); about 90 units tall.
function person({ shirt = '#7aa6d6', hair = '#3a2e2a', pose = 'down', skirt = false, glasses = false, apron = false, older = false, mask = false, cheeks = false, bag = false } = {}) {
  const arms = {
    down: 'M-13 -54 L-20 -30 M13 -54 L20 -30',
    together: 'M-13 -52 L-3 -62 M13 -52 L3 -62',
    wave: 'M-13 -54 L-20 -30 M13 -54 L28 -82',
    point: 'M-13 -54 L-20 -30 M13 -52 L34 -58',
    give: 'M-13 -52 L-30 -56 M13 -54 L20 -30',
    giveBoth: 'M-13 -52 L-30 -52 M13 -52 L-28 -46',
    holdHead: 'M-13 -54 L-14 -76 M13 -54 L14 -76',
    holdCheek: 'M-13 -54 L-20 -30 M13 -54 L11 -70',
    hand: 'M-13 -54 L-20 -30 M13 -54 L22 -88',
    walk: 'M-13 -54 L-24 -36 M13 -54 L24 -36',
    map: 'M-13 -52 L-6 -48 M13 -52 L6 -48'
  }[pose];
  const legs = pose === 'walk' ? 'M-6 -26 L-16 0 M6 -26 L14 0' : 'M-6 -26 L-7 0 M6 -26 L7 0';
  const hairColor = older ? '#9a9a9a' : hair;
  return `
    <path d="${legs}" fill="none" ${st(4)}/>
    ${skirt ? `<path d="M-14 -34 L14 -34 L19 -16 L-19 -16 Z" fill="${shirt}" ${st()}/>` : ''}
    ${bag ? `<rect x="-24" y="-56" width="12" height="22" rx="3" fill="#c98b4b" ${st(2.5)}/>` : ''}
    <rect x="-13" y="-58" width="26" height="32" rx="8" fill="${shirt}" ${st()}/>
    ${apron ? `<path d="M-9 -48 H9 V-24 H-9 Z" fill="#fff" ${st(2)}/>` : ''}
    <path d="${arms}" fill="none" ${st(4)}/>
    <circle cx="0" cy="-73" r="13" fill="#f6d7b8" ${st()}/>
    <path d="M-13 -74 Q-13 -88 0 -88 Q13 -88 13 -74 Q8 -80 0 -80 Q-8 -80 -13 -74 Z" fill="${hairColor}" ${st(2)}/>
    <circle cx="-4.5" cy="-72" r="1.6" fill="${INK}"/><circle cx="4.5" cy="-72" r="1.6" fill="${INK}"/>
    ${glasses ? `<circle cx="-4.5" cy="-72" r="4" fill="none" ${st(1.5)}/><circle cx="4.5" cy="-72" r="4" fill="none" ${st(1.5)}/>` : ''}
    ${cheeks ? `<circle cx="-8" cy="-67" r="2.5" fill="#f08a7a"/><circle cx="8" cy="-67" r="2.5" fill="#f08a7a"/>` : ''}
    ${mask ? `<rect x="-8" y="-69" width="16" height="9" rx="3" fill="#fff" ${st(1.8)}/>` : '<path d="M-3 -66 Q0 -64 3 -66" fill="none" stroke="#2b2b2b" stroke-width="1.6" stroke-linecap="round"/>'}`;
}
const P = (x, y, s, opts) => g(x, y, s, person(opts));

// Arrow pointing down at the person who speaks (as in the real exam)
const arrow = (x, y) => `<path d="M${x - 6} ${y - 30} h12 v15 h9 l-15 15 l-15 -15 h9 z" fill="${INK}"/>`;

// ---------- Objects (centred near 0,0) ----------
const items = {
  drink: `<rect x="-12" y="-22" width="24" height="48" rx="6" fill="#9fd3f0" ${st()}/><rect x="-6" y="-32" width="12" height="10" rx="2" fill="#e05a47" ${st()}/><rect x="-12" y="-4" width="24" height="12" fill="#fff" ${st(2)}/>`,
  snacks: [[-16, 6], [14, 8], [0, -14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="#d9a35f" ${st()}/><circle cx="${x - 5}" cy="${y - 3}" r="2" fill="${INK}"/><circle cx="${x + 4}" cy="${y + 4}" r="2" fill="${INK}"/><circle cx="${x + 5}" cy="${y - 5}" r="2" fill="${INK}"/>`).join(''),
  bento: `<rect x="-32" y="-20" width="64" height="40" rx="6" fill="#f1d6a8" ${st()}/><line x1="0" y1="-20" x2="0" y2="20" ${st()}/><ellipse cx="-16" cy="0" rx="12" ry="12" fill="#fff" ${st(2)}/><circle cx="-16" cy="0" r="3" fill="#d6455a"/><circle cx="10" cy="-7" r="6" fill="#e0533f" ${st(2)}/><rect x="6" y="3" width="20" height="10" rx="2" fill="#f5d34f" ${st(2)}/><path d="M20 -12 q6 4 4 10" fill="#6fb04d" ${st(2)}/>`,
  fruit: `<circle cx="-12" cy="6" r="16" fill="#e0533f" ${st()}/><path d="M-12 -10 v-8" ${st()}/><path d="M-12 -16 q8 -6 12 0 q-6 4 -12 0" fill="#6fb04d" ${st(2)}/><path d="M8 18 Q30 14 32 -14 Q26 6 8 10 Z" fill="#f5d34f" ${st()}/>`,
  egg: `<ellipse cx="0" cy="2" rx="15" ry="20" fill="#fff6e3" ${st()}/>`,
  bread: `<path d="M-26 18 V-2 Q-26 -20 0 -20 Q26 -20 26 -2 V18 Z" fill="#e6b26b" ${st()}/><path d="M-12 -8 q4 4 0 8 M0 -10 q4 4 0 8 M12 -8 q4 4 0 8" fill="none" ${st(2)}/>`,
  milk: `<path d="M-14 -14 L0 -28 L14 -14 Z" fill="#fff" ${st()}/><rect x="-14" y="-14" width="28" height="40" fill="#fff" ${st()}/><rect x="-14" y="0" width="28" height="12" fill="#7fb3e6" ${st(2)}/>`,
  pencil: `<g transform="rotate(-35)"><rect x="-6" y="-30" width="12" height="46" fill="#f5c542" ${st()}/><path d="M-6 16 L0 30 L6 16 Z" fill="#f6d7b8" ${st()}/><rect x="-6" y="-36" width="12" height="7" fill="#e78ba0" ${st(2)}/></g>`,
  notebook: `<rect x="-20" y="-26" width="40" height="52" rx="3" fill="#9cc5a1" ${st()}/><rect x="-12" y="-16" width="24" height="10" fill="#fff" ${st(2)}/><line x1="-14" y1="20" x2="14" y2="20" ${st(2)}/>`,
  gift: `<rect x="-20" y="-12" width="40" height="30" fill="#e0533f" ${st()}/><rect x="-23" y="-20" width="46" height="10" fill="#e0533f" ${st()}/><path d="M0 -20 V18" stroke="#f5d34f" stroke-width="5" stroke-linecap="round"/><path d="M0 -20 q-12 -14 -16 -4 q4 6 16 4 q12 -14 16 -4 q-4 6 -16 4" fill="#f5d34f" ${st(2)}/>`,
  book: `<rect x="-18" y="-24" width="36" height="46" rx="3" fill="#7aa6d6" ${st()}/><line x1="-12" y1="-24" x2="-12" y2="22" ${st(2)}/><rect x="-6" y="-14" width="18" height="8" fill="#fff" ${st(1.5)}/>`,
  cake: `<rect x="-26" y="-6" width="52" height="26" rx="4" fill="#fbe1e6" ${st()}/><path d="M-26 2 q6.5 6 13 0 t13 0 t13 0 t13 0" fill="none" ${st(2)}/>${[-14, 0, 14].map(x => `<rect x="${x - 2}" y="-20" width="4" height="14" fill="#7fb3e6" ${st(1.5)}/><path d="M${x} -26 q4 4 0 6 q-4 -2 0 -6" fill="#f5a623"/>`).join('')}`,
  glass: `<path d="M-9 -14 L9 -14 L7 14 L-7 14 Z" fill="#e8f4fb" ${st(2.5)}/>`,
  pan: `<ellipse cx="-4" cy="6" rx="24" ry="9" fill="#555" ${st()}/><path d="M20 4 L40 -2" ${st(5)}/><path d="M-14 -8 q4 -6 0 -12 M-4 -8 q4 -6 0 -12 M6 -8 q4 -6 0 -12" fill="none" stroke="#999" stroke-width="2.5" stroke-linecap="round"/>`,
  ball: `<circle cx="0" cy="0" r="24" fill="#fff" ${st()}/><path d="M0 -8 L8 -2 L5 8 L-5 8 L-8 -2 Z" fill="${INK}"/><path d="M0 -8 V-24 M8 -2 L22 -8 M5 8 L13 20 M-5 8 L-13 20 M-8 -2 L-22 -8" ${st(2)}/>`,
  movie: `<rect x="-26" y="-8" width="52" height="30" rx="3" fill="#444" ${st()}/><path d="M-26 -8 L-24 -24 L26 -16 L26 -8 Z" fill="#fff" ${st()}/><path d="M-14 -21 l-4 13 M0 -19 l-4 11 M14 -17 l-4 9" ${st(3)}/>`,
  suitcase: `<rect x="-26" y="-14" width="52" height="36" rx="6" fill="#c98b4b" ${st()}/><path d="M-8 -14 V-22 H8 V-14" fill="none" ${st()}/><line x1="-12" y1="-14" x2="-12" y2="22" ${st(2)}/><line x1="12" y1="-14" x2="12" y2="22" ${st(2)}/>`,
  train: `<rect x="-58" y="-22" width="116" height="40" rx="10" fill="#8fc1e3" ${st()}/>${[-42, -18, 6, 30].map(x => `<rect x="${x}" y="-14" width="16" height="13" rx="2" fill="#fff" ${st(2)}/>`).join('')}<rect x="-58" y="6" width="116" height="5" fill="#2f6fb0"/><circle cx="-36" cy="22" r="6" fill="#555" ${st(2)}/><circle cx="36" cy="22" r="6" fill="#555" ${st(2)}/><line x1="-66" y1="30" x2="66" y2="30" ${st(2)}/>`,
  bicycle: `<circle cx="-24" cy="12" r="15" fill="none" ${st()}/><circle cx="24" cy="12" r="15" fill="none" ${st()}/><path d="M-24 12 L-6 -12 L18 -12 L24 12 M-6 -12 L2 12 L18 -12 M2 12 L-24 12 M-10 -20 H0 M18 -12 L14 -24 H22" fill="none" stroke="#d6455a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  walk: g(0, 46, 1.05, person({ pose: 'walk', shirt: '#8cc084' })),
  car: (color, sign) => `<path d="M-46 12 V-2 Q-46 -8 -38 -8 L-24 -24 H20 L34 -8 Q46 -8 46 2 V12 Z" fill="${color}" ${st()}/><path d="M-18 -18 H-2 V-8 H-30 Z M4 -18 H18 L28 -8 H4 Z" fill="#e8f4fb" ${st(2)}/><circle cx="-26" cy="14" r="8" fill="#555" ${st(2)}/><circle cx="26" cy="14" r="8" fill="#555" ${st(2)}/>${sign ? `<rect x="-14" y="-36" width="28" height="12" rx="2" fill="#fff" ${st(2)}/>${text(0, -26.5, sign, 9)}` : ''}`,
  bus: (n) => `<rect x="-50" y="-26" width="100" height="44" rx="8" fill="#6fb04d" ${st()}/>${[-40, -18, 4, 26].map(x => `<rect x="${x}" y="-18" width="16" height="14" rx="2" fill="#e8f4fb" ${st(2)}/>`).join('')}<circle cx="-28" cy="20" r="8" fill="#555" ${st(2)}/><circle cx="28" cy="20" r="8" fill="#555" ${st(2)}/>${n ? `<rect x="-20" y="-46" width="40" height="22" rx="4" fill="#fff" ${st()}/>${text(0, -29, n, 17)}` : ''}`,
  clock: (h, m) => {
    const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const a = i * 30 * Math.PI / 180, r1 = i % 3 ? 36 : 32;
      return `<line x1="${(r1 * Math.sin(a)).toFixed(1)}" y1="${(-r1 * Math.cos(a)).toFixed(1)}" x2="${(40 * Math.sin(a)).toFixed(1)}" y2="${(-40 * Math.cos(a)).toFixed(1)}" ${st(i % 3 ? 2 : 3)}/>`;
    }).join('');
    return `<circle cx="0" cy="0" r="44" fill="#fff" ${st(3.5)}/>${ticks}<line x1="0" y1="0" x2="0" y2="-20" ${st(5)} transform="rotate(${ha})"/><line x1="0" y1="0" x2="0" y2="-32" ${st(3)} transform="rotate(${ma})"/><circle cx="0" cy="0" r="3.5" fill="${INK}"/>`;
  },
  shirt: (color, size) => g(0, 0, size === 'big' ? 1.15 : 0.72, `<path d="M-14 -26 L-36 -14 L-28 2 L-20 -2 V28 H20 V-2 L28 2 L36 -14 L14 -26 Q0 -16 -14 -26 Z" fill="${color}" ${st(size === 'big' ? 2.6 : 4)}/>`),
  pens: (colors) => colors.map((c, i) => {
    const x = (i - (colors.length - 1) / 2) * 20;
    return `<rect x="${x - 5}" y="-26" width="10" height="46" rx="3" fill="#eee" ${st(2.5)}/><rect x="${x - 5}" y="-34" width="10" height="16" rx="3" fill="${c}" ${st(2.5)}/><path d="M${x - 5} 20 L${x} 30 L${x + 5} 20" fill="#ccc" ${st(2)}/>`;
  }).join(''),
  cat: (body, feet) => `<path d="M24 16 q22 -4 16 -26" fill="none" stroke="${body === '#fff' ? INK : body}" stroke-width="6" stroke-linecap="round"/><ellipse cx="0" cy="4" rx="24" ry="20" fill="${body}" ${st()}/><circle cx="0" cy="-24" r="15" fill="${body}" ${st()}/><path d="M-13 -30 L-11 -44 L-3 -36 M13 -30 L11 -44 L3 -36" fill="${body}" ${st()}/><circle cx="-5" cy="-25" r="2" fill="${body === '#fff' ? INK : '#fff'}"/><circle cx="5" cy="-25" r="2" fill="${body === '#fff' ? INK : '#fff'}"/><ellipse cx="-12" cy="24" rx="11" ry="7" fill="${feet}" ${st(2.5)}/><ellipse cx="12" cy="24" rx="11" ry="7" fill="${feet}" ${st(2.5)}/>`,
  room: (at) => {
    const box = (x, y) => `<rect x="${x - 10}" y="${y - 16}" width="20" height="16" fill="#c98b4b" ${st(2)}/><line x1="${x - 10}" y1="${y - 10}" x2="${x + 10}" y2="${y - 10}" ${st(1.5)}/>`;
    const spot = { door: [-34, 38], desk: [6, 4], chair: [36, 18], window: [52, 38] }[at];
    return `<line x1="-70" y1="38" x2="70" y2="38" ${st(2)}/><rect x="-66" y="-36" width="22" height="74" fill="#d9b48a" ${st(2.5)}/><circle cx="-49" cy="2" r="2" fill="${INK}"/><rect x="38" y="-36" width="28" height="22" fill="#e8f4fb" ${st(2.5)}/><line x1="52" y1="-36" x2="52" y2="-14" ${st(2)}/><rect x="-14" y="4" width="40" height="6" fill="#a8774a" ${st(2.5)}/><path d="M-10 10 V38 M22 10 V38" ${st(2.5)}/><rect x="30" y="18" width="14" height="5" fill="#a8774a" ${st(2)}/><path d="M32 23 V38 M42 23 V38 M42 18 V2" ${st(2)}/>${box(...spot)}`;
  }
};

const optPic = (body, s = 1) => frame(160, 120, g(80, 64, s, body));
const pair = (...names) => {
  const step = 150 / names.length;
  return frame(160, 120, names.map((n, i) => g(5 + step * (i + 0.5), 62, names.length > 2 ? 0.78 : 1.05, items[n])).join(''));
};

// Sick people (upper-body close-up)
const sick = {
  cold: frame(160, 120, P(80, 150, 1.35, { mask: true, shirt: '#a7c7e7' }) + '<path d="M104 40 l10 -4 M106 48 l12 0 M104 56 l10 4" stroke="#7aa6d6" stroke-width="3" stroke-linecap="round"/>'),
  head: frame(160, 120, P(80, 150, 1.35, { pose: 'holdHead', shirt: '#e8b4b8' }) + `<path d="M40 22 l6 6 l-4 4 l6 6 M120 22 l-6 6 l4 4 l-6 6" fill="none" ${st(2.5)}/>`),
  tooth: frame(160, 120, P(80, 150, 1.35, { pose: 'holdCheek', shirt: '#b8d8b0' }) + `<path d="M110 44 l8 -6 M112 54 l10 0" ${st(2.5)}/>`),
  fever: frame(160, 120, P(80, 150, 1.35, { cheeks: true, shirt: '#f3d9a4' }) + `<rect x="78" y="58" width="30" height="5" rx="2" fill="#fff" ${st(2)}/><circle cx="108" cy="60.5" r="3" fill="#e0533f"/><path d="M50 34 q-4 6 0 8 q4 -2 0 -8" fill="#7fb3e6"/>`)
};

// ---------- Scenes for もんだい3 (320 × 200) ----------
const floor = '<line x1="12" y1="178" x2="308" y2="178" stroke="#c9c2b6" stroke-width="2"/>';
const table = (x1, x2, y = 140) => `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="10" fill="#a8774a" ${st(2.5)}/><path d="M${x1 + 10} ${y + 10} V178 M${x2 - 10} ${y + 10} V178" ${st(3)}/>`;
const door = (x) => `<rect x="${x}" y="58" width="50" height="120" fill="#d9b48a" ${st(3)}/><circle cx="${x + 40}" cy="120" r="3" fill="${INK}"/>`;
const sun = '<circle cx="48" cy="42" r="18" fill="#f5c542" stroke="#e0a800" stroke-width="2"/>';
const moon = `<path d="M46 26 a18 18 0 1 0 14 30 a14 14 0 1 1 -14 -30 z" fill="#f5d34f" ${st(2)}/><path d="M90 30 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1 z" fill="#f5d34f"/>`;
const bowl = (x, y, full = true) => `<path d="M${x - 14} ${y} q14 18 28 0 z" fill="#fff" ${st(2.5)}/>${full ? `<path d="M${x - 12} ${y} q12 -10 24 0" fill="#fff" ${st(2)}/>` : ''}`;
const board = `<rect x="150" y="26" width="150" height="70" fill="#2f5d50" ${st(3)}/><path d="M166 46 h40 M166 62 h60 M166 78 h30 M220 46 h50" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
const bubble = (x, y, t) => `<ellipse cx="${x}" cy="${y}" rx="18" ry="15" fill="#fff" ${st(2.5)}/>${text(x, y + 7, t, 20)}`;
const scene = (body) => frame(320, 200, floor + body);

const scenes = {
  // N5 test 01
  'N5/t01-057': scene(sun + P(110, 178, 1.1, { shirt: '#7aa6d6' }) + P(215, 178, 1.15, { shirt: '#888', older: true, glasses: true }) + arrow(110, 52)),
  'N5/t01-058': scene(P(160, 178, 1.1, { pose: 'together', shirt: '#e8b4b8' }) + table(90, 230) + bowl(140, 140) + bowl(180, 140) + `<path d="M198 136 l24 -8 M200 140 l24 -6" ${st(2)}/>` + arrow(160, 52)),
  'N5/t01-059': scene(table(50, 150, 132) + table(180, 290, 132) + P(100, 178, 1.05, { pose: 'point', shirt: '#7aa6d6' }) + P(235, 178, 1.05, { shirt: '#e8b4b8', skirt: true }) + `<rect x="196" y="126" width="30" height="5" rx="2" fill="#e0533f" ${st(1.5)}/>` + arrow(100, 58)),
  'N5/t01-060': scene(P(110, 178, 1.05, { pose: 'hand', shirt: '#8cc084' }) + table(60, 170) + bowl(130, 140) + P(250, 178, 1.1, { apron: true, shirt: '#444' }) + arrow(110, 50)),
  'N5/t01-061': scene(door(40) + P(150, 178, 1.1, { pose: 'wave', bag: true, shirt: '#7aa6d6' }) + P(250, 178, 1.1, { skirt: true, shirt: '#e8b4b8', older: true }) + arrow(150, 52)),
  // N5 test 02
  'N5/t02-057': scene(P(110, 178, 1.1, { shirt: '#7aa6d6' }) + P(210, 178, 1.1, { pose: 'giveBoth', skirt: true, shirt: '#e8b4b8' }) + g(172, 120, 0.6, items.gift) + arrow(110, 52)),
  'N5/t02-058': scene(moon + door(60) + P(150, 178, 1.1, { bag: true, shirt: '#888' }) + P(250, 178, 1.1, { pose: 'wave', skirt: true, shirt: '#e8b4b8', older: true }) + arrow(150, 52)),
  'N5/t02-059': scene(board + P(250, 178, 1.15, { pose: 'point', shirt: '#888', glasses: true }) + P(80, 178, 1.05, { pose: 'hand', shirt: '#7aa6d6' }) + table(40, 130, 140) + bubble(120, 60, '?') + arrow(80, 40)),
  'N5/t02-060': scene(P(110, 178, 1.1, { shirt: '#7aa6d6' }) + P(220, 178, 1.1, { skirt: true, shirt: '#f3d9a4' }) + `<path d="M208 92 L220 70 L232 92 Z" fill="#e0533f" ${st(2)}/>` + table(140, 300) + g(220, 128, 0.7, items.cake) + arrow(110, 52)),
  'N5/t02-061': scene(P(110, 178, 1.05, { pose: 'hand', shirt: '#8cc084' }) + table(60, 170) + g(135, 128, 0.9, items.glass) + P(250, 178, 1.1, { apron: true, shirt: '#444' }) + arrow(110, 50)),
  // N5 test 03
  'N5/t03-057': scene(door(30) + P(120, 178, 1.1, { shirt: '#7aa6d6' }) + P(240, 178, 1.1, { shirt: '#888', older: true, glasses: true }) + table(190, 300, 130) + arrow(120, 52)),
  'N5/t03-058': scene(P(160, 178, 1.1, { pose: 'together', shirt: '#8cc084' }) + table(90, 230) + bowl(140, 140, false) + bowl(180, 140, false) + `<path d="M198 136 l24 -8 M200 140 l24 -6" ${st(2)}/>` + arrow(160, 52)),
  'N5/t03-059': scene(`<rect x="30" y="130" width="150" height="34" rx="6" fill="#bcd4ec" ${st(3)}/><path d="M30 164 V178 M180 164 V178" ${st(3)}/><rect x="36" y="114" width="40" height="18" rx="8" fill="#fff" ${st(2.5)}/>` + `<circle cx="66" cy="112" r="13" fill="#f6d7b8" ${st()}/><circle cx="62" cy="110" r="1.6" fill="${INK}"/><circle cx="70" cy="110" r="1.6" fill="${INK}"/><circle cx="60" cy="116" r="2.5" fill="#f08a7a"/><circle cx="72" cy="116" r="2.5" fill="#f08a7a"/><path d="M84 132 H176" ${st(2)}/>` + P(245, 178, 1.1, { shirt: '#7aa6d6' }) + arrow(245, 52)),
  'N5/t03-060': scene(`<rect x="196" y="70" width="6" height="108" fill="#a8774a" ${st(2)}/><path d="M176 74 H240 L250 84 L240 94 H176 Z" fill="#fff" ${st(2.5)}/>${text(212, 90, '?', 16)}` + P(110, 178, 1.1, { pose: 'map', shirt: '#7aa6d6' }) + `<rect x="94" y="114" width="32" height="22" fill="#f3e3b5" ${st(2)}/>` + P(270, 178, 1.05, { skirt: true, shirt: '#e8b4b8' }) + bubble(150, 60, '?') + arrow(110, 52)),
  'N5/t03-061': scene(P(110, 178, 1.1, { pose: 'giveBoth', shirt: '#7aa6d6' }) + g(76, 128, 0.55, items.book) + P(220, 178, 1.1, { skirt: true, shirt: '#f3d9a4' }) + arrow(110, 52))
};

// ---------- Option pictures (shared, reusable) ----------
const pics = {
  'items/drink': optPic(items.drink, 1.4), 'items/snacks': optPic(items.snacks, 1.3), 'items/bento': optPic(items.bento, 1.4), 'items/fruit': optPic(items.fruit, 1.4),
  'items/train': optPic(items.train, 1), 'items/bicycle': optPic(items.bicycle, 1.3), 'items/walk': optPic(items.walk, 1), 'items/bus': optPic(items.bus(''), 1.1),
  'items/taxi': optPic(items.car('#f5c542', 'TAXI'), 1.3), 'items/car': optPic(items.car('#e2665a'), 1.3),
  'items/egg-bread': pair('egg', 'bread'), 'items/egg-milk': pair('egg', 'milk'), 'items/milk-bread': pair('milk', 'bread'), 'items/bread': optPic(items.bread, 1.4),
  'items/pencil-notebook': pair('pencil', 'notebook'), 'items/pencil-bento': pair('pencil', 'bento'), 'items/notebook-bento': pair('notebook', 'bento'), 'items/pencil-notebook-bento': pair('pencil', 'notebook', 'bento'),
  'items/hobby-cooking': optPic(items.pan, 1.4), 'items/hobby-sports': optPic(items.ball, 1.4), 'items/hobby-movie': optPic(items.movie, 1.4), 'items/hobby-travel': optPic(items.suitcase, 1.4),
  'items/shirt-blue-big': optPic(items.shirt('#6f9bdc', 'big')), 'items/shirt-white-big': optPic(items.shirt('#fff', 'big')),
  'items/shirt-white-small': optPic(items.shirt('#fff', 'small')), 'items/shirt-blue-small': optPic(items.shirt('#6f9bdc', 'small')),
  'items/pens-kkr': optPic(items.pens(['#222', '#222', '#e0533f']), 1.4), 'items/pens-krr': optPic(items.pens(['#222', '#e0533f', '#e0533f']), 1.4),
  'items/pens-kkb': optPic(items.pens(['#222', '#222', '#3f78d6']), 1.4), 'items/pens-rrb': optPic(items.pens(['#e0533f', '#e0533f', '#3f78d6']), 1.4),
  'items/cat-black-whitefeet': optPic(items.cat('#333', '#fff'), 1.25), 'items/cat-white-blackfeet': optPic(items.cat('#fff', '#333'), 1.25),
  'items/cat-black': optPic(items.cat('#333', '#333'), 1.25), 'items/cat-white': optPic(items.cat('#fff', '#fff'), 1.25),
  'items/room-door': optPic(items.room('door'), 1), 'items/room-desk': optPic(items.room('desk'), 1), 'items/room-chair': optPic(items.room('chair'), 1), 'items/room-window': optPic(items.room('window'), 1),
  'items/sick-cold': sick.cold, 'items/sick-head': sick.head, 'items/sick-tooth': sick.tooth, 'items/sick-fever': sick.fever
};
for (const n of [1, 3, 5, 7]) pics[`items/bus-${n}`] = optPic(items.bus(String(n)), 1.1);
for (const [h, m] of [[8, 0], [8, 15], [8, 30], [9, 0], [7, 0], [7, 30], [8, 30], [10, 0], [10, 5], [10, 20], [10, 30]]) {
  pics[`items/clock-${h}-${String(m).padStart(2, '0')}`] = optPic(items.clock(h, m), 1.15);
}

// ---------- Which question gets which picture ----------
// opts: option text → picture.  image: scene shown above the options.
const ATTACH = {
  'N5/test-01': {
    'N5-T01-044': { opts: { 'のみもの': 'items/drink', 'おかし': 'items/snacks', 'おべんとう': 'items/bento', 'くだもの': 'items/fruit' } },
    'N5-T01-045': { opts: { '8時': 'items/clock-8-00', '8時15分': 'items/clock-8-15', '8時半': 'items/clock-8-30', '9時': 'items/clock-9-00' } },
    'N5-T01-046': { opts: { '1ばん': 'items/bus-1', '3ばん': 'items/bus-3', '5ばん': 'items/bus-5', '7ばん': 'items/bus-7' } },
    'N5-T01-053': { opts: { 'かぜを ひいたから': 'items/sick-cold', 'あたまが いたかったから': 'items/sick-head', 'はが いたかったから': 'items/sick-tooth', 'ねつが あったから': 'items/sick-fever' } },
    'N5-T01-055': { opts: { 'でんしゃ': 'items/train', 'じてんしゃ': 'items/bicycle', 'あるいて': 'items/walk', 'バス': 'items/bus' } },
    'N5-T01-057': { image: 'N5/t01-057' }, 'N5-T01-058': { image: 'N5/t01-058' }, 'N5-T01-059': { image: 'N5/t01-059' },
    'N5-T01-060': { image: 'N5/t01-060' }, 'N5-T01-061': { image: 'N5/t01-061' }
  },
  'N5/test-02': {
    'N5-T02-044': { opts: { 'たまごと パン': 'items/egg-bread', 'たまごと ぎゅうにゅう': 'items/egg-milk', 'ぎゅうにゅうと パン': 'items/milk-bread', 'パンだけ': 'items/bread' } },
    'N5-T02-045': { opts: { 'えんぴつと ノート': 'items/pencil-notebook', 'えんぴつと おべんとう': 'items/pencil-bento', 'ノートと おべんとう': 'items/notebook-bento', 'えんぴつと ノートと おべんとう': 'items/pencil-notebook-bento' } },
    'N5-T02-047': { opts: { 'あおくて 大きい シャツ': 'items/shirt-blue-big', 'しろくて 大きい シャツ': 'items/shirt-white-big', 'しろくて 小さい シャツ': 'items/shirt-white-small', 'あおくて 小さい シャツ': 'items/shirt-blue-small' } },
    'N5-T02-049': { opts: { '7時半ごろ': 'items/clock-7-30', '7時ごろ': 'items/clock-7-00', '8時ごろ': 'items/clock-8-00', '8時半ごろ': 'items/clock-8-30' } },
    'N5-T02-052': { opts: { 'りょうり': 'items/hobby-cooking', 'スポーツ': 'items/hobby-sports', 'えいが': 'items/hobby-movie', 'りょこう': 'items/hobby-travel' } },
    'N5-T02-057': { image: 'N5/t02-057' }, 'N5-T02-058': { image: 'N5/t02-058' }, 'N5-T02-059': { image: 'N5/t02-059' },
    'N5-T02-060': { image: 'N5/t02-060' }, 'N5-T02-061': { image: 'N5/t02-061' }
  },
  'N5/test-03': {
    'N5-T03-044': { opts: { 'ドアの よこ': 'items/room-door', 'つくえの うえ': 'items/room-desk', 'いすの うえ': 'items/room-chair', 'まどの よこ': 'items/room-window' } },
    'N5-T03-046': { opts: { 'でんしゃ': 'items/train', 'タクシー': 'items/taxi', 'バス': 'items/bus', 'くるま': 'items/car' } },
    'N5-T03-047': { opts: { 'くろい ボールペン 2本と あかい ボールペン 1本': 'items/pens-kkr', 'くろい ボールペン 1本と あかい ボールペン 2本': 'items/pens-krr', 'くろい ボールペン 2本と あおい ボールペン 1本': 'items/pens-kkb', 'あかい ボールペン 2本と あおい ボールペン 1本': 'items/pens-rrb' } },
    'N5-T03-048': { opts: { '10時20分': 'items/clock-10-20', '10時5分': 'items/clock-10-05', '10時': 'items/clock-10-00', '10時半': 'items/clock-10-30' } },
    'N5-T03-052': { opts: { 'くろくて、あしが しろい ねこ': 'items/cat-black-whitefeet', 'しろくて、あしが くろい ねこ': 'items/cat-white-blackfeet', 'ぜんぶ くろい ねこ': 'items/cat-black', 'ぜんぶ しろい ねこ': 'items/cat-white' } },
    'N5-T03-057': { image: 'N5/t03-057' }, 'N5-T03-058': { image: 'N5/t03-058' }, 'N5-T03-059': { image: 'N5/t03-059' },
    'N5-T03-060': { image: 'N5/t03-060' }, 'N5-T03-061': { image: 'N5/t03-061' }
  }
};

// ---------- Write files ----------
let written = 0;
for (const [name, svg] of Object.entries({ ...pics, ...scenes })) {
  const file = path.join(OUT, `${name}.svg`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg);
  written++;
}

let attached = 0;
for (const [test, defs] of Object.entries(ATTACH)) {
  const qPath = path.join(ROOT, 'questions', `${test}.json`);
  const data = JSON.parse(fs.readFileSync(qPath, 'utf8'));
  const all = data.sections.flatMap(s => s.parts.flatMap(p => p.questions));
  for (const [id, def] of Object.entries(defs)) {
    const q = all.find(x => x.id === id);
    if (!q) throw new Error(`${test}: ${id} not found`);
    if (def.image) q.image = `images/${def.image}.svg`;
    if (def.opts) {
      q.optImages = q.opts.map(o => {
        if (!def.opts[o]) throw new Error(`${id}: no picture for option "${o}"`);
        return `images/${def.opts[o]}.svg`;
      });
    }
    attached++;
  }
  fs.writeFileSync(qPath, JSON.stringify(data, null, 2) + '\n');
}
console.log(`Wrote ${written} pictures, attached to ${attached} questions.`);
