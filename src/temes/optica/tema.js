(() => {
const $ = id => document.getElementById(id);
const PI = Math.PI, DEG = PI / 180;

/* ---------- utilitats ---------- */
function fmt(v, d = 2) {
  if (!isFinite(v)) return '—';
  if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;
  return v.toFixed(d).replace('.', ',').replace('-', '−');
}
const fmtN = v => String(+v.toFixed(6)).replace('.', ',').replace('-', '−');
function niceStep(span, n) {
  const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function phiTxt(deg) {
  deg = ((deg % 360) + 360) % 360;
  if (deg === 0) return '0';
  const g = gcd(deg, 180), n = deg / g, d = 180 / g;
  return (n === 1 ? '' : n) + 'π' + (d === 1 ? '' : '/' + d);
}
function fit(cv) {
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
  return { c, W: r.width, H: r.height };
}
const TK = {};
function readTokens() {
  const s = getComputedStyle(document.documentElement);
  ['bg','surface','ink','muted','line','grid','grid2','x','y','f','ec','ep','t','wood','wood2','stone','stone2','earth','ok','bad','ball'].forEach(k => TK[k] = s.getPropertyValue('--' + k).trim());
}
const FM = '"IBM Plex Mono", ui-monospace, monospace', FB = '"IBM Plex Sans", system-ui, sans-serif';
function arrow(c, x1, y1, x2, y2, col, w = 2) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L < 3) return;
  const ux = dx / L, uy = dy / L, h = Math.min(9, L * 0.45);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - ux * h * 0.7, y2 - uy * h * 0.7); c.stroke();
  c.beginPath(); c.moveTo(x2, y2);
  c.lineTo(x2 - ux * h - uy * h * 0.45, y2 - uy * h + ux * h * 0.45);
  c.lineTo(x2 - ux * h + uy * h * 0.45, y2 - uy * h - ux * h * 0.45);
  c.closePath(); c.fill();
}
function bind(rId, nId, obj, key, lo, hi, after) {
  const R = $(rId), N = $(nId);
  const set = v => { v = Math.min(hi, Math.max(lo, v)); obj[key] = v; R.value = v; N.value = v; after && after(); };
  R.value = obj[key]; N.value = obj[key];
  R.addEventListener('input', () => set(+R.value));
  N.addEventListener('change', () => { if (N.value !== '' && isFinite(+N.value)) set(+N.value); else N.value = obj[key]; });
  return set;
}
function segBind(id, attr, obj, key, after) {
  const bs = document.querySelectorAll('#' + id + ' button');
  const mark = () => bs.forEach(b => b.setAttribute('aria-pressed', Math.abs(+b.dataset[attr] - obj[key]) < 1e-9));
  bs.forEach(b => b.onclick = () => { obj[key] = +b.dataset[attr]; mark(); after && after(); });
  mark();
  return mark;
}
function curve(c, f, t0, t1, X, Y, N = 120) {
  c.beginPath();
  for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N; i ? c.lineTo(X(t), Y(f(t))) : c.moveTo(X(t), Y(f(t))); }
}

