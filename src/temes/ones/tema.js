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
   DEMO 1 · ona transversal i ona longitudinal
   ===================================================== */
const D0 = { A: 0.2, l: 2, f: 0.5, p: 2.5, t: 0, play: true, speed: 1, arr: true, cd: true };
const XMAX0 = 6, FILES0 = 5;
const d0 = () => ({ w: 2 * PI * D0.f, k: 2 * PI / D0.l, T: 1 / D0.f, v: D0.l * D0.f });
const s0 = (x, t) => { const { w, k } = d0(); return D0.A * Math.sin(w * t - k * x); };
const wrap0 = () => { const T = 1 / D0.f; D0.t = ((D0.t % (2 * T)) + 2 * T) % (2 * T); };
bind('d0A', 'd0An', D0, 'A', 0.05, 0.3);
bind('d0l', 'd0ln', D0, 'l', 1, 4);
bind('d0f', 'd0fn', D0, 'f', 0.1, 1, wrap0);
bind('d0p', 'd0pn', D0, 'p', 0.5, 5.5);
segBind('d0seg', 'v', D0, 'speed');
$('d0arr').onchange = e => { D0.arr = e.target.checked; };
$('d0cd').onchange = e => { D0.cd = e.target.checked; };
$('d0play').onclick = () => { D0.play = !D0.play; };
$('d0reset').onclick = () => { D0.t = 0; };
$('d0scrub').addEventListener('input', e => { D0.t = +e.target.value; D0.play = false; });
scrubGuard('d0scrub');
function step0(dt) { if (!D0.play) return; D0.t += dt * D0.speed; const T = 1 / D0.f; if (D0.t >= 2 * T) D0.t -= 2 * T; }

