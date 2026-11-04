// Exam protection: makes copying and screenshots harder while an exam is open.
// A web page cannot fully block screenshots (or a phone camera pointed at the screen),
// so the watermark puts the student's name on every capture to make leaks traceable.
// Screenshot attempts are counted and sent with live exam answers.

const protect = { on: false, mark: null };

function watermarkText() {
  const s = exam && exam.live ? exam.live.student : null;
  const day = new Date().toLocaleDateString('en-GB');
  return s ? `${s.name} · ${s.roll} · ${day}` : `Samurai Syntax · ${day}`;
}

function protectOn() {
  const text = watermarkText();
  if (protect.on && protect.mark && protect.mark.dataset.text === text) return;
  protect.on = true;
  if (!protect.mark) {
    protect.mark = document.createElement('div');
    protect.mark.className = 'watermark';
    protect.mark.setAttribute('aria-hidden', 'true');
    document.body.appendChild(protect.mark);
  }
  // Repeated diagonal text, drawn as an SVG tile
  const esc = text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="200"><text x="20" y="120" transform="rotate(-24 170 100)" font-family="sans-serif" font-size="15" font-weight="600" fill="#888">${esc}</text></svg>`;
  protect.mark.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  protect.mark.dataset.text = text;
}

function protectOff() {
  protect.on = false;
  document.body.classList.remove('shielded');
  protect.mark?.remove();
  protect.mark = null;
}

function recordShot() {
  // Overwrite whatever the screenshot put on the clipboard
  try { navigator.clipboard?.writeText('').catch(() => {}); } catch (e) {}
  if (exam && exam.live) {
    exam.live.shots = (exam.live.shots || 0) + 1;
    saveLiveProgress();
  }
  shield();
  showToast(t('protect.shot'));
}

// Hide the questions until the student clicks back in
function shield() {
  if (!protect.on) return;
  document.body.classList.add('shielded');
  let el = $('#shield');
  if (!el) {
    el = document.createElement('button');
    el.id = 'shield';
    el.className = 'shield';
    el.onclick = () => document.body.classList.remove('shielded');
    document.body.appendChild(el);
  }
  el.textContent = t('protect.shield');
}

['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach(type =>
  document.addEventListener(type, (e) => { if (protect.on) e.preventDefault(); }));

document.addEventListener('keydown', (e) => {
  if (!protect.on) return;
  // Windows key: Win+Shift+S (Snipping Tool) is handled by Windows and never reaches the page,
  // but the Windows key itself usually does. Hide the questions at once, before S is pressed.
  if (e.key === 'Meta' || e.key === 'OS') {
    protect.metaAt = Date.now();
    shield();
    return;
  }
  const k = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  // Print, save, view source, copy; developer tools; macOS screenshot shortcuts
  if ((mod && ['p', 's', 'u', 'c', 'a'].includes(k)) || k === 'f12' ||
      (mod && e.shiftKey && ['i', 'j', 'c', '3', '4', '5', 's'].includes(k))) {
    e.preventDefault();
    if (k !== 'a' && k !== 'c') recordShot();
  }
});

// PrintScreen only fires keyup on Windows
document.addEventListener('keyup', (e) => {
  if (protect.on && e.key === 'PrintScreen') recordShot();
});

// Snipping tools and screen recorders usually take focus from the page.
// Losing focus right after the Windows key means a Win+Shift+S snip: count it.
window.addEventListener('blur', () => {
  if (protect.on && protect.metaAt && Date.now() - protect.metaAt < 2000) {
    protect.metaAt = 0;
    recordShot();
  } else {
    shield();
  }
});