/* registre de demos (només s'anima el que es veu) */
const demos = [];
function register(root, step, draw) {
  const d = { step, draw, vis: true };
  demos.push(d);
  const box = root.closest('.demo') || root;
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { d.vis = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(box);
}
/* barres de temps: no es mouen mentre l'usuari les arrossega */
const dragging = new Set();
function scrubGuard(id) {
  const el = $(id);
  el.addEventListener('pointerdown', () => dragging.add(id));
  const end = () => { dragging.delete(id); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('change', () => { end(); el.blur(); });
}
const setScrub = (id, t) => { if (!dragging.has(id)) $(id).value = t; };

if (document.getElementById('demos')) {
/* =====================================================
   DEMO 1 · Llei de Snell i reflexió total
   ===================================================== */
const D0 = { n1: 1, n2: 1.5, t: 40 };
const C0 = 3e8;
const setN10 = bind('d0n1', 'd0n1n', D0, 'n1', 1, 2.5, () => mark01());
const setN20 = bind('d0n2', 'd0n2n', D0, 'n2', 1, 2.5, () => mark02());
const setT0 = bind('d0t', 'd0tn', D0, 't', 0, 89);
const mark01 = segBind('d0m1', 'n', D0, 'n1', () => setN10(D0.n1));
const mark02 = segBind('d0m2', 'n', D0, 'n2', () => setN20(D0.n2));
// medi tenyit segons l'índex (com més n, més color)
function tint(c, n, x, y, w, h) {
  c.save(); c.globalAlpha = Math.min(0.42, 0.06 + (n - 1) * 0.26); c.fillStyle = TK.t; c.fillRect(x, y, w, h); c.restore();
}
function ang0() {
  const s2 = D0.n1 * Math.sin(D0.t * DEG) / D0.n2;
  return { s2, tir: s2 > 1, t2: s2 <= 1 ? Math.asin(s2) / DEG : NaN, tL: D0.n1 > D0.n2 ? Math.asin(D0.n2 / D0.n1) / DEG : NaN };
}
function arcAng(c, x, y, r, a0, a1, col) {
  c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
}
function drawSnell() {
  const { c, W, H } = fit($('c0'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const ox = W / 2, oy = H / 2, R = Math.min(W * 0.42, H * 0.46);
  tint(c, D0.n1, 0, 0, W, oy); tint(c, D0.n2, 0, oy, W, H - oy);
  c.strokeStyle = TK.muted; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, oy); c.lineTo(W, oy); c.stroke();
  c.save(); c.setLineDash([6, 5]); c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(ox, 8); c.lineTo(ox, H - 8); c.stroke(); c.restore();
  c.font = '12px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillText('medi 1 · n₁ = ' + fmt(D0.n1), 12, 10); c.textBaseline = 'bottom'; c.fillText('medi 2 · n₂ = ' + fmt(D0.n2), 12, H - 10);
  const { tir, t2, tL } = ang0();
  const a1 = D0.t * DEG;
  const sx = ox - R * Math.sin(a1), sy = oy - R * Math.cos(a1);
  // angle límit (si n1 > n2)
  if (isFinite(tL)) {
    c.save(); c.setLineDash([2, 4]); c.globalAlpha = 0.7; c.strokeStyle = TK.f; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(ox - R * Math.sin(tL * DEG), oy - R * Math.cos(tL * DEG)); c.lineTo(ox, oy); c.stroke(); c.restore();
    c.fillStyle = TK.f; c.font = '11px ' + FM; c.textAlign = 'right'; c.textBaseline = 'bottom';
    c.fillText('θL', ox - R * Math.sin(tL * DEG) - 4, oy - R * Math.cos(tL * DEG));
  }
  // raigs
  arrow(c, sx, sy, ox - (ox - sx) * 0.42, oy - (oy - sy) * 0.42, TK.y, 3);
  c.strokeStyle = TK.y; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ox, oy); c.stroke();
  c.save(); c.globalAlpha = tir ? 1 : 0.4;
  const rx = ox + R * Math.sin(a1), ry = oy - R * Math.cos(a1);
  c.strokeStyle = TK.y; c.lineWidth = tir ? 3 : 2; c.beginPath(); c.moveTo(ox, oy); c.lineTo(rx, ry); c.stroke();
  arrow(c, ox, oy, ox + (rx - ox) * 0.6, oy + (ry - oy) * 0.6, TK.y, tir ? 3 : 2);
  c.restore();
  if (!tir) {
    const b = t2 * DEG, tx = ox + R * Math.sin(b), ty = oy + R * Math.cos(b);
    c.strokeStyle = TK.y; c.lineWidth = 3; c.beginPath(); c.moveTo(ox, oy); c.lineTo(tx, ty); c.stroke();
    arrow(c, ox, oy, ox + (tx - ox) * 0.6, oy + (ty - oy) * 0.6, TK.y, 3);
    if (t2 > 0.5) { arcAng(c, ox, oy, 46, PI / 2, PI / 2 - b, TK.ink); }
    c.fillStyle = TK.ink; c.font = 'italic 15px ' + FB; c.textAlign = 'left'; c.textBaseline = 'top';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('θ₂', ox + 66 * Math.sin(Math.max(b, 12 * DEG) / 2), oy + 66 * Math.cos(Math.max(b, 12 * DEG) / 2));
  } else {
    c.fillStyle = TK.bad; c.font = '600 13px ' + FB; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('reflexió total: no hi ha raig refractat', ox, oy + 16);
  }
  if (D0.t > 0.5) arcAng(c, ox, oy, 54, -PI / 2, -PI / 2 - a1, TK.ink);
  c.fillStyle = TK.ink; c.font = 'italic 15px ' + FB; c.textAlign = 'right'; c.textBaseline = 'bottom';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('θ₁', ox - 72 * Math.sin(Math.max(a1, 12 * DEG) / 2), oy - 72 * Math.cos(Math.max(a1, 12 * DEG) / 2));
  // font
  c.fillStyle = TK.y; c.beginPath(); c.arc(sx, sy, 7, 0, 7); c.fill();
}
(function drag0() {
  const cv = $('c0'); let on = false;
  const set = e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    if (y >= -2) return;
    setT0(Math.round(Math.atan2(Math.max(0, -x), -y) / DEG * 2) / 2);
  };
  cv.addEventListener('pointerdown', e => { on = true; cv.setPointerCapture(e.pointerId); set(e); });
  cv.addEventListener('pointermove', e => { if (on) set(e); });
  cv.addEventListener('pointerup', () => { on = false; });
})();
let key0 = '';
function texts0() {
  const { s2, tir, t2, tL } = ang0();
  $('d0r1').textContent = fmt(D0.t, 1) + '°';
  $('d0r2').textContent = tir ? '—' : fmt(t2, 1) + '°';
  $('d0rL').textContent = isFinite(tL) ? fmt(tL, 1) + '°' : 'no n\'hi ha';
  $('d0v1').textContent = fmt(C0 / D0.n1 / 1e8, 2) + '·10⁸ m/s';
  $('d0v2').textContent = fmt(C0 / D0.n2 / 1e8, 2) + '·10⁸ m/s';
  $('d0l2').textContent = fmt(600 / D0.n2, 0) + ' nm';
  const key = [D0.n1, D0.n2, D0.t].join('|');
  if (key === key0) return; key0 = key;
  $('d0e1').textContent = 'sin θ₂ = n₁·sin θ₁/n₂ = ' + fmt(D0.n1) + '·sin ' + fmt(D0.t, 1) + '°/' + fmt(D0.n2) + ' = ' + fmt(s2, 3) + (tir ? ' > 1' : ' → θ₂ = ' + fmt(t2, 1) + '°');
  $('d0e2').textContent = isFinite(tL) ? 'sin θL = n₂/n₁ = ' + fmt(D0.n2) + '/' + fmt(D0.n1) + ' → θL = ' + fmt(tL, 1) + '°' : 'n₂ ≥ n₁: no hi ha angle límit, sempre es refracta';
  $('d0e3').textContent = tir ? 'θ₁ > θL: reflexió total' : (D0.n2 > D0.n1 ? 'n₂ > n₁: el refractat s\'apropa a la normal' : D0.n2 < D0.n1 ? 'n₂ < n₁: el refractat s\'allunya de la normal' : 'mateix índex: no es desvia');
}
register($('c0'), () => {}, () => { drawSnell(); texts0(); });

/* =====================================================
   DEMO 2 · Fibra òptica
   ===================================================== */
const D1 = { p: 20, n1: 1.5, n2: 1.4 };
bind('d1p', 'd1pn', D1, 'p', 0, 80);
bind('d1n1', 'd1n1n', D1, 'n1', 1.3, 1.7, () => { if (D1.n2 >= D1.n1) { D1.n2 = +(D1.n1 - 0.01).toFixed(2); $('d1n2').value = D1.n2; $('d1n2n').value = D1.n2; } });
bind('d1n2', 'd1n2n', D1, 'n2', 1, 1.69, () => { if (D1.n2 >= D1.n1) { D1.n2 = +(D1.n1 - 0.01).toFixed(2); $('d1n2').value = D1.n2; $('d1n2n').value = D1.n2; } });
function fib1() {
  const tr = Math.asin(Math.sin(D1.p * DEG) / D1.n1) / DEG, tw = 90 - tr, tL = Math.asin(D1.n2 / D1.n1) / DEG;
  const na = Math.sqrt(D1.n1 * D1.n1 - D1.n2 * D1.n2), pm = na >= 1 ? 90 : Math.asin(na) / DEG;
  return { tr, tw, tL, pm, ok: tw >= tL - 1e-9 };
}
function drawFibra() {
  const { c, W, H } = fit($('c1'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const x0 = Math.max(110, W * 0.2), x1 = W - 10, yc = H / 2, hc = Math.min(H * 0.22, 95), hr = hc + Math.min(34, H * 0.08);
  c.save(); c.globalAlpha = 0.16; c.fillStyle = TK.muted; c.fillRect(x0, yc - hr, x1 - x0, 2 * hr); c.restore();
  c.save(); c.globalAlpha = 0.26; c.fillStyle = TK.t; c.fillRect(x0, yc - hc, x1 - x0, 2 * hc); c.restore();
  c.strokeStyle = TK.t; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0, yc - hc); c.lineTo(x1, yc - hc); c.moveTo(x0, yc + hc); c.lineTo(x1, yc + hc); c.stroke();
  c.strokeStyle = TK.muted; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, yc - hr); c.lineTo(x0, yc + hr); c.stroke();
  c.save(); c.setLineDash([6, 5]); c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(10, yc); c.lineTo(x1, yc); c.stroke(); c.restore();
  c.font = '11px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText('revestiment · n₂ = ' + fmt(D1.n2), (x0 + x1) / 2, yc - hr - 4); c.textBaseline = 'top'; c.fillText('aire · n = 1,00', x0 / 2, 10);
  c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('nucli · n₁ = ' + fmt(D1.n1), x0 + 10, yc + hc - 6);
  const { tr, tw, tL, ok } = fib1();
  // raig d'entrada
  const L0 = Math.min(x0 - 14, 140), ax = x0 - L0 * Math.cos(D1.p * DEG), ay = yc + L0 * Math.sin(D1.p * DEG);
  c.strokeStyle = TK.y; c.lineWidth = 3; c.beginPath(); c.moveTo(ax, ay); c.lineTo(x0, yc); c.stroke();
  arrow(c, ax, ay, (ax + x0) / 2 + 4, (ay + yc) / 2 - 2, TK.y, 3);
  if (D1.p > 0.5) { c.strokeStyle = TK.ink; c.lineWidth = 1.2; c.beginPath(); c.arc(x0, yc, 34, PI - D1.p * DEG, PI); c.stroke();
    c.fillStyle = TK.ink; c.font = 'italic 15px ' + FB; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText('φ', x0 - 38, yc + 6); }
  // zig-zag dins el nucli
  const t = tr * DEG; let x = x0, y = yc, dir = -1, alpha = 1, k = 0;
  c.lineWidth = 3;
  while (x < x1 && k < 60 && alpha > 0.05) {
    const yt = dir < 0 ? yc - hc : yc + hc;
    const dx = Math.abs(yt - y) / Math.max(Math.tan(t), 1e-6);
    const nx = x + dx;
    if (nx > x1) { c.save(); c.globalAlpha = alpha; c.strokeStyle = TK.y; c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y + (x1 - x) * Math.tan(t) * dir); c.stroke(); c.restore(); break; }
    c.save(); c.globalAlpha = alpha; c.strokeStyle = TK.y; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, yt); c.stroke();
    if (k === 0 && dx > 60) arrow(c, x, y, (x + nx) / 2 + 3, (y + yt) / 2 + dir * 3 * Math.tan(t), TK.y, 3);
    c.restore();
    if (k === 0) {   // angle a la paret
      c.save(); c.setLineDash([3, 3]); c.strokeStyle = TK.muted; c.lineWidth = 1; c.beginPath(); c.moveTo(nx, yt - 28 * dir); c.lineTo(nx, yt + 52 * -dir); c.stroke(); c.restore();
      c.fillStyle = ok ? TK.ok : TK.bad; c.font = 'italic 13px ' + FB; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('θ = ' + fmt(tw, 1) + '°', nx + 6, yt - dir * 30);
    }
    if (!ok) {   // part que s'escapa al revestiment
      const te = Math.asin(Math.min(1, D1.n1 * Math.sin(tw * DEG) / D1.n2));
      const ex = nx + 40 * Math.sin(te), ey = yt + dir * 40 * Math.cos(te);
      c.save(); c.globalAlpha = alpha * 0.8; c.strokeStyle = TK.bad; c.lineWidth = 2; c.beginPath(); c.moveTo(nx, yt); c.lineTo(ex, ey); c.stroke(); c.restore();
      alpha *= 0.55;
    }
    x = nx; y = yt; dir = -dir; k++;
  }
  c.fillStyle = ok ? TK.ok : TK.bad; c.font = '600 13px ' + FB; c.textAlign = 'right'; c.textBaseline = 'bottom';
  c.fillText(ok ? 'reflexió total: la llum queda guiada' : 'θ < θL: a cada rebot s\'escapa llum', x1 - 4, H - 8);
}
let key1 = '';
function texts1() {
  const { tr, tw, tL, pm, ok } = fib1();
  $('d1rr').textContent = fmt(tr, 1) + '°'; $('d1rw').textContent = fmt(tw, 1) + '°'; $('d1rL').textContent = fmt(tL, 1) + '°';
  $('d1rm').textContent = fmt(pm, 1) + '°'; $('d1rv').textContent = fmt(C0 / D1.n1 / 1e8, 2) + '·10⁸ m/s';
  $('d1rs').textContent = ok ? 'guiada' : 'es perd'; $('d1rs').style.color = ok ? TK.ok : TK.bad;
  const key = [D1.p, D1.n1, D1.n2].join('|');
  if (key === key1) return; key1 = key;
  $('d1e1').textContent = 'entrada: 1,00·sin ' + fmt(D1.p, 1) + '° = ' + fmt(D1.n1) + '·sin θr → θr = ' + fmt(tr, 1) + '°';
  $('d1e2').textContent = 'paret: θ = 90° − θr = ' + fmt(tw, 1) + '°   sin θL = ' + fmt(D1.n2) + '/' + fmt(D1.n1) + ' → θL = ' + fmt(tL, 1) + '°';
  $('d1e3').textContent = 'φmàx: sin φ = ' + fmt(D1.n1) + '·sin(90° − θL) = ' + fmt(Math.min(1, D1.n1 * Math.cos(tL * DEG)), 3) + ' → φmàx = ' + fmt(pm, 1) + '°';
}
register($('c1'), () => {}, () => { drawFibra(); texts1(); });