function n0(W) { return W < 520 ? 25 : 41; }   // menys partícules en pantalles estretes
function drawTL0() {
  const { c, W, H } = fit($('c0'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const estret = W < 520, ml = 22, mr = 22, sx = (W - ml - mr) / XMAX0;   // mateixa escala en x i en y (m → px)
  const X = x => ml + x * sx;
  const t = D0.t, { w, k } = d0(), N = n0(W), dx = XMAX0 / (N - 1);
  const marc = Math.round(D0.p / dx), xm = marc * dx;
  const rT = Math.max(4, D0.A * sx);                       // amplitud a la pantalla
  // ---- disposició vertical: [títol][λ][ona transversal] | [títol][C/D][files][oscil·lació][escala]
  const top1 = 8, yT = top1 + 22 + Math.max(18, rT) + 4 + rT;
  const hT = yT + rT + 16;
  const top2 = hT + 8, yCD = top2 + 30, escH = 16, oscH = D0.arr ? 22 : 6;
  const gapL = Math.max(8, Math.min(20, (H - escH - oscH - yCD - 12) / (FILES0 - 1)));
  const yL = j => yCD + 10 + j * gapL;
  const yFi = yL(FILES0 - 1);
  // si sobra alçada, el conjunt de les dues ones es centra verticalment (l'escala queda a baix)
  const oy = Math.max(0, (H - escH - 8 - (yFi + oscH)) / 2);
  c.save(); c.translate(0, oy);
  // títols i propagació, a la mateixa línia
  c.font = '600 13px ' + FB; c.fillStyle = TK.ink; c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillText('Transversal', ml, top1); c.fillText('Longitudinal', ml, top2);
  c.strokeStyle = TK.line; c.lineWidth = 1; c.beginPath(); c.moveTo(ml, hT + .5); c.lineTo(W - mr, hT + .5); c.stroke();
  if (D0.arr) {
    [top1 + 8, top2 + 8].forEach(yy => {
      const ax = W - mr - 46;
      arrow(c, ax, yy, ax + 42, yy, TK.f, 2.2);
      if (!estret) { c.fillStyle = TK.f; c.font = '12px ' + FB; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('propagació', ax - 6, yy); }
    });
  }
  // ---- transversal
  c.strokeStyle = TK.grid2; c.beginPath(); c.moveTo(ml, yT + .5); c.lineTo(W - mr, yT + .5); c.stroke();
  c.strokeStyle = TK.muted; c.globalAlpha = 0.45; c.lineWidth = 1.2; curve(c, x => s0(x, t), 0, XMAX0, X, y => yT - y * sx, 300); c.stroke(); c.globalAlpha = 1;
  const rp = estret ? 3.2 : 4;
  for (let i = 0; i < N; i++) {
    const x = i * dx, m = i === marc;
    c.fillStyle = m ? TK.x : TK.ball; c.beginPath(); c.arc(X(x), yT - s0(x, t) * sx, m ? 6.5 : rp, 0, 7); c.fill();
  }
  // λ entre dues crestes
  const xc = ((((w * t - PI / 2) / k) % D0.l) + D0.l) % D0.l;
  if (xc + D0.l <= XMAX0) {
    const yy = yT - rT - 12;
    arrow(c, X(xc) + 2, yy, X(xc + D0.l) - 2, yy, TK.muted, 1.1); arrow(c, X(xc + D0.l) - 2, yy, X(xc) + 2, yy, TK.muted, 1.1);
    c.fillStyle = TK.ink; c.font = 'italic 500 14px ' + FB; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText('λ', X(xc + D0.l / 2), yy - 2);
  }
  // ---- longitudinal: compressions (fase ω·t − k·x = 0) i dilatacions (= π)
  if (D0.cd) {
    c.font = '600 12px ' + FB; c.textAlign = 'center'; c.textBaseline = 'bottom';
    for (let n = -3; n <= 8; n++) {
      [[0, 'C', TK.y], [PI, 'D', TK.muted]].forEach(([ph, lab, col]) => {
        const x = (w * t - ph) / k + n * D0.l;
        if (x < 0.05 || x > XMAX0 - 0.05) return;
        if (lab === 'C') { c.fillStyle = col; c.globalAlpha = 0.13; c.fillRect(X(x) - sx * D0.l * 0.12, yL(0) - 8, sx * D0.l * 0.24, yFi - yL(0) + 16); c.globalAlpha = 1; }
        c.fillStyle = col; c.fillText(lab, X(x), yCD);
      });
    }
  }
  const rl = estret ? 2.8 : 3.6;
  for (let j = 0; j < FILES0; j++) {
    for (let i = 0; i < N; i++) {
      const x = i * dx, m = i === marc && j === (FILES0 - 1) / 2;
      c.fillStyle = m ? TK.y : TK.ball; c.beginPath(); c.arc(X(x + s0(x, t)), yL(j), m ? 6 : rl, 0, 7); c.fill();
    }
  }
  // posició d'equilibri de les partícules marcades
  c.strokeStyle = TK.muted; c.lineWidth = 1; c.save(); c.setLineDash([2, 3]);
  c.beginPath(); c.moveTo(X(xm) + .5, yT - rT - 4); c.lineTo(X(xm) + .5, yT + rT + 4);
  c.moveTo(X(xm) + .5, yL(0) - 8); c.lineTo(X(xm) + .5, yFi + 8); c.stroke(); c.restore();
  // fletxes d'oscil·lació
  if (D0.arr) {
    const xa = X(xm) + 12;
    arrow(c, xa, yT - rT, xa, yT + rT, TK.x, 1.4); arrow(c, xa, yT + rT, xa, yT - rT, TK.x, 1.4);
    const yo = yFi + 14;
    arrow(c, X(xm - D0.A), yo, X(xm + D0.A), yo, TK.x, 1.4); arrow(c, X(xm + D0.A), yo, X(xm - D0.A), yo, TK.x, 1.4);
    if (!estret) {
      c.fillStyle = TK.x; c.font = '11px ' + FB; c.textBaseline = 'middle';
      c.textAlign = 'left'; c.fillText('oscil·lació', xa + 6, yT);
      c.fillText('oscil·lació', X(xm + D0.A) + 6, yo);
    }
  }
  c.restore();
  // escala horitzontal
  c.font = '10.5px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'bottom';
  for (let x = 0; x < XMAX0; x++) c.fillText(x, X(x), H - 3);
  c.textAlign = 'right'; c.fillText('6 m', W - 4, H - 3);
}

let key0 = '';
function texts0() {
  const { T, v } = d0(), t = D0.t, dx = XMAX0 / (n0($('c0').getBoundingClientRect().width) - 1), xm = Math.round(D0.p / dx) * dx, s = s0(xm, t);
  const key = [D0.A, D0.l, D0.f].join('|');
  if (key !== key0) { key0 = key; $('d0scrub').max = (2 * T).toFixed(3); }
  $('d0rl').textContent = fmt(D0.l) + ' m'; $('d0rT').textContent = fmt(T) + ' s'; $('d0rv').textContent = fmt(v) + ' m/s';
  $('d0ry').textContent = fmt(s, 3) + ' m'; $('d0rs').textContent = fmt(s, 3) + ' m';
  $('d0tout').textContent = 't = ' + fmt(t) + ' s'; setScrub('d0scrub', t);
  $('d0n1').textContent = 'Transversal: la partícula de x = ' + fmt(xm, 1) + ' m és a ' + fmt(s, 3) + ' m de l\'equilibri, en vertical';
  $('d0n2').textContent = 'Longitudinal: la partícula de x = ' + fmt(xm, 1) + ' m és a ' + fmt(s, 3) + ' m de l\'equilibri, en horitzontal';
  $('d0play').textContent = D0.play ? 'Pausa' : 'Continua';
}
register($('c0'), step0, () => { drawTL0(); texts0(); });

/* =====================================================
   DEMO 2 · ona harmònica
   ===================================================== */
const D1 = { A: 0.10, l: 2, f: 0.5, s: 1, p: 1.5, q: 0.5, t: 0, play: true, speed: 1 };
const XMAX1 = 6;
const d1 = () => { const w = 2 * PI * D1.f, k = 2 * PI / D1.l; return { w, k, T: 1 / D1.f, v: D1.l * D1.f }; };
const y1 = (x, t) => { const { w, k } = d1(); return D1.A * Math.sin(w * t - D1.s * k * x); };
const vy1 = (x, t) => { const { w, k } = d1(); return D1.A * w * Math.cos(w * t - D1.s * k * x); };
const wrap1 = () => { const T = 1 / D1.f; D1.t = ((D1.t % (2 * T)) + 2 * T) % (2 * T); };
bind('d1A', 'd1An', D1, 'A', 0.02, 0.2);
bind('d1l', 'd1ln', D1, 'l', 0.5, 4);
bind('d1f', 'd1fn', D1, 'f', 0.1, 2, wrap1);
bind('d1p', 'd1pn', D1, 'p', 0, 6);
bind('d1q', 'd1qn', D1, 'q', 0, 4);
segBind('d1dir', 's', D1, 's');
segBind('d1seg', 'v', D1, 'speed');
$('d1play').onclick = () => { D1.play = !D1.play; };
$('d1reset').onclick = () => { D1.t = 0; };
$('d1scrub').addEventListener('input', e => { D1.t = +e.target.value; D1.play = false; });
scrubGuard('d1scrub');
function step1(dt) { if (!D1.play) return; D1.t += dt * D1.speed; const T = 1 / D1.f; if (D1.t >= 2 * T) D1.t -= 2 * T; }
const q1 = () => Math.min(XMAX1, D1.p + D1.q);

function drawScene1() {
  const { c, W, H } = fit($('c1s'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const ml = 30, mr = 30, yc = H * 0.54, sc = (H * 0.36) / 0.2;
  const X = x => ml + x / XMAX1 * (W - ml - mr), Y = y => yc - y * sc;
  // eixos
  c.strokeStyle = TK.grid2; c.lineWidth = 1; c.beginPath(); c.moveTo(ml, yc + .5); c.lineTo(W - mr, yc + .5); c.stroke();
  c.font = '11px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'top';
  for (let x = 0; x <= XMAX1; x++) { c.beginPath(); c.moveTo(X(x), yc - 3); c.lineTo(X(x), yc + 3); c.stroke(); c.fillText(x, X(x), H - 18); }
  c.textAlign = 'right'; c.fillText('x (m)', W - 4, yc + 8);
  // ona
  const t = D1.t;
  c.strokeStyle = TK.ink; c.lineWidth = 2.4; c.lineJoin = 'round';
  curve(c, x => y1(x, t), 0, XMAX1, X, Y, 300); c.stroke();
  // λ marcada a partir d'una cresta
  const { w, k } = d1();
  let xc = ((D1.s * (w * t - PI / 2) / k) % D1.l + D1.l) % D1.l; // posició d'una cresta
  if (xc + D1.l <= XMAX1) {
    const yy = Y(D1.A) - 16;
    c.strokeStyle = TK.muted; c.lineWidth = 1; c.save(); c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(X(xc), Y(D1.A) - 4); c.lineTo(X(xc), yy - 6); c.moveTo(X(xc + D1.l), Y(D1.A) - 4); c.lineTo(X(xc + D1.l), yy - 6); c.stroke(); c.restore();
    arrow(c, X(xc) + 2, yy, X(xc + D1.l) - 2, yy, TK.muted, 1.2); arrow(c, X(xc + D1.l) - 2, yy, X(xc) + 2, yy, TK.muted, 1.2);
    c.fillStyle = TK.ink; c.font = 'italic 500 14px ' + FB; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText('λ', X(xc + D1.l / 2), yy - 3);
  }
  // sentit de propagació
  const ax = D1.s > 0 ? W - mr - 70 : ml + 70;
  arrow(c, ax, 18, ax + D1.s * 50, 18, TK.f, 2.2);
  c.fillStyle = TK.f; c.font = 'italic 500 14px ' + FB; c.textAlign = D1.s > 0 ? 'right' : 'left'; c.textBaseline = 'middle';
  c.fillText('v', ax - D1.s * 8, 18);
  // punts P i Q
  [[D1.p, 'P', TK.x], [q1(), 'Q', TK.y]].forEach(([x, n, col]) => {
    const yy = y1(x, t);
    c.save(); c.setLineDash([2, 3]); c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(X(x), Y(D1.A) - 2); c.lineTo(X(x), Y(-D1.A) + 2); c.stroke(); c.restore();
    c.fillStyle = col; c.beginPath(); c.arc(X(x), Y(yy), 6, 0, 7); c.fill();
    c.font = '600 13px ' + FB; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(n, X(x) + 9, Y(yy) - 10);
  });
}

function plot1() {
  const { c, W, H } = fit($('c1g'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const T = 1 / D1.f, tMax = 2 * T, t = D1.t, ml = 54, mr = 12, mt = 14, mb = 24;
  const X = tt => ml + tt / tMax * (W - ml - mr), mid = (mt + H - mb) / 2, Y = v => mid - v / (D1.A * 1.15) * ((H - mt - mb) / 2);
  c.lineWidth = 1; c.strokeStyle = TK.grid; c.beginPath();
  for (let q = 0; q <= 8; q++) { const xx = Math.round(X(q * T / 4)) + .5; c.moveTo(xx, mt); c.lineTo(xx, H - mb); } c.stroke();
  c.strokeStyle = TK.grid2; c.beginPath(); [-D1.A, D1.A].forEach(v => { const yy = Math.round(Y(v)) + .5; c.moveTo(ml, yy); c.lineTo(W - mr, yy); }); c.stroke();
  c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(ml, Math.round(mid) + .5); c.lineTo(W - mr, Math.round(mid) + .5); c.moveTo(ml + .5, mt); c.lineTo(ml + .5, H - mb); c.stroke();
  c.font = '10.5px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'right'; c.textBaseline = 'middle';
  c.fillText(fmt(D1.A, 2), ml - 6, Y(D1.A)); c.fillText('0', ml - 6, mid); c.fillText(fmt(-D1.A, 2), ml - 6, Y(-D1.A));
  c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('y (m)', ml + 6, 2);
  [[D1.p, TK.x, 'P'], [q1(), TK.y, 'Q']].forEach(([x, col, n], i) => {
    const f = tt => y1(x, tt);
    c.save(); c.setLineDash([4, 4]); c.globalAlpha = 0.4; c.strokeStyle = col; c.lineWidth = 1.5; curve(c, f, 0, tMax, X, Y); c.stroke(); c.restore();
    if (t > 0) { c.strokeStyle = col; c.lineWidth = 2.2; curve(c, f, 0, t, X, Y, Math.max(8, Math.ceil(160 * t / tMax))); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.arc(X(t), Y(f(t)), 4, 0, 7); c.fill();
    c.font = '600 12px ' + FB; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(n, ml + 60 + i * 26, 2);
  });
  c.strokeStyle = TK.muted; c.save(); c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(t) + .5, mt); c.lineTo(X(t) + .5, H - mb); c.stroke(); c.restore();
  c.font = '10.5px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'top';
  for (let q = 0; q <= 4; q++) c.fillText(fmt(q * T / 2), X(q * T / 2), H - mb + 6);
  c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText('t (s)', W - mr - 2, H - mb - 3);
}

let key1 = '';
function phaseTxt(dphi) {
  const r = ((dphi % (2 * PI)) + 2 * PI) % (2 * PI), e = 0.03;
  if (r < e || 2 * PI - r < e) return ' → en fase';
  if (Math.abs(r - PI) < e) return ' → en oposició de fase';
  return '';
}
function texts1() {
  const { w, k, T, v } = d1(), t = D1.t, sg = D1.s > 0 ? '−' : '+';
  const key = [D1.A, D1.l, D1.f, D1.s].join('|');
  if (key !== key1) {
    key1 = key;
    $('d1eY').textContent = 'y(x, t) = ' + fmtN(D1.A) + '·sin(' + fmt(w) + '·t ' + sg + ' ' + fmt(k) + '·x)   (m)';
    $('d1eK').textContent = 'ω = 2π·f = ' + fmt(w) + ' rad/s   k = 2π/λ = ' + fmt(k) + ' rad/m';
    $('d1eV').textContent = 'v = λ·f = ' + fmtN(D1.l) + '·' + fmtN(D1.f) + ' = ' + fmt(v) + ' m/s = ω/k';
    $('d1scrub').max = (2 * T).toFixed(3);
  }
  const yP = y1(D1.p, t), vP = vy1(D1.p, t), dx = q1() - D1.p, dphi = k * dx;
  $('d1rl').textContent = fmt(D1.l) + ' m'; $('d1rT').textContent = fmt(T) + ' s'; $('d1rv').textContent = fmt(v) + ' m/s';
  $('d1ry').textContent = fmt(yP, 3) + ' m'; $('d1rvy').textContent = fmt(vP) + ' m/s'; $('d1rd').textContent = fmt(dphi) + ' rad';
  $('d1tout').textContent = 't = ' + fmt(t) + ' s'; setScrub('d1scrub', t);
  $('d1n1').textContent = 'y(P) = ' + fmtN(D1.A) + '·sin(' + fmt(w) + '·' + fmt(t) + ' ' + sg + ' ' + fmt(k) + '·' + fmtN(D1.p) + ') = ' + fmt(yP, 3) + ' m';
  $('d1n2').textContent = 'v_y(P) = A·ω·cos(…) = ' + fmt(vP) + ' m/s  (màx. A·ω = ' + fmt(D1.A * w) + ')';
  $('d1n3').textContent = 'Δφ = k·Δx = ' + fmt(k) + '·' + fmt(dx) + ' = ' + fmt(dphi) + ' rad = ' + fmt(dx / D1.l) + '·2π' + phaseTxt(dphi);
  $('d1play').textContent = D1.play ? 'Pausa' : 'Continua';
}
register($('c1s'), step1, () => { drawScene1(); plot1(); texts1(); });

/* =====================================================
   DEMO 3 · interferència de dues fonts
   ===================================================== */
const D2 = { l: 1.5, d: 3, ph: 0, x: 6, y: 1.2, m: 0, lines: true, t: 0, play: true };
const VSO = 340, FVIS = 0.6, YH = 5;
let XW = 10;
bind('d2l', 'd2ln', D2, 'l', 0.5, 3);
bind('d2d', 'd2dn', D2, 'd', 0.5, 6);
const setX2 = bind('d2x', 'd2xn', D2, 'x', 0.5, 10);
const setY2 = bind('d2y', 'd2yn', D2, 'y', -4.5, 4.5);
segBind('d2ph', 'p', D2, 'ph');
segBind('d2view', 'm', D2, 'm');
$('d2lines').onchange = e => D2.lines = e.target.checked;
$('d2play').onclick = () => { D2.play = !D2.play; };
function step2(dt) { if (D2.play) D2.t += dt; }
const geo2 = (W, H) => {
  const ml = 34, mr = 10, mt = 8, mb = 8, sc = (H - mt - mb) / (2 * YH);
  XW = Math.max(6, (W - ml - mr) / sc);
  const ox = ml, oy = H / 2;
  return { sc, X: x => ox + x * sc, Y: y => oy - y * sc, IX: px => (px - ox) / sc, IY: py => (oy - py) / sc };
};
(function drag2() {
  const cv = $('c2f');
  const mv = e => { const r = cv.getBoundingClientRect(), g = geo2(r.width, r.height); setX2(+g.IX(e.clientX - r.left).toFixed(2)); setY2(+g.IY(e.clientY - r.top).toFixed(2)); };
  let on = false;
  cv.addEventListener('pointerdown', e => { on = true; cv.setPointerCapture(e.pointerId); mv(e); });
  cv.addEventListener('pointermove', e => { if (on) mv(e); });
  cv.addEventListener('pointerup', () => on = false); cv.addEventListener('pointercancel', () => on = false);
})();
const hex = h => { h = (h || '#888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const off2 = document.createElement('canvas');
function r12(x, y) { return [Math.hypot(x, y - D2.d / 2), Math.hypot(x, y + D2.d / 2)]; }
function drawField2() {
  const { c, W, H } = fit($('c2f'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const g = geo2(W, H), k = 2 * PI / D2.l, ph = D2.ph ? PI : 0, wt = 2 * PI * FVIS * D2.t;
  // camp a baixa resolució
  const cw = Math.max(40, Math.round((g.X(XW) - g.X(0)) / 3)), ch = Math.max(30, Math.round((g.Y(-YH) - g.Y(YH)) / 3));
  off2.width = cw; off2.height = ch;
  const oc = off2.getContext('2d'), img = oc.createImageData(cw, ch), dta = img.data;
  const bg = hex(TK.surface), cp = hex(TK.y), cn = hex(TK.x), ci = hex(TK.ink);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = (i + .5) / cw * XW, y = YH - (j + .5) / ch * 2 * YH;
    const [a, b] = r12(x, y);
    let v, col;
    if (D2.m === 0) { v = (Math.sin(wt - k * a) + Math.sin(wt - k * b + ph)) / 2; col = v > 0 ? cp : cn; v = Math.abs(v); }
    else { v = Math.abs(Math.cos((k * (a - b) - ph) / 2)); col = ci; }
    const o = (j * cw + i) * 4, s = 0.85 * v;
    dta[o] = bg[0] + (col[0] - bg[0]) * s; dta[o + 1] = bg[1] + (col[1] - bg[1]) * s; dta[o + 2] = bg[2] + (col[2] - bg[2]) * s; dta[o + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true; c.drawImage(off2, g.X(0), g.Y(YH), g.X(XW) - g.X(0), g.Y(-YH) - g.Y(YH));
  // línies nodals: Δr = (m + ½)λ (en fase) o mλ (oposició), hipèrboles
  if (D2.lines) {
    c.strokeStyle = TK.ink; c.lineWidth = 1.2; c.save(); c.setLineDash([5, 4]); c.globalAlpha = 0.7;
    for (let m = -20; m <= 20; m++) {
      const dr = (D2.ph ? m : m + 0.5) * D2.l;
      if (Math.abs(dr) >= D2.d) continue;
      c.beginPath(); let first = true;
      for (let s = 0; s <= 200; s++) {
        // paràmetre: x de 0 a XW; resolem y amb Δr fix (b − a = dr): bisecció
        const x = s / 200 * XW;
        let lo = -YH * 3, hi = YH * 3;
        const F = y => { const [a, b] = r12(x, y); return b - a - dr; };
        if (F(lo) * F(hi) > 0) { first = true; continue; }
        for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; if (F(lo) * F(mid) <= 0) hi = mid; else lo = mid; }
        const y = (lo + hi) / 2;
        if (Math.abs(y) > YH) { first = true; continue; }
        if (first) { c.moveTo(g.X(x), g.Y(y)); first = false; } else c.lineTo(g.X(x), g.Y(y));
      }
      c.stroke();
    }
    c.restore();
  }
  // fonts
  [[D2.d / 2, 'S₁'], [-D2.d / 2, 'S₂']].forEach(([y, n]) => {
    c.fillStyle = TK.ink; c.fillRect(g.X(0) - 10, g.Y(y) - 7, 10, 14);
    c.font = '600 12px ' + FB; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(n, g.X(0) - 13, g.Y(y));
  });
  // P i distàncies
  const px = g.X(D2.x), py = g.Y(D2.y);
  c.strokeStyle = TK.ink; c.lineWidth = 1.4;
  [[D2.d / 2, 'r₁'], [-D2.d / 2, 'r₂']].forEach(([y, n]) => {
    c.beginPath(); c.moveTo(g.X(0), g.Y(y)); c.lineTo(px, py); c.stroke();
    c.fillStyle = TK.ink; c.font = 'italic 500 13px ' + FB; c.textAlign = 'center'; c.textBaseline = 'middle';
    const mx = (g.X(0) + px) / 2, my = (g.Y(y) + py) / 2;
    c.fillStyle = TK.surface; c.fillRect(mx - 11, my - 9, 22, 18); c.fillStyle = TK.ink; c.fillText(n, mx, my);
  });
  c.fillStyle = TK.surface; c.strokeStyle = TK.ink; c.lineWidth = 2.5; c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill(); c.stroke();
  c.fillStyle = TK.ink; c.font = '600 13px ' + FB; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('P', px + 9, py - 6);
  // escala
  c.fillStyle = TK.muted; c.font = '10.5px ' + FM; c.textAlign = 'left'; c.textBaseline = 'bottom';
  c.fillRect(g.X(XW) - 12 - g.sc, g.Y(-YH) - 8, g.sc, 2); c.fillText('1 m', g.X(XW) - 12 - g.sc, g.Y(-YH) - 12);
}
function plot2() {
  const { c, W, H } = fit($('c2g'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const k = 2 * PI / D2.l, ph = D2.ph ? PI : 0, [a, b] = r12(D2.x, D2.y), Tv = 1 / FVIS, tMax = 2 * Tv;
  const t = D2.t % tMax, ml = 40, mr = 70, mt = 8, mb = 8, mid = H / 2, Y = v => mid - v / 2.2 * (H - mt - mb) / 2, X = tt => ml + tt / tMax * (W - ml - mr);
  const fs = [[tt => Math.sin(2 * PI * FVIS * tt - k * a), TK.x, 1.6, 'y₁'], [tt => Math.sin(2 * PI * FVIS * tt - k * b + ph), TK.y, 1.6, 'y₂'], [tt => Math.sin(2 * PI * FVIS * tt - k * a) + Math.sin(2 * PI * FVIS * tt - k * b + ph), TK.ink, 2.6, 'y₁ + y₂']];
  c.strokeStyle = TK.muted; c.lineWidth = 1; c.beginPath(); c.moveTo(ml, mid + .5); c.lineTo(W - mr, mid + .5); c.stroke();
  c.strokeStyle = TK.grid2; c.beginPath(); [2, -2].forEach(v => { c.moveTo(ml, Math.round(Y(v)) + .5); c.lineTo(W - mr, Math.round(Y(v)) + .5); }); c.stroke();
  c.font = '10.5px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('2A', ml - 6, Y(2)); c.fillText('0', ml - 6, mid); c.fillText('−2A', ml - 6, Y(-2));
  fs.forEach(([f, col, w, n], i) => {
    c.strokeStyle = col; c.lineWidth = w; if (i < 2) { c.save(); c.setLineDash([5, 4]); }
    curve(c, f, 0, tMax, X, Y, 200); c.stroke(); if (i < 2) c.restore();
    c.fillStyle = col; c.font = (i === 2 ? '600 ' : '') + '12px ' + FB; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(n, W - mr + 8, mt + 12 + i * 18);
  });
  c.strokeStyle = TK.muted; c.save(); c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(t) + .5, mt); c.lineTo(X(t) + .5, H - mb); c.stroke(); c.restore();
}
function texts2() {
  const [a, b] = r12(D2.x, D2.y), dr = Math.abs(a - b), q = dr / D2.l, k = 2 * PI / D2.l;
  const amp = Math.abs(2 * Math.cos((k * (a - b) - (D2.ph ? PI : 0)) / 2));
  $('d2r1').textContent = fmt(a) + ' m'; $('d2r2').textContent = fmt(b) + ' m'; $('d2dr').textContent = fmt(dr) + ' m';
  $('d2q').textContent = fmt(q); $('d2f').textContent = fmt(VSO / D2.l, 0) + ' Hz'; $('d2a').textContent = fmt(amp) + '·A';
  const frac = q - Math.floor(q), nearInt = Math.min(frac, 1 - frac) < 0.04, nearHalf = Math.abs(frac - 0.5) < 0.04;
  let tipus = 'intermèdia';
  if (nearInt) tipus = D2.ph ? 'destructiva (silenci)' : 'constructiva (so fort)';
  if (nearHalf) tipus = D2.ph ? 'constructiva (so fort)' : 'destructiva (silenci)';
  $('d2n1').textContent = 'Δr = |r₁ − r₂| = |' + fmt(a) + ' − ' + fmt(b) + '| = ' + fmt(dr) + ' m';
  $('d2n2').textContent = 'Δr/λ = ' + fmt(dr) + '/' + fmtN(D2.l) + ' = ' + fmt(q) + '   (fonts ' + (D2.ph ? 'en oposició' : 'en fase') + ')';
  $('d2n3').textContent = 'Interferència ' + tipus + ': amplitud ' + fmt(amp) + '·A';
  $('d2play').textContent = D2.play ? 'Pausa' : 'Continua';
}
register($('c2f'), step2, () => { drawField2(); plot2(); texts2(); });

/* =====================================================
   DEMO 4 · ones estacionàries
   ===================================================== */
const D3 = { k: 0, n: 1, L: 0.65, v: 143, comp: false, t: 0, play: true };
const MED3 = [
  { nom: 'Corda fixada pels dos extrems: node a cada extrem.', q: 2, odd: false },
  { nom: 'Tub obert pels dos extrems: ventre a cada extrem.', q: 2, odd: false },
  { nom: 'Tub obert per un extrem i tancat per l\'altre: ventre a l\'obert, node al tancat.', q: 4, odd: true }
];
bind('d3L', 'd3Ln', D3, 'L', 0.2, 2);
bind('d3v', 'd3vn', D3, 'v', 50, 500);
$('d3comp').onchange = e => D3.comp = e.target.checked;
$('d3play').onclick = () => { D3.play = !D3.play; };
function harmBtns() {
  const ns = MED3[D3.k].odd ? [1, 3, 5, 7, 9, 11] : [1, 2, 3, 4, 5, 6];
  if (!ns.includes(D3.n)) D3.n = ns[0];
  $('d3n').innerHTML = ns.map(n => '<button data-n="' + n + '">' + n + '</button>').join('');
  segBind('d3n', 'n', D3, 'n');
  $('d3medn').textContent = MED3[D3.k].nom;
}
segBind('d3med', 'k', D3, 'k', () => {
  if (D3.k > 0 && D3.v < 300) { D3.v = 340; $('d3v').value = 340; $('d3vn').value = 340; }
  if (D3.k === 0 && D3.v === 340) { D3.v = 143; $('d3v').value = 143; $('d3vn').value = 143; }
  harmBtns();
});
harmBtns();
function step3(dt) { if (D3.play) D3.t += dt; }
// forma del mode (u de 0 a 1 al llarg del medi): amplitud del desplaçament
function shape3(u) {
  const n = D3.n;
  if (D3.k === 0) return Math.sin(n * PI * u);
  if (D3.k === 1) return Math.cos(n * PI * u);
  return Math.cos(n * PI * u / 2);
}
function drawStand3() {
  const { c, W, H } = fit($('c3'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const x0 = 60, x1 = W - 60, yc = H * 0.45, a = Math.min(H * 0.3, 170), U = x => x0 + x * (x1 - x0);
  const wt = 2 * PI * 0.7 * D3.t, ct = Math.cos(wt);
  // medi
  if (D3.k === 0) {
    c.fillStyle = TK.stone; c.fillRect(x0 - 12, yc - a - 14, 12, 2 * a + 28); c.fillRect(x1, yc - a - 14, 12, 2 * a + 28);
  } else {
    c.strokeStyle = TK.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, yc - a - 16); c.lineTo(x1, yc - a - 16); c.moveTo(x0, yc + a + 16); c.lineTo(x1, yc + a + 16); c.stroke();
    if (D3.k === 2) { c.lineWidth = 7; c.beginPath(); c.moveTo(x1 + 2, yc - a - 18); c.lineTo(x1 + 2, yc + a + 18); c.stroke(); }
    c.font = '11px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('obert', x0, yc - a - 22); c.fillText(D3.k === 2 ? 'tancat' : 'obert', x1, yc - a - 22);
  }
  c.strokeStyle = TK.grid2; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, yc + .5); c.lineTo(x1, yc + .5); c.stroke();
  // envolupant
  c.save(); c.setLineDash([4, 4]); c.strokeStyle = TK.muted; c.globalAlpha = 0.6; c.lineWidth = 1.2;
  curve(c, u => a * shape3(u), 0, 1, U, v => yc - v, 300); c.stroke(); curve(c, u => -a * shape3(u), 0, 1, U, v => yc - v, 300); c.stroke(); c.restore();
  // ones components
  if (D3.comp) {
    const kk = D3.k === 2 ? D3.n * PI / 2 : D3.n * PI;
    // l'ona que va i la que torna sumen l'ona estacionària
    const inc = u => 0.5 * a * (D3.k === 0 ? Math.sin(kk * u - wt) : Math.cos(kk * u - wt));
    const ref = u => 0.5 * a * (D3.k === 0 ? Math.sin(kk * u + wt) : Math.cos(kk * u + wt));
    c.lineWidth = 1.6; c.save(); c.setLineDash([6, 4]);
    c.strokeStyle = TK.x; curve(c, inc, 0, 1, U, v => yc - v, 300); c.stroke();
    c.strokeStyle = TK.y; curve(c, ref, 0, 1, U, v => yc - v, 300); c.stroke(); c.restore();
  }
  // ona estacionària
  c.strokeStyle = TK.ink; c.lineWidth = 3; c.lineJoin = 'round';
  curve(c, u => a * shape3(u) * ct, 0, 1, U, v => yc - v, 300); c.stroke();
  // nodes i ventres
  const nodes = [], vent = [];
  const nn = D3.n, kk = D3.k;
  if (kk === 0) { for (let j = 0; j <= nn; j++) nodes.push(j / nn); for (let j = 0; j < nn; j++) vent.push((j + .5) / nn); }
  if (kk === 1) { for (let j = 0; j <= nn; j++) vent.push(j / nn); for (let j = 0; j < nn; j++) nodes.push((j + .5) / nn); }
  if (kk === 2) { for (let j = 0; j <= (nn - 1) / 2; j++) nodes.push(1 - j * 2 / nn); for (let j = 0; j <= (nn - 1) / 2; j++) vent.push(1 - (j * 2 + 1) / nn); }
  c.font = '600 12px ' + FB; c.textAlign = 'center';
  nodes.forEach(u => { c.fillStyle = TK.y; c.beginPath(); c.arc(U(u), yc, 5, 0, 7); c.fill(); c.textBaseline = 'top'; c.fillText('N', U(u), yc + a + (kk ? 22 : 18)); });
  vent.forEach(u => { c.fillStyle = TK.x; c.textBaseline = 'top'; c.fillText('V', U(u), yc + a + (kk ? 22 : 18)); c.save(); c.globalAlpha = .5; c.strokeStyle = TK.x; c.setLineDash([2, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(U(u), yc - a); c.lineTo(U(u), yc + a); c.stroke(); c.restore(); });
  // L i λ/2
  const yb = H - 22;
  arrow(c, x0 + 2, yb, x1 - 2, yb, TK.muted, 1.2); arrow(c, x1 - 2, yb, x0 + 2, yb, TK.muted, 1.2);
  c.fillStyle = TK.surface; c.fillRect((x0 + x1) / 2 - 46, yb - 9, 92, 18);
  c.fillStyle = TK.ink; c.font = '12px ' + FM; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('L = ' + fmt(D3.L) + ' m', (x0 + x1) / 2, yb);
}
let key3 = '';
function texts3() {
  const M = MED3[D3.k], n = D3.n, lam = M.q * D3.L / n, f = D3.v / lam, f1 = D3.v / (M.q * D3.L);
  const N = D3.k === 0 ? n + 1 : D3.k === 1 ? n : (n + 1) / 2, V = D3.k === 0 ? n : D3.k === 1 ? n + 1 : (n + 1) / 2;
  $('d3rn').textContent = n; $('d3rN').textContent = N; $('d3rV').textContent = V;
  $('d3rl').textContent = fmt(lam, 3) + ' m'; $('d3rf').textContent = fmt(f, 1) + ' Hz'; $('d3rf1').textContent = fmt(f1, 1) + ' Hz';
  const key = [D3.k, n, D3.L, D3.v].join('|');
  if (key !== key3) {
    key3 = key;
    $('d3e1').textContent = (M.q === 2 ? 'L = n·λ/2 → λ = 2L/n = 2·' : 'L = n·λ/4 → λ = 4L/n = 4·') + fmtN(D3.L) + '/' + n + ' = ' + fmt(lam, 3) + ' m';
    $('d3e2').textContent = 'f = v/λ = ' + fmtN(D3.v) + '/' + fmt(lam, 3) + ' = ' + fmt(f, 1) + ' Hz = ' + n + '·f₁';
    $('d3e3').textContent = 'f₁ = v/(' + M.q + 'L) = ' + fmt(f1, 1) + ' Hz   harmònics: ' + (M.odd ? 'només senars' : 'tots');
  }
  $('d3play').textContent = D3.play ? 'Pausa' : 'Continua';
}
register($('c3'), step3, () => { drawStand3(); texts3(); });

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
  { g: 1, ti: "Llegir una equació d'ona", hint: 'Compara amb y = A·sin(ω·t − k·x).',
    q: '<p>Per una corda es propaga una ona d\'equació <i>y</i>(<i>x</i>, <i>t</i>) = 0,05·sin(10π·<i>t</i> − 2π·<i>x</i>), en unitats SI. Determina:</p>' + P([
      'l\'amplitud, la freqüència, el període i la longitud d\'ona;',
      'la velocitat de propagació i el sentit;',
      'la velocitat màxima d\'un punt de la corda.']),
    s: P([
      'A = ' + R('0,05 m') + '; ω = 10π rad/s → f = ω/2π = ' + R('5 Hz') + ', T = 1/f = ' + R('0,2 s') + '; k = 2π rad/m → λ = 2π/k = ' + R('1 m') + '.',
      'v = λ·f = 1·5 = ' + R('5 m/s') + ' (també ω/k = 10π/2π). El signe − davant de k·x indica que es propaga ' + R('cap a les x positives') + '.',
      'v<sub>y,màx</sub> = A·ω = 0,05·10π = ' + R('1,57 m/s') + '.']) },
  { g: 1, ti: "Escriure l'equació d'una ona", hint: 'Calcula f = v/λ, i després ω i k. El sentit decideix el signe.',
    q: '<p>Una ona transversal de 3,0 cm d\'amplitud i 60 cm de longitud d\'ona es propaga per una corda a 12 m/s en el sentit negatiu de l\'eix x. En t = 0, el punt x = 0 és a l\'equilibri i puja.</p>' + P([
      'Calcula la freqüència i el període.',
      'Escriu l\'equació de l\'ona.']),
    s: P([
      'f = v/λ = 12/0,60 = ' + R('20 Hz') + '; T = 1/f = ' + R('0,050 s') + '.',
      'ω = 2π·f = 40π = 125,7 rad/s; k = 2π/λ = 2π/0,60 = 10π/3 = 10,5 rad/m. Cap a −x, el signe és +; amb y(0, 0) = 0 pujant, φ<sub>0</sub> = 0: ' + R('y(x, t) = 0,030·sin(40π·t + (10π/3)·x) m') + '.']) },
  { g: 1, ti: "El so canvia de medi", hint: 'La freqüència no canvia en passar d\'un medi a un altre.',
    q: '<p>Un diapasó emet un so de 440 Hz a l\'aire. Part del so entra a l\'aigua d\'una piscina. (<i>v</i><sub>aire</sub> = 340 m/s; <i>v</i><sub>aigua</sub> = 1 480 m/s)</p>' + P([
      'Quina és la freqüència del so a l\'aigua?',
      'Calcula la longitud d\'ona a l\'aire i a l\'aigua.']),
    s: P([
      'La freqüència la fixa la font: ' + R('440 Hz') + ' també a l\'aigua.',
      'λ<sub>aire</sub> = 340/440 = ' + R('0,773 m') + '; λ<sub>aigua</sub> = 1 480/440 = ' + R('3,36 m') + '. La λ creix en la mateixa proporció que la velocitat.']) },
  { g: 1, ti: "Intensitat i decibels d'una font", hint: 'I = P/(4π·r²) i β = 10·log(I/I₀).',
    q: '<p>Un altaveu petit emet 0,10 W de potència sonora per igual en totes direccions. (<i>I</i><sub>0</sub> = 10<sup>−12</sup> W/m²)</p>' + P([
      'Calcula la intensitat i el nivell d\'intensitat sonora a 10 m.',
      'Quin nivell hi ha a 20 m?']),
    s: P([
      'I = P/(4π·r²) = 0,10/(4π·10²) = ' + R('7,96·10<sup>−5</sup> W/m²') + '; β = 10·log(7,96·10<sup>−5</sup>/10<sup>−12</sup>) = ' + R('79,0 dB') + '.',
      'Amb el doble de distància, la intensitat es divideix per 4: I = 1,99·10<sup>−5</sup> W/m² i β = 79,0 − 10·log 4 = ' + R('73,0 dB') + '.']) },
  { g: 1, ti: 'La corda d\'una guitarra', hint: 'Corda fixada pels dos extrems: f₁ = v/(2L).',
    q: '<p>Una corda de guitarra de 65 cm entre els dos punts fixos té una freqüència fonamental de 110 Hz.</p>' + P([
      'Calcula la velocitat de les ones a la corda.',
      'Calcula les freqüències del segon i del tercer harmònic, i la longitud d\'ona del tercer.']),
    s: P([
      'Fonamental: L = λ<sub>1</sub>/2 → λ<sub>1</sub> = 2L = 1,30 m; v = λ<sub>1</sub>·f<sub>1</sub> = 1,30·110 = ' + R('143 m/s') + '.',
      'f<sub>n</sub> = n·f<sub>1</sub>: f<sub>2</sub> = ' + R('220 Hz') + ', f<sub>3</sub> = ' + R('330 Hz') + '; λ<sub>3</sub> = 2L/3 = ' + R('0,433 m') + '.']) },

  { g: 2, ti: 'Diferència de fase entre punts', hint: 'Δφ = k·Δx = 2π·Δx/λ i Δφ = ω·Δt.',
    q: '<p>Per una corda es propaga una ona de 50 Hz a 20 m/s.</p>' + P([
      'Quina diferència de fase hi ha entre dos punts separats 10 cm?',
      'A quina distància mínima hi ha un punt en fase amb un de donat? I en oposició de fase?',
      'Quina diferència de fase té un mateix punt entre dos instants separats 5,0 ms?']),
    s: P([
      'λ = v/f = 20/50 = 0,40 m; Δφ = 2π·Δx/λ = 2π·0,10/0,40 = ' + R('π/2 rad') + '.',
      'En fase: Δx = λ = ' + R('0,40 m') + '. En oposició: Δx = λ/2 = ' + R('0,20 m') + '.',
      'Δφ = ω·Δt = 2π·50·0,0050 = ' + R('π/2 rad') + ' (5 ms és T/4).']) },
  { g: 2, ti: 'Dos altaveus: on se sent i on no', hint: 'Calcula λ i compara Δr amb λ: múltiple enter o semienter.',
    q: '<p>Dos altaveus connectats al mateix amplificador emeten en fase un so de 680 Hz. (<i>v</i><sub>so</sub> = 340 m/s)</p>' + P([
      'En un punt P, a 3,00 m d\'un altaveu i a 3,75 m de l\'altre, hi ha interferència constructiva o destructiva?',
      'I en un punt Q, a 4,00 m i a 5,00 m?',
      'Quina és la freqüència més baixa per a la qual a P hi hauria silenci?']),
    s: P([
      'λ = v/f = 340/680 = 0,500 m; Δr = 0,75 m = 1,5·λ, un nombre semienter de λ: ' + R('destructiva') + ' (silenci).',
      'Δr = 1,00 m = 2·λ: ' + R('constructiva') + '.',
      'La primera condició de destrucció és Δr = λ/2 → λ = 2·0,75 = 1,50 m → f = 340/1,50 = ' + R('227 Hz') + '.']) },
  { g: 2, ti: "Un tub d'orgue", hint: 'Tub tancat: L = n·λ/4 amb n senar.',
    q: '<p>Un tub d\'orgue de 85 cm està obert per un extrem i tancat per l\'altre. (<i>v</i><sub>so</sub> = 340 m/s)</p>' + P([
      'Calcula la freqüència fonamental i la dels dos harmònics següents que pot emetre.',
      'Si s\'obre l\'extrem tancat, quina és la nova freqüència fonamental? Quins harmònics apareixen?']),
    s: P([
      'Node al fons i ventre a la boca: L = λ<sub>1</sub>/4 → f<sub>1</sub> = v/(4L) = 340/(4·0,85) = ' + R('100 Hz') + '. Només harmònics senars: ' + R('300 Hz i 500 Hz') + '.',
      'Obert pels dos extrems: f<sub>1</sub> = v/(2L) = ' + R('200 Hz') + ', i hi ha tots els harmònics: 400 Hz, 600 Hz…']) },
  { g: 2, ti: 'Una ona estacionària de tres fusos', hint: 'Compta fusos: cada un fa λ/2.',
    q: '<p>Una corda d\'1,20 m fixada pels dos extrems vibra a 60 Hz formant una ona estacionària amb 4 nodes, comptant els dels extrems.</p>' + P([
      'Quin harmònic és? Calcula la longitud d\'ona i la velocitat de propagació.',
      'Calcula la freqüència fonamental i la distància entre un node i el ventre del costat.',
      'A quina freqüència vibraria amb 5 fusos?']),
    s: P([
      '4 nodes són 3 fusos: ' + R('n = 3') + '. λ = 2L/3 = ' + R('0,80 m') + '; v = λ·f = 0,80·60 = ' + R('48 m/s') + '.',
      'f<sub>1</sub> = f<sub>3</sub>/3 = ' + R('20 Hz') + '; node–ventre = λ/4 = ' + R('0,20 m') + '.',
      'f<sub>5</sub> = 5·f<sub>1</sub> = ' + R('100 Hz') + '.']) },
  { g: 2, ti: 'Un violí, dos violins, deu violins', hint: 'Les intensitats se sumen; els decibels no.',
    q: '<p>Un violí que toca sol produeix un nivell d\'intensitat sonora de 60 dB en un punt de la sala.</p>' + P([
      'Quin nivell hi haurà si toquen dos violins iguals?',
      'Quants violins calen per arribar a 70 dB?',
      'Quin nivell produeix un sol violí al doble de distància (ona esfèrica, sense absorció)?']),
    s: P([
      'La intensitat es duplica: β = 60 + 10·log 2 = ' + R('63,0 dB') + ' (no 120 dB).',
      '+10 dB vol dir intensitat ×10: calen ' + R('10 violins') + '.',
      'Al doble de distància I es divideix per 4: β = 60 − 10·log 4 = ' + R('54,0 dB') + '.']) }
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
  document.querySelectorAll('.subidx a, a.godemo').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(document.querySelector(a.getAttribute('href'))); }));
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
        h += '<div class="sn-g"><a class="sn-gl" href="#' + g.id + '" title="' + name + '"><span>' + st + '</span>' + name + '</a><div class="sn-nums">' +
          [...g.querySelectorAll('.ex')].map(e => '<a href="#' + e.id + '" title="' + txt(e.querySelector('.ttl')) + '">' + txt(e.querySelector('.num')).replace('.', '') + '</a>').join('') + '</div></div>';
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
    el.innerHTML = '<button type="button" class="sharebtn" aria-expanded="false">' + ICONA + 'Comparteix</button><div class="sharemenu" role="group" aria-label="Comparteix a" hidden></div>';
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