/* =====================================================
   DEMO 3 · Lent prima
   ===================================================== */
const D2 = { k: 1, f: 10, s: 25, y: 3 };
segBind('d2k', 'k', D2, 'k');
bind('d2f', 'd2fn', D2, 'f', 5, 30);
const setS2 = bind('d2s', 'd2sn', D2, 's', 2, 80);
bind('d2y', 'd2yn', D2, 'y', 1, 6);
// conveni normalitzat: s < 0, 1/s′ − 1/s = 1/f′
function lens2() {
  const fp = D2.k * D2.f, s = -D2.s;
  const inv = 1 / fp + 1 / s;
  const sp = Math.abs(inv) < 1e-9 ? Infinity : 1 / inv;
  const b = isFinite(sp) ? sp / s : Infinity;
  return { fp, s, sp, b, yp: b * D2.y };
}
let geo2 = null;
function drawLent() {
  const { c, W, H } = fit($('c2'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const { fp, s, sp, b, yp } = lens2();
  const xl = W * 0.5, yc = H * 0.55;
  const span = Math.max(40, D2.s * 1.12, 2.4 * D2.f);
  const kx = (xl - 24) / span, ky = (H * 0.36) / 6;
  geo2 = { xl, kx };
  const X = u => xl + u * kx, Y = v => yc - v * ky;
  c.strokeStyle = TK.muted; c.lineWidth = 1; c.beginPath(); c.moveTo(0, yc); c.lineTo(W, yc); c.stroke();
  // lent
  const hh = H * 0.42;
  c.save(); c.globalAlpha = 0.22; c.fillStyle = TK.t; c.beginPath();
  if (D2.k > 0) { c.moveTo(xl, yc - hh); c.quadraticCurveTo(xl + 16, yc, xl, yc + hh); c.quadraticCurveTo(xl - 16, yc, xl, yc - hh); }
  else { c.moveTo(xl - 10, yc - hh); c.lineTo(xl + 10, yc - hh); c.quadraticCurveTo(xl + 1, yc, xl + 10, yc + hh); c.lineTo(xl - 10, yc + hh); c.quadraticCurveTo(xl - 1, yc, xl - 10, yc - hh); }
  c.fill(); c.restore();
  c.strokeStyle = TK.t; c.lineWidth = 2; c.beginPath(); c.moveTo(xl, yc - hh); c.lineTo(xl, yc + hh); c.stroke();
  if (D2.k > 0) { arrow(c, xl, yc - hh + 12, xl, yc - hh, TK.t, 2); arrow(c, xl, yc + hh - 12, xl, yc + hh, TK.t, 2); }
  else { arrow(c, xl, yc - hh, xl, yc - hh + 12, TK.t, 2); arrow(c, xl, yc + hh, xl, yc + hh - 12, TK.t, 2); }
  // focus
  c.font = 'italic 14px ' + FB; c.textAlign = 'center'; c.textBaseline = 'top';
  [[-fp, 'F'], [fp, 'F′'], [-2 * fp, '2F'], [2 * fp, '2F′']].forEach(([u, t]) => {
    const px = X(u); if (px < 6 || px > W - 6) return;
    c.fillStyle = TK.ink; c.beginPath(); c.arc(px, yc, 3.5, 0, 7); c.fill(); c.fillText(t, px, yc + 8);
  });
  // raigs
  const ox = X(s), oy = Y(D2.y), xe = W + 10;
  const line = (x1, y1, x2, y2, dash) => { c.save(); if (dash) { c.setLineDash([6, 5]); c.globalAlpha = 0.75; c.lineWidth = 1.5; } else c.lineWidth = 2.4; c.strokeStyle = TK.y; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore(); };
  const ext = (x1, y1, x2, y2, xt) => [xt, y1 + (y2 - y1) * (xt - x1) / (x2 - x1)];
  const real = isFinite(sp) && sp > 0;
  const ix = isFinite(sp) ? X(sp) : null, iy = isFinite(sp) ? Y(yp) : null;
  // 1: paral·lel
  line(ox, oy, xl, oy);
  const F2 = [X(fp), yc];
  const r1 = D2.k > 0 ? ext(xl, oy, F2[0], F2[1], xe) : ext(F2[0], F2[1], xl, oy, xe);
  line(xl, oy, r1[0], r1[1]);
  if (D2.k < 0) line(F2[0], F2[1], xl, oy, true);
  // 2: centre
  const r2 = ext(ox, oy, xl, yc, xe); line(ox, oy, r2[0], r2[1]);
  // 3: per F → paral·lel (si l'objecte no és al focus)
  const F1x = X(-fp);
  if (Math.abs(ox - F1x) > 2) {
    const y3 = yc + (oy - yc) * (xl - F1x) / (ox - F1x);
    if (Math.abs(y3 - yc) < H) {
      line(ox, oy, xl, y3); line(xl, y3, xe, y3);
      if ((D2.k > 0 && ox > F1x) || D2.k < 0) line(D2.k > 0 ? F1x : xl, D2.k > 0 ? yc : y3, D2.k > 0 ? ox : F1x, D2.k > 0 ? oy : yc, true);
      if (!real && isFinite(sp)) line(xl, y3, ix, iy, true);
    }
  }
  if (!real && isFinite(sp)) { line(xl, oy, ix, iy, true); line(ox, oy, ix, iy, true); }
  // objecte
  arrow(c, ox, yc, ox, oy, TK.ec, 3.2);
  c.fillStyle = TK.ec; c.font = '600 12px ' + FB; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText('objecte', ox, Math.min(oy, yc) - 6);
  // imatge
  if (isFinite(sp) && ix > -20 && ix < W + 20) {
    c.save(); if (!real) c.setLineDash([6, 4]);
    c.strokeStyle = TK.f; c.lineWidth = 3.2; c.beginPath(); c.moveTo(ix, yc); c.lineTo(ix, iy); c.stroke(); c.restore();
    arrow(c, ix, yc + (iy - yc) * 0.8, ix, iy, TK.f, 3.2);
    c.fillStyle = TK.f; c.textBaseline = yp < 0 ? 'top' : 'bottom'; c.fillText(real ? 'imatge real' : 'imatge virtual', ix, iy + (yp < 0 ? 6 : -6));
  } else {
    c.fillStyle = TK.f; c.font = '600 12px ' + FB; c.textAlign = 'right'; c.textBaseline = 'top';
    c.fillText(isFinite(sp) ? 'la imatge és fora de la vista (s′ = ' + fmt(sp, 0) + ' cm)' : 'objecte al focus: la imatge és a l\'infinit', W - 8, 8);
  }
}
(function drag2() {
  const cv = $('c2'); let on = false;
  const set = e => { if (!geo2) return; const r = cv.getBoundingClientRect(); const u = (e.clientX - r.left - geo2.xl) / geo2.kx; setS2(Math.round(Math.max(2, Math.min(80, -u)) * 2) / 2); };
  cv.addEventListener('pointerdown', e => { on = true; cv.setPointerCapture(e.pointerId); set(e); });
  cv.addEventListener('pointermove', e => { if (on) set(e); });
  cv.addEventListener('pointerup', () => { on = false; });
})();
let key2 = '';
function texts2() {
  const { fp, s, sp, b, yp } = lens2();
  const real = isFinite(sp) && sp > 0;
  $('d2rs').textContent = fmt(s, 1) + ' cm'; $('d2rsp').textContent = isFinite(sp) ? fmt(sp, 1) + ' cm' : '∞';
  $('d2rb').textContent = isFinite(b) ? fmt(b, 2) : '∞'; $('d2ry').textContent = isFinite(yp) ? fmt(yp, 1) + ' cm' : '∞';
  $('d2rP').textContent = fmt(100 / fp, 1) + ' D';
  $('d2rt').textContent = !isFinite(sp) ? 'no es forma' : (real ? 'real' : 'virtual') + ', ' + (b < 0 ? 'invertida' : 'dreta');
  const key = [D2.k, D2.f, D2.s, D2.y].join('|');
  if (key === key2) return; key2 = key;
  $('d2e1').textContent = '1/s′ = 1/f′ + 1/s = 1/' + fmtN(fp) + ' + 1/(' + fmtN(s) + ') → s′ = ' + (isFinite(sp) ? fmt(sp, 1) + ' cm' : '∞');
  $('d2e2').textContent = isFinite(sp) ? 'β = s′/s = ' + fmt(sp, 1) + '/(' + fmtN(s) + ') = ' + fmt(b, 2) + '   y′ = β·y = ' + fmt(yp, 1) + ' cm' : 'els raigs surten paral·lels';
  $('d2e3').textContent = 'P = 1/f′ = 1/' + fmt(fp / 100, 3) + ' m = ' + fmt(100 / fp, 1) + ' D';
}
register($('c2'), () => {}, () => { drawLent(); texts2(); });

/* =====================================================
   DEMO 4 · L'ull i les ulleres
   ===================================================== */
const D3 = { t: 1, o: 1000, g: false };
const DR = 0.020;   // lent–retina [m]
const ULL = [
  { nom: 'Ull normal: enfoca de 25 cm fins a l\'infinit.', pmin: 50, pmax: 54, pp: 0.25, pr: Infinity, gl: 0 },
  { nom: 'Ull miop: convergeix massa. Veu bé de prop (fins a 12 cm), però més enllà de 50 cm ho veu borrós.', pmin: 52, pmax: 58.33, pp: 0.12, pr: 0.5, gl: -2 },
  { nom: 'Ull hipermetrop: convergeix poc. Veu bé de lluny, però més a prop d\'1 m ho veu borrós.', pmin: 48, pmax: 51, pp: 1, pr: Infinity, gl: 3 }
];
segBind('d3t', 't', D3, 't', () => { $('d3tn').textContent = ULL[D3.t].nom; $('d3g').disabled = D3.t === 0; if (D3.t === 0) { D3.g = false; $('d3g').checked = false; } });
segBind('d3o', 'o', D3, 'o');
$('d3g').onchange = e => D3.g = e.target.checked;
$('d3tn').textContent = ULL[D3.t].nom;
function eye3() {
  const U = ULL[D3.t], Pg = D3.g ? U.gl : 0, D = D3.o;
  const need = 1 / DR + 1 / D - Pg;                  // potència que hauria de tenir l'ull
  const Pe = Math.min(U.pmax, Math.max(U.pmin, need));
  const v = Pe + Pg - 1 / D;                          // 1/s′ = P − 1/D
  const sp = 1 / v;
  return { U, Pg, need, Pe, sp, ok: Math.abs(sp - DR) < 0.0002 };
}
function drawUll() {
  const { c, W, H } = fit($('c3'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const { U, Pg, sp, ok } = eye3();
  const yc = H * 0.5, xe = W * 0.5, kd = (W * 0.36) / DR;   // escala dins l'ull
  const xr = xe + DR * kd, ap = Math.min(H * 0.16, 44);
  c.strokeStyle = TK.muted; c.lineWidth = 1; c.save(); c.setLineDash([5, 5]); c.beginPath(); c.moveTo(10, yc); c.lineTo(W - 10, yc); c.stroke(); c.restore();
  // globus ocular
  const ry = Math.min(H * 0.38, (xr - xe) * 0.62);
  c.fillStyle = TK.bg; c.strokeStyle = TK.muted; c.lineWidth = 1.6;
  c.beginPath(); c.ellipse((xe + xr) / 2 + 6, yc, (xr - xe) / 2 + 16, ry, 0, 0, 2 * PI); c.fill(); c.stroke();
  c.strokeStyle = TK.y; c.lineWidth = 4; c.beginPath(); c.ellipse((xe + xr) / 2 + 6, yc, (xr - xe) / 2 + 16, ry, 0, -0.62, 0.62); c.stroke();
  c.fillStyle = TK.y; c.font = '11px ' + FM; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('retina', xr + 18, yc - ry * 0.6);
  // cristal·lí
  c.save(); c.globalAlpha = 0.4; c.fillStyle = TK.t; c.beginPath(); c.ellipse(xe, yc, 9, ap + 6, 0, 0, 2 * PI); c.fill(); c.restore();
  // objecte (no a escala)
  const far = D3.o > 100, xo = 40;
  c.fillStyle = TK.ec; c.font = '600 12px ' + FB; c.textAlign = 'center'; c.textBaseline = 'top';
  c.textBaseline = 'bottom'; c.fillText(far ? 'objecte llunyà' : 'objecte a ' + (D3.o < 1 ? fmt(D3.o * 100, 0) + ' cm' : fmt(D3.o, 0) + ' m'), xo + 30, yc - ap - 12);
  if (!far) { c.beginPath(); c.arc(xo, yc, 5, 0, 7); c.fill(); }
  // ulleres
  const xg = xe - Math.min(70, W * 0.1);
  if (D3.g) {
    c.save(); c.globalAlpha = 0.25; c.fillStyle = TK.f; c.fillRect(xg - 6, yc - ap - 20, 12, 2 * ap + 40); c.restore();
    c.strokeStyle = TK.f; c.lineWidth = 2; c.beginPath(); c.moveTo(xg, yc - ap - 20); c.lineTo(xg, yc + ap + 20); c.stroke();
    c.fillStyle = TK.f; c.font = '600 12px ' + FB; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText((Pg > 0 ? '+' : '') + fmt(Pg, 1) + ' D', xg, yc - ap - 24);
  }
  // raigs: arriben a la lent a ±h i van cap al focus (a sp de la lent)
  const xf = xr + (sp - DR) * kd * 4;   // ×4: el desenfocament real és d'una fracció de mil·límetre
  [-1, -0.5, 0.5, 1].forEach(q => {
    const h = q * ap, yl = yc - h;
    c.strokeStyle = TK.y; c.lineWidth = 1.8; c.beginPath();
    if (D3.g) {   // les ulleres desvien el raig: les convergents cap a l'eix, les divergents cap a fora
      const yg = yc - h * (Pg < 0 ? 0.7 : far ? 1.15 : 0.9);
      if (far) { c.moveTo(10, yg); } else { c.moveTo(xo, yc); }
      c.lineTo(xg, yg); c.lineTo(xe, yl);
    } else if (far) { c.moveTo(10, yl); c.lineTo(xe, yl); } else { c.moveTo(xo, yc); c.lineTo(xe, yl); }
    c.stroke();
    // dins l'ull fins a la retina
    const yr = yl + (yc - yl) * (xr - xe) / Math.max(1, xf - xe);
    c.beginPath(); c.moveTo(xe, yl); c.lineTo(xr, yr); c.stroke();
    if (xf > xr + 1) { c.save(); c.setLineDash([4, 4]); c.globalAlpha = 0.6; c.beginPath(); c.moveTo(xr, yr); c.lineTo(xf, yc); c.stroke(); c.restore(); }
  });
  // taca a la retina
  const blur = Math.abs(ap * (xr - xf) / Math.max(1, xf - xe));
  c.fillStyle = ok ? TK.ok : TK.bad; c.beginPath(); c.arc(xr, yc, Math.max(4, Math.min(blur, ap)), 0, 7); c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
  if (xf > xe && xf < W) { c.fillStyle = TK.f; c.beginPath(); c.arc(xf, yc, 3.5, 0, 7); c.fill(); }
  c.fillStyle = ok ? TK.ok : TK.bad; c.font = '600 13px ' + FB; c.textAlign = 'right'; c.textBaseline = 'bottom';
  c.fillText(ok ? 'imatge nítida a la retina' : (sp < DR ? 'la imatge es forma davant la retina' : 'la imatge es forma darrere la retina'), W - 10, H - 10);
  c.fillStyle = TK.muted; c.font = '11px ' + FM; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('(no a escala) ←', 12, H - 10);
}
let key3 = '';
function texts3() {
  const { U, Pg, need, Pe, ok } = eye3();
  const d = v => isFinite(v) ? (v < 1 ? fmt(v * 100, 0) + ' cm' : fmt(v, v < 10 ? 1 : 0) + ' m') : '∞';
  $('d3ro').textContent = D3.o > 100 ? 'lluny' : d(D3.o); $('d3rp').textContent = d(U.pp); $('d3rr').textContent = d(U.pr);
  $('d3rg').textContent = D3.g ? (Pg > 0 ? '+' : '') + fmt(Pg, 1) + ' D' : '—'; $('d3re').textContent = fmt(Pe, 1) + ' D';
  $('d3rs').textContent = ok ? 'nítid' : 'borrós'; $('d3rs').style.color = ok ? TK.ok : TK.bad;
  const key = [D3.t, D3.o, D3.g].join('|');
  if (key === key3) return; key3 = key;
  $('d3e1').textContent = 'L\'ull necessita P = 1/0,020 + 1/D' + (D3.g ? ' − P_ulleres' : '') + ' = ' + fmt(need, 1) + ' D';
  $('d3e2').textContent = 'i pot anar de ' + fmt(U.pmin, 1) + ' D a ' + fmt(U.pmax, 1) + ' D → ' + (ok ? 'arriba: nítid' : 'no hi arriba: borrós');
  $('d3e3').textContent = D3.t === 1 ? 'ulleres per a miopia: f′ = −PR = −0,50 m → P = −2,0 D' : D3.t === 2 ? 'ulleres per a hipermetropia: 1/f′ = 1/(−1,00) − 1/(−0,25) → P = +3,0 D' : 'l\'ull normal no necessita ulleres';
}
register($('c3'), () => {}, () => { drawUll(); texts3(); });
}

/* ---------- bucle ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  readTokens();
  demos.forEach(d => { if (d.vis) { d.step(dt); d.draw(); } });
  requestAnimationFrame(frame);
}
readTokens();
requestAnimationFrame(frame);
/* =====================================================
   EXERCICIS
   ===================================================== */
const P = (arr) => '<ol class="parts">' + arr.map(s => '<li>' + s + '</li>').join('') + '</ol>';
const R = s => '<span class="res">' + s + '</span>';
const EX = [
  { g: 1, ti: 'La llum dins l\'aigua',
    q: '<p>Un feix de llum de 600 nm de longitud d\'ona a l\'aire entra a l\'aigua (n = 1,33). Dada: c = 3,00·10<sup>8</sup> m/s.</p>' + P([
      'Calcula la freqüència de la llum.',
      'Calcula la velocitat i la longitud d\'ona dins l\'aigua.',
      'Canvia el color de la llum en entrar a l\'aigua? Justifica-ho.']),
    s: P([
      'f = c/λ<sub>0</sub> = 3,00·10<sup>8</sup>/600·10<sup>−9</sup> = ' + R('5,00·10<sup>14</sup> Hz') + '.',
      'v = c/n = 3,00·10<sup>8</sup>/1,33 = ' + R('2,26·10<sup>8</sup> m/s') + '; λ = λ<sub>0</sub>/n = 600/1,33 = ' + R('451 nm') + ' (també λ = v/f).',
      R('No') + ': el color el fixa la freqüència, que és la de la font i no canvia en canviar de medi. Canvien v i λ.']) },
  { g: 1, ti: 'Llei de Snell: de l\'aire al vidre',
    q: '<p>Un raig de llum arriba des de l\'aire a la superfície plana d\'un vidre (n = 1,50) amb un angle de 30° respecte de la normal.</p>' + P([
      'Calcula l\'angle de reflexió i l\'angle de refracció.',
      'El raig refractat s\'apropa o s\'allunya de la normal? Per què?']),
    s: P([
      'Reflexió: θ<sub>1</sub>′ = θ<sub>1</sub> = ' + R('30°') + '. Snell: 1,00·sin 30° = 1,50·sin θ<sub>2</sub> → sin θ<sub>2</sub> = 0,500/1,50 = 0,333 → ' + R('θ<sub>2</sub> = 19,5°') + '.',
      'S\'' + R('apropa a la normal') + ' (19,5° &lt; 30°) perquè passa a un medi amb índex més gran, on la llum va més lenta.']) },
  { g: 1, ti: 'Angles límit',
    q: '<p>Calcula l\'angle límit per a la llum que surt cap a l\'aire des de:</p>' + P([
      'l\'aigua (n = 1,33);',
      'un vidre (n = 1,50);',
      'Hi ha angle límit per a la llum que va de l\'aire a l\'aigua? Justifica-ho.']),
    s: P([
      'sin θ<sub>L</sub> = 1,00/1,33 = 0,752 → ' + R('θ<sub>L</sub> = 48,8°') + '.',
      'sin θ<sub>L</sub> = 1,00/1,50 = 0,667 → ' + R('θ<sub>L</sub> = 41,8°') + '.',
      R('No') + ': cap a un medi amb n més gran el raig s\'apropa a la normal, i per a qualsevol angle d\'incidència sin θ<sub>2</sub> = sin θ<sub>1</sub>/1,33 &lt; 1. Sempre hi ha raig refractat.']) },
  { g: 1, ti: 'Imatge en una lent convergent',
    q: '<p>Un objecte de 2,0 cm d\'alçària és a 30 cm davant d\'una lent convergent de 10 cm de distància focal.</p>' + P([
      'Calcula la posició de la imatge.',
      'Calcula l\'augment lateral i la mida de la imatge.',
      'Descriu la imatge i calcula la potència de la lent.']),
    s: P([
      's = −0,30 m, f′ = 0,10 m: 1/s′ = 1/f′ + 1/s = 10,0 − 3,33 = 6,67 m<sup>−1</sup> → ' + R('s′ = +0,15 m') + ' (15 cm a la dreta de la lent).',
      'β = s′/s = 0,15/(−0,30) = ' + R('−0,50') + '; y′ = β·y = −0,50·2,0 = ' + R('−1,0 cm') + '.',
      'Imatge ' + R('real, invertida i la meitat de gran') + ' (l\'objecte és més enllà de 2F). P = 1/f′ = 1/0,10 = ' + R('10 D') + '.']) },
  { g: 1, ti: 'Ulleres per a un miop',
    q: '<p>Una persona miop té el punt remot a 50 cm dels ulls. Considera les ulleres enganxades a l\'ull.</p>' + P([
      'Quin tipus de lent necessita per veure-hi bé de lluny?',
      'Calcula\'n la distància focal i la potència.']),
    s: P([
      'Una lent ' + R('divergent') + ': l\'ull miop convergeix massa i cal obrir els raigs abans que hi entrin.',
      'Un objecte a l\'infinit (s = −∞) ha de tenir la imatge al punt remot (s′ = −0,50 m): 1/f′ = 1/s′ − 1/s = 1/(−0,50) − 0 → ' + R('f′ = −0,50 m') + '; P = 1/f′ = ' + R('−2,0 D') + '.']) },
  { g: 2, ti: 'Una llum al fons d\'una piscina',
    q: '<p>Al fons d\'una piscina de 1,5 m de fondària hi ha un focus de llum petit. L\'aigua té n = 1,33.</p>' + P([
      'Un raig arriba a la superfície amb un angle de 30° respecte de la normal. Amb quin angle surt a l\'aire?',
      'A partir de quin angle d\'incidència els raigs ja no surten?',
      'Calcula el radi del cercle il·luminat que es veu a la superfície.']),
    s: P([
      '1,33·sin 30° = 1,00·sin θ → sin θ = 0,665 → ' + R('θ = 41,7°') + ' (s\'allunya de la normal).',
      'Angle límit: sin θ<sub>L</sub> = 1/1,33 → ' + R('θ<sub>L</sub> = 48,8°') + '. Amb angles més grans hi ha reflexió total.',
      'Els raigs que surten arriben a la superfície a una distància horitzontal r ≤ h·tan θ<sub>L</sub> = 1,5·tan 48,8° = ' + R('1,71 m') + ' de la vertical del focus.']) },
  { g: 2, ti: 'Fibra òptica: angle d\'acceptació',
    q: '<p>Una fibra òptica té un nucli d\'índex n<sub>1</sub> = 1,50 i un revestiment d\'índex n<sub>2</sub> = 1,46. La llum hi entra des de l\'aire per l\'extrem, que és perpendicular a l\'eix.</p>' + P([
      'Calcula l\'angle límit a la superfície nucli–revestiment.',
      'Quin és l\'angle màxim amb l\'eix amb què pot entrar la llum perquè quedi guiada per reflexió total?']),
    s: P([
      'sin θ<sub>L</sub> = n<sub>2</sub>/n<sub>1</sub> = 1,46/1,50 = 0,973 → ' + R('θ<sub>L</sub> = 76,7°') + '.',
      'A la paret l\'angle ha de ser com a mínim θ<sub>L</sub>, i per tant dins el nucli el raig pot formar com a màxim 90° − 76,7° = 13,3° amb l\'eix. A l\'entrada: 1,00·sin φ = 1,50·sin 13,3° = 0,344 → ' + R('φ<sub>màx</sub> = 20,1°') + '.']) },
  { g: 2, ti: 'Imatge en una lent divergent',
    q: '<p>Un objecte de 3,0 cm és a 30 cm d\'una lent divergent de distància focal f′ = −15 cm.</p>' + P([
      'On es forma la imatge? Quina mida té?',
      'Descriu-la i explica com es veu en un diagrama de raigs.']),
    s: P([
      '1/s′ = 1/f′ + 1/s = 1/(−0,15) + 1/(−0,30) = −10,0 m<sup>−1</sup> → ' + R('s′ = −0,10 m') + '. β = s′/s = (−0,10)/(−0,30) = 0,33 → ' + R('y′ = 1,0 cm') + '.',
      'Imatge ' + R('virtual, dreta i més petita') + ', 10 cm a l\'esquerra de la lent. Al diagrama, els raigs surten de la lent separant-se; la imatge és on es tallen les seves prolongacions cap enrere, entre F′ i la lent.']) },
  { g: 2, ti: 'Una lupa',
    q: '<p>Una lupa és una lent convergent de 5,0 cm de distància focal. Volem veure la imatge d\'un segell a 25 cm de l\'ull, que és enganxat a la lupa.</p>' + P([
      'A quina distància de la lupa hem de posar el segell?',
      'Quant augmenta la lupa? Com és la imatge?']),
    s: P([
      'La imatge ha de ser virtual a 25 cm: s′ = −0,25 m. 1/s = 1/s′ − 1/f′ = −4,0 − 20 = −24 m<sup>−1</sup> → ' + R('s = −0,042 m') + ' (4,2 cm, entre el focus i la lent).',
      'β = s′/s = (−0,25)/(−0,042) = ' + R('6,0') + ': la imatge és ' + R('virtual, dreta i 6 vegades més gran') + '.']) },
  { g: 2, ti: 'Ulleres per llegir',
    q: '<p>Una persona hipermetrop té el punt pròxim a 1,00 m i vol llegir un llibre a 25 cm. Considera les ulleres enganxades a l\'ull.</p>' + P([
      'Quina imatge ha de fer la lent del llibre?',
      'Calcula la potència de les ulleres.']),
    s: P([
      'Una imatge ' + R('virtual al punt pròxim') + ', a 1,00 m davant de l\'ull, que és on l\'ull sí que pot enfocar: s = −0,25 m i s′ = −1,00 m.',
      '1/f′ = 1/s′ − 1/s = 1/(−1,00) − 1/(−0,25) = −1,0 + 4,0 = 3,0 m<sup>−1</sup> → ' + R('P = +3,0 D') + ' (lent convergent, f′ = 33 cm).']) },
  { g: 2, ti: 'Mirall còncau',
    q: '<p>Un mirall còncau té un radi de curvatura de 40 cm. Posem un objecte de 2,0 cm a 30 cm del mirall.</p>' + P([
      'Calcula la distància focal i la posició de la imatge.',
      'Calcula\'n la mida i descriu-la.']),
    s: P([
      'Còncau: R = −0,40 m → f = R/2 = ' + R('−0,20 m') + '. 1/s′ = 1/f − 1/s = 1/(−0,20) − 1/(−0,30) = −5,00 + 3,33 = −1,67 m<sup>−1</sup> → ' + R('s′ = −0,60 m') + '.',
      'β = −s′/s = −(−0,60)/(−0,30) = −2,0 → ' + R('y′ = −4,0 cm') + '. Com que s′ &lt; 0, la imatge és davant del mirall: ' + R('real, invertida i el doble de gran') + ' (l\'objecte és entre F i C).']) }
];
const GROUPS = {
  1: ['★', 'Aplicació directa'],
  2: ['★★', 'Combinació de conceptes']
};
(function render() {
  const box = $('exlist'); if (!box) return;
  let n = 0, html = '';
  [1, 2].filter(g => EX.some(e => e.g === g)).forEach(g => {
    html += '<div class="exgroup" id="nivell-' + g + '"><h3><span class="stars">' + GROUPS[g][0] + '</span>' + GROUPS[g][1] + '</h3>';
    EX.filter(e => e.g === g).forEach(e => {
      n++;
      html += '<article class="panel ex" id="ex-' + n + '"><div class="eh"><span class="num">' + n + '.</span><h4 class="ttl">' + e.ti + '</h4><a class="perma" href="#ex-' + n + '" aria-label="Enllaç directe a aquest exercici" title="Copia l\'enllaç d\'aquest exercici">#</a>' + (e.src ? (e.link ? '<a class="chip" href="' + e.link + '" target="_blank" rel="noopener" title="Enunciat original">' + e.src + '</a>' : '<span class="chip">' + e.src + '</span>') : '') + '</div>' +
        e.q +
        '<details class="sol"><summary>Solució</summary><div class="body">' + e.s + '</div></details></article>';
    });
    html += '</div>';
  });
  box.innerHTML = html || '<p class="pendent">Exercicis graduats pendents. De moment, els problemes de les PAU.</p>';
  // els problemes de les PAU (bloc #pau, generat) continuen la numeració
  document.querySelectorAll('#pau .ex .num').forEach(e => { e.textContent = (++n) + '.'; });
})();

/* ---------- navegació: secció actual ---------- */
/* enllaç a la portada només quan la pàgina és dins del lloc web del curs */

/* ---------- subíndex de la teoria i botons cap a les demos ---------- */
(function blocks() {
  const smooth = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const go = t => { if (!t) return; t.scrollIntoView({ behavior: smooth(), block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); };
  document.querySelectorAll('.subidx a[href^="#"], a.godemo[href^="#"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(document.querySelector(a.getAttribute('href'))); }));
  document.querySelectorAll('button.godemo').forEach(b => b.addEventListener('click', () => go(document.querySelectorAll('#demos .demo')[+b.dataset.demo])));
})();

(function nav() {
  const navEl = document.querySelector('nav.toc');
  const links = [...navEl.querySelectorAll('a[href^="#"]:not(.top)')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href')));
  const smooth = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  let cur = -1;
  function update() {
    const line = navEl.getBoundingClientRect().bottom + window.innerHeight * 0.25;
    let idx = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= line) idx = i; });
    // al final de la pàgina, l'última secció
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = secs.length - 1;
    if (idx === cur) return;
    cur = idx;
    links.forEach((a, i) => a.setAttribute('aria-current', i === idx ? 'true' : 'false'));
    const a = links[idx];
    if (a) { const l = a.offsetLeft - 12, r = a.offsetLeft + a.offsetWidth + 12;
      if (l < navEl.scrollLeft || r > navEl.scrollLeft + navEl.clientWidth) navEl.scrollTo({ left: Math.max(0, l - 40), behavior: smooth() }); }
  }
  let pend = false;
  window.addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; update(); }); } }, { passive: true });
  window.addEventListener('resize', update);
  navEl.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    e.preventDefault();
    if (a.classList.contains('top')) { window.scrollTo({ top: 0, behavior: smooth() }); return; }
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { t.scrollIntoView({ behavior: smooth(), block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  });
  update();
})();


/* ---------- navegació dins de cada secció (barra superior o lateral) ---------- */
(function secnav() {
  const bar = $('topbar'), sn = $('secnav');
  const setH = () => document.documentElement.style.setProperty('--navh', Math.round(bar.getBoundingClientRect().height) + 'px');
  if ('ResizeObserver' in window) new ResizeObserver(setH).observe(bar); setH();
  const txt = el => el ? el.textContent.trim() : '';
  const SECS = [
    { id: 'teoria', t: 'Teoria', items: () => [...document.querySelectorAll('#teoria .tblock')].map(b => ({ id: b.id, t: txt(b.querySelector('.bn')) + ' · ' + txt(b.querySelector('h3')) })) },
    { id: 'demos', t: 'Demos', items: () => [...document.querySelectorAll('#demos .demo')].map(d => ({ id: d.id, t: txt(d.querySelector('.hd h3')).replace(/:.*$/, '') })) },
    { id: 'metode', t: 'Com atacar un problema', items: () => [{ id: 'metode', t: 'Passos' }, { id: 'llegir', t: 'Llegir una equació' }, { id: 'exemple', t: 'Exemple resolt' }] },
    { id: 'exercicis', t: 'Exercicis', groups: true }
  ];
  let cur = null, links = [], pinned = null;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => addEventListener(ev, e => { if (!sn.contains(e.target)) pinned = null; }, { passive: true }));
  function build(sec) {
    let h = '<span class="sn-t">' + sec.t + '</span>';
    if (sec.groups) {
      document.querySelectorAll('#exercicis .exgroup').forEach(g => {
        const st = txt(g.querySelector('.stars')), name = txt(g.querySelector('h3')).replace(st, '').trim();
        const exs = [...g.querySelectorAll('.ex')];
        // amb molts exercicis (els problemes de les PAU), només l'enllaç al grup: els números no hi cabrien
        h += '<div class="sn-g"><a class="sn-gl" href="#' + g.id + '" title="' + name + '"><span>' + st + '</span>' + name + '</a><div class="sn-nums">' +
          (exs.length > 12 ? [] : exs).map(e => '<a href="#' + e.id + '" title="' + txt(e.querySelector('.ttl')) + '">' + txt(e.querySelector('.num')).replace('.', '') + '</a>').join('') + '</div></div>';
      });
    } else {
      sec.items().forEach(it => { h += '<a href="#' + it.id + '">' + it.t + '</a>'; });
    }
    sn.innerHTML = h;
    links = [...sn.querySelectorAll('a[href^="#"]')].map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) })).filter(x => x.el);
  }
  function update() {
    const line = bar.getBoundingClientRect().bottom + Math.min(160, innerHeight * 0.25);
    let sec = null;
    SECS.forEach(x => { const el = $(x.id); if (el && el.getBoundingClientRect().top <= line) sec = x; });
    if (sec !== cur) { cur = sec; if (sec) { build(sec); sn.classList.add('on'); } else { sn.innerHTML = ''; sn.classList.remove('on'); } setH(); }
    if (!sec) return;
    let act = null;
    // els elements amagats (p. ex. problemes que el filtre per nivell no mostra) no tenen posició: no compten
    links.forEach(x => { if (x.el.getClientRects().length && x.el.getBoundingClientRect().top <= line) act = x; });
    if (pinned) { const pl = links.find(x => x.a.getAttribute('href') === pinned); if (pl) act = pl; }
    // a exercicis, marca el número i el seu nivell
    links.forEach(x => x.a.setAttribute('aria-current', 'false'));
    if (act) {
      act.a.setAttribute('aria-current', 'true');
      if (cur.groups && !act.a.classList.contains('sn-gl')) { const g = act.el.closest('.exgroup'); const gl = g && sn.querySelector('a[href="#' + g.id + '"]'); if (gl) gl.setAttribute('aria-current', 'true'); }
      if (!matchMedia('(min-width:1600px)').matches) { const l = act.a.offsetLeft - 16, r = act.a.offsetLeft + act.a.offsetWidth + 16; if (l < sn.scrollLeft || r > sn.scrollLeft + sn.clientWidth) sn.scrollLeft = Math.max(0, l - 40); }
    }
  }
  sn.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    pinned = a.getAttribute('href');
    t.scrollIntoView({ behavior: smooth, block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
    if (t.matches('.ex, .tblock, .demo')) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
    update();
  });
  let pend = false;
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; update(); }); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();

})();

/* Enllaç directe a un problema o exercici: copia l'URL amb l'ancora i en confirma la còpia. */
document.addEventListener('click', function (ev) {
  var a = ev.target.closest && ev.target.closest('a.perma');
  if (!a || !navigator.clipboard || location.protocol.indexOf('http') !== 0) return;
  var url = location.origin + location.pathname + a.getAttribute('href');
  navigator.clipboard.writeText(url).then(function () {
    var t = a.title, l = a.getAttribute('aria-label');
    a.classList.add('copiat'); a.textContent = '\u2713'; a.title = 'Enlla\u00e7 copiat'; a.setAttribute('aria-label', 'Enlla\u00e7 copiat');
    setTimeout(function () { a.classList.remove('copiat'); a.textContent = '#'; a.title = t; a.setAttribute('aria-label', l); }, 1600);
  }, function () {});
});

/* Compartir i contacte. Només enllaços normals: cap script ni galeta de tercers. */
(function () {
  var USUARI = 'nilmunte', DOMINI = 'gmail.com';
  var adreca = function () { return USUARI + '@' + DOMINI; };
  var canon = function () { var l = document.querySelector('link[rel="canonical"]'); return (l && l.href) || location.href.split('#')[0]; };

  /* adreça de correu visible (muntada aquí perquè no surti tal qual al codi font) */
  document.querySelectorAll('[data-mail]').forEach(function (e) {
    var a = document.createElement('a'); a.href = 'mailto:' + adreca(); a.textContent = adreca(); e.appendChild(a);
    if (e.parentNode && e.parentNode.hidden) e.parentNode.hidden = false;
  });

  /* «Error o dubte»: obre el correu amb l'assumpte i la pàgina (o el problema) ja posats */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a.report');
    if (!a) return;
    ev.preventDefault();
    var ref = a.getAttribute('data-ref');
    var url = canon() + (ref ? '#' + ref : '');
    var assumpte = 'Física 2n BAT · ' + (ref ? 'problema ' + ref.replace(/^pau-/, 'PAU ') : document.title);
    var cos = 'Pàgina: ' + url + '\n\nEscriu aquí l\'error, el suggeriment o el dubte:\n\n';
    location.href = 'mailto:' + adreca() + '?subject=' + encodeURIComponent(assumpte) + '&body=' + encodeURIComponent(cos);
  });

  /* botó «Comparteix» */
  var ICONA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
  document.querySelectorAll('[data-share]').forEach(function (el) {
    el.hidden = false; el.classList.add('share');
    el.innerHTML = '<button type="button" class="sharebtn" aria-expanded="false">' + ICONA + '<span class="st">Comparteix</span></button><div class="sharemenu" role="group" aria-label="Comparteix a" hidden></div>';
    var btn = el.querySelector('.sharebtn'), menu = el.querySelector('.sharemenu');
    function tanca(tornaFoco) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (tornaFoco) btn.focus(); }
    function obre() {
      var u = canon(), t = document.title, e = encodeURIComponent;
      var xarxes = [
        ['WhatsApp', 'https://wa.me/?text=' + e(t + ' ' + u)],
        ['Telegram', 'https://t.me/share/url?url=' + e(u) + '&text=' + e(t)],
        ['X', 'https://twitter.com/intent/tweet?url=' + e(u) + '&text=' + e(t)],
        ['Bluesky', 'https://bsky.app/intent/compose?text=' + e(t + ' ' + u)],
        ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(u)]
      ];
      menu.innerHTML = xarxes.map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener noreferrer">' + x[0] + '</a>'; }).join('') +
        '<div class="sep"></div><button type="button" data-copia>Copia l\'enllaç</button>';
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
      var rb = btn.getBoundingClientRect();
      if (rb.left + menu.offsetWidth <= window.innerWidth - 8) { menu.style.left = '0'; menu.style.right = 'auto'; }
      else { menu.style.left = 'auto'; menu.style.right = '0'; }
      menu.querySelector('[data-copia]').addEventListener('click', function (ev) {
        var b = ev.currentTarget;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(u).then(function () { b.textContent = 'Enllaç copiat ✓'; setTimeout(function () { tanca(true); }, 900); }, function () {});
      });
    }
    btn.addEventListener('click', function () {
      /* al mòbil, el menú de compartir del sistema (hi surten Instagram, WhatsApp, Telegram…) */
      if (navigator.share && window.matchMedia && matchMedia('(pointer: coarse)').matches) {
        navigator.share({ title: document.title, url: canon() }).catch(function () {});
        return;
      }
      if (menu.hidden) obre(); else tanca(false);
    });
    document.addEventListener('click', function (ev) { if (!menu.hidden && !el.contains(ev.target)) tanca(false); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !menu.hidden) tanca(true); });
  });
})();

/* en arribar d'una altra pàgina amb una àncora (p. ex. ../#demos), el JavaScript canvia l'alçada del que hi ha
   a sobre després del salt del navegador: s'hi torna a anar quan la pàgina ja és completa */
if (location.hash && !location.hash.startsWith('#pau-')) addEventListener('load', () => {
  const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (t) t.scrollIntoView({ behavior: 'instant', block: 'start' });
});
