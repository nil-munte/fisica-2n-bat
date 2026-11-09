/* Simulador de la fase inicial φ */
(function () {
  if (!document.getElementById('fiPh')) return;
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  let A = 5, xr = 0.5, dir = -1, conv = 'cos', playing = false, raf = 0, last = 0, tAnim = 0;
  const norm = a => { const t = 2 * Math.PI; a = a % t; if (a <= -Math.PI) a += t; if (a > Math.PI) a -= t; return a; };
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  function frac(a) {
    if (Math.abs(a) < 1e-9) return '0';
    for (const d of [1, 2, 3, 4, 6, 8, 12]) {
      const k = Math.round(a / Math.PI * d);
      if (Math.abs(a - k * Math.PI / d) < 1e-6) {
        const g = gcd(Math.abs(k), d), n = Math.abs(k) / g, den = d / g;
        return (k < 0 ? '−' : '') + (n === 1 ? 'π' : n + 'π') + (den === 1 ? '' : '/' + den);
      }
    }
    return a.toFixed(2).replace('.', ',');
  }
  const f2 = x => x.toFixed(2).replace('.', ',').replace('-', '−');
  const deg = a => Math.round(a * 180 / Math.PI) + '°';
  const clamp = c => Math.max(-1, Math.min(1, c));

  function solve() {
    const x0 = xr * A, ext = Math.abs(xr) > 0.9999, steps = [];
    let phi;
    if (conv === 'cos') {
      const al = Math.acos(clamp(xr));
      steps.push('t = 0: x₀ = A·cos φ → cos φ = ' + f2(x0) + ' / ' + f2(A) + ' = <b>' + f2(xr) + '</b>');
      if (ext) { phi = xr > 0 ? 0 : Math.PI; steps.push('És un extrem (v₀ = 0): només hi ha un angle, φ = ' + frac(phi)); }
      else {
        steps.push('arccos(' + f2(xr) + ') = <b>' + frac(al) + '</b> (' + deg(al) + '), així que els candidats són +' + frac(al) + ' i −' + frac(al));
        if (dir > 0) { phi = -al; steps.push('v₀ &gt; 0 → sin φ &lt; 0 → φ = −' + frac(al)); }
        else { phi = al; steps.push('v₀ &lt; 0 → sin φ &gt; 0 → φ = +' + frac(al)); }
      }
    } else {
      const as = Math.asin(clamp(xr));
      steps.push('t = 0: x₀ = A·sin φ → sin φ = ' + f2(x0) + ' / ' + f2(A) + ' = <b>' + f2(xr) + '</b>');
      if (ext) { phi = xr > 0 ? Math.PI / 2 : -Math.PI / 2; steps.push('És un extrem (v₀ = 0 → cos φ = 0): φ = ' + frac(phi)); }
      else {
        steps.push('arcsin(' + f2(xr) + ') = <b>' + frac(as) + '</b> (' + deg(as) + '); l\'altre candidat és π − ' + frac(as) + ' = ' + frac(norm(Math.PI - as)));
        if (dir > 0) { phi = as; steps.push('v₀ &gt; 0 → cos φ &gt; 0 → φ = ' + frac(phi)); }
        else { phi = norm(Math.PI - as); steps.push('v₀ &lt; 0 → cos φ &lt; 0 → φ = π − ' + frac(as) + ' = ' + frac(phi)); }
      }
    }
    return { x0, ext, steps, phi: norm(phi) };
  }
  const theta = phi => conv === 'cos' ? phi : phi - Math.PI / 2; // angle del vector respecte de +x
  function el(n, a, t) { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; }
  const V = v => 'var(' + v + ')';

  function drawPhasor(s, off) {
    const svg = $('fiPh'); svg.innerHTML = '';
    const cx = 100, cy = 100, r = 70, th0 = theta(s.phi), th = th0 + off;
    svg.appendChild(el('circle', { cx, cy, r, fill: 'none', stroke: V('--line'), 'stroke-width': 1.5 }));
    svg.appendChild(el('line', { x1: 15, y1: cy, x2: 185, y2: cy, stroke: V('--muted') }));
    svg.appendChild(el('line', { x1: cx, y1: 20, x2: cx, y2: 180, stroke: V('--line'), 'stroke-dasharray': '3 3' }));
    svg.appendChild(el('text', { x: 186, y: cy - 5, 'text-anchor': 'end' }, 'x'));
    if (!off && Math.abs(th0) > 0.02) {
      const ra = 24, ex = cx + ra * Math.cos(th0), ey = cy - ra * Math.sin(th0);
      svg.appendChild(el('path', { d: 'M' + (cx + ra) + ' ' + cy + ' A' + ra + ' ' + ra + ' 0 ' + (Math.abs(th0) > Math.PI ? 1 : 0) + ' ' + (th0 > 0 ? 0 : 1) + ' ' + ex + ' ' + ey, fill: 'none', stroke: V('--ink'), 'stroke-width': 2 }));
      svg.appendChild(el('text', { x: cx + 40 * Math.cos(th0 / 2), y: cy - 40 * Math.sin(th0 / 2) + 4, 'text-anchor': 'middle', style: 'fill:var(--ink);font-size:13px' }, 'φ'));
    }
    const px = cx + r * Math.cos(th), py = cy - r * Math.sin(th);
    svg.appendChild(el('line', { x1: cx, y1: cy, x2: px, y2: py, stroke: V('--y'), 'stroke-width': 2.5 }));
    svg.appendChild(el('circle', { cx: px, cy: py, r: 5, fill: V('--y') }));
    svg.appendChild(el('line', { x1: px, y1: py, x2: px, y2: cy, stroke: V('--muted'), 'stroke-dasharray': '4 3' }));
    svg.appendChild(el('circle', { cx: px, cy: cy, r: 5, fill: V('--x') }));
    const vs = off ? -Math.sign(Math.sin(th)) : (s.ext ? 0 : dir);
    if (vs) {
      const ax = px + vs * 26;
      svg.appendChild(el('line', { x1: px + vs * 8, y1: cy + 14, x2: ax, y2: cy + 14, stroke: V('--x'), 'stroke-width': 2.5 }));
      svg.appendChild(el('path', { d: 'M' + ax + ' ' + (cy + 14) + ' l' + (-vs * 7) + ' -4 l0 8 z', fill: V('--x') }));
    }
  }
  function drawGraph(s, tm) {
    const svg = $('fiGr'); svg.innerHTML = '';
    const L = 34, R = 310, T = 14, B = 176, cy = (T + B) / 2, h = (B - T) / 2 - 8, th0 = theta(s.phi);
    svg.appendChild(el('line', { x1: L, y1: cy, x2: R, y2: cy, stroke: V('--muted') }));
    svg.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: V('--muted') }));
    svg.appendChild(el('text', { x: R, y: cy - 5, 'text-anchor': 'end' }, 't'));
    svg.appendChild(el('text', { x: L + 4, y: T + 8 }, 'x'));
    for (let k = 1; k <= 2; k++) {
      const xk = L + (R - L) * k / 2;
      svg.appendChild(el('line', { x1: xk, y1: cy - 3, x2: xk, y2: cy + 3, stroke: V('--muted') }));
      svg.appendChild(el('text', { x: xk, y: cy + 16, 'text-anchor': 'middle' }, k + 'T'));
    }
    svg.appendChild(el('text', { x: L - 4, y: cy - h + 4, 'text-anchor': 'end' }, 'A'));
    svg.appendChild(el('text', { x: L - 4, y: cy + h + 4, 'text-anchor': 'end' }, '−A'));
    const pts = [];
    for (let i = 0; i <= 200; i++) { const t = 2 * i / 200; pts.push((L + (R - L) * t / 2).toFixed(1) + ',' + (cy - h * Math.cos(2 * Math.PI * t + th0)).toFixed(1)); }
    svg.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: V('--x'), 'stroke-width': 2.2 }));
    const y0 = cy - h * Math.cos(th0);
    svg.appendChild(el('line', { x1: L, y1: y0, x2: L + 40, y2: y0, stroke: V('--y'), 'stroke-dasharray': '3 3' }));
    svg.appendChild(el('circle', { cx: L, cy: y0, r: 5, fill: V('--y') }));
    svg.appendChild(el('text', { x: L + 46, y: y0 + 4, style: 'fill:var(--y)' }, 'x₀'));
    if (tm != null) {
      const xm = L + (R - L) * tm / 2;
      svg.appendChild(el('line', { x1: xm, y1: T, x2: xm, y2: B, stroke: V('--line') }));
      svg.appendChild(el('circle', { cx: xm, cy: cy - h * Math.cos(2 * Math.PI * tm + th0), r: 4, fill: V('--x') }));
    }
  }
  function render() {
    const s = solve();
    $('fiXv').textContent = f2(s.x0);
    $('fiDirNote').hidden = !s.ext;
    $('fiDir').querySelectorAll('button').forEach(b => { b.disabled = s.ext; b.setAttribute('aria-pressed', String(!s.ext && +b.dataset.d === dir)); });
    $('fiConv').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === conv)));
    drawPhasor(s, playing ? tAnim * 2 * Math.PI : 0);
    drawGraph(s, playing ? tAnim : null);
    const body = Math.abs(s.phi) < 1e-9 ? 'ωt' : 'ωt ' + (s.phi < 0 ? '−' : '+') + ' ' + frac(Math.abs(s.phi));
    const chk = A * (conv === 'cos' ? Math.cos(s.phi) : Math.sin(s.phi));
    $('fiOut').innerHTML = '<ol>' + s.steps.map(x => '<li>' + x + '</li>').join('') + '</ol>' +
      '<div class="big"><span class="res">φ = ' + frac(s.phi) + ' rad</span> (' + deg(s.phi) + ')</div>' +
      '<div class="keyf">x(t) = ' + f2(A).replace(/,00$/, '') + '·' + conv + '(' + body + ')</div>' +
      '<p class="note">Comprovació: x(0) = ' + f2(chk) + ' m ✓. Qualsevol φ + 2π·n també serveix.</p>';
  }
  function tick(ts) {
    if (!playing) return;
    if (!last) last = ts;
    tAnim = (tAnim + (ts - last) / 4000) % 2; last = ts; render(); raf = requestAnimationFrame(tick);
  }
  function setPlay(on) {
    playing = on; last = 0; tAnim = 0;
    $('fiPlay').textContent = on ? 'Atura' : 'Reprodueix';
    $('fiPlay').setAttribute('aria-pressed', String(on));
    cancelAnimationFrame(raf);
    if (on) raf = requestAnimationFrame(tick); else render();
  }
  $('fiA').addEventListener('input', e => { const v = parseFloat(e.target.value); if (v > 0) { A = v; render(); } });
  $('fiX').addEventListener('input', e => { xr = e.target.value / 100; render(); });
  $('fiDir').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) { dir = +b.dataset.d; render(); } });
  $('fiConv').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { conv = b.dataset.c; render(); } });
  document.querySelectorAll('.fipre button').forEach(b => b.addEventListener('click', () => {
    xr = +b.dataset.x; dir = +b.dataset.d; $('fiX').value = xr * 100; render();
  }));
  $('fiPlay').addEventListener('click', () => setPlay(!playing));
  render();
})();

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
   DEMO 1 · massa-molla
   ===================================================== */
const D1 = { A: 0.10, m: 0.5, k: 20, phi: 0, t: 0, play: true, speed: 0.5, vec: true, pha: true };
const d1 = () => { const w = Math.sqrt(D1.k / D1.m); return { w, T: 2 * PI / w, ph: D1.phi * DEG }; };
const wrap1 = () => { const { T } = d1(); D1.t = ((D1.t % (2 * T)) + 2 * T) % (2 * T); };
bind('d1A', 'd1An', D1, 'A', 0.02, 0.2, wrap1);
bind('d1m', 'd1mn', D1, 'm', 0.1, 2, wrap1);
bind('d1k', 'd1kn', D1, 'k', 5, 100, wrap1);
$('d1p').value = D1.phi;
$('d1p').addEventListener('input', e => { D1.phi = +e.target.value; });
$('d1vec').onchange = e => D1.vec = e.target.checked;
$('d1pha').onchange = e => D1.pha = e.target.checked;
segBind('d1seg', 'v', D1, 'speed');
$('d1play').onclick = () => { D1.play = !D1.play; };
$('d1reset').onclick = () => { D1.t = 0; };
$('d1scrub').addEventListener('input', e => { D1.t = +e.target.value; D1.play = false; });
scrubGuard('d1scrub');

function step1(dt) {
  if (!D1.play) return;
  const { T } = d1();
  D1.t += dt * D1.speed;
  if (D1.t >= 2 * T) D1.t -= 2 * T;
}

function spring(c, x1, x2, y, n, amp) {
  const len = Math.max(x2 - x1, 24), lead = Math.min(10, len * 0.15), seg = (len - 2 * lead) / n;
  c.beginPath(); c.moveTo(x1, y); c.lineTo(x1 + lead, y);
  for (let i = 0; i < n; i++) c.lineTo(x1 + lead + seg * (i + 0.5), y + (i % 2 ? amp : -amp));
  c.lineTo(x1 + len - lead, y); c.lineTo(x1 + len, y); c.stroke();
}

function drawScene1() {
  const { c, W, H } = fit($('c1s'));
  const { w, T, ph } = d1(), t = D1.t, A = D1.A;
  const th = w * t + ph;
  const x = A * Math.cos(th), v = -A * w * Math.sin(th), a = -A * w * w * Math.cos(th);
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const showP = D1.pha && W >= 520, leftW = showP ? W * 0.6 : W;
  const wallX = 26, cx = wallX + (leftW - wallX) / 2, kpx = ((leftW - wallX) / 2 - 44) / 0.2;
  const yc = H * 0.5, bw = 44, bh = 44;
  // terra i paret
  c.strokeStyle = TK.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(wallX - 10, yc + bh / 2 + .5); c.lineTo(leftW - 8, yc + bh / 2 + .5); c.stroke();
  c.fillStyle = TK.stone; c.fillRect(wallX - 10, yc - bh * 0.9, 10, bh * 1.4);
  // escala
  c.font = '11px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'top';
  c.lineWidth = 1; c.strokeStyle = TK.muted;
  for (let n = -2; n <= 2; n++) {
    const X = cx + n * 0.1 * kpx;
    c.beginPath(); c.moveTo(X, yc + bh / 2); c.lineTo(X, yc + bh / 2 + 5); c.stroke();
    c.fillText(fmtN(n * 0.1), X, yc + bh / 2 + 8);
  }
  c.textAlign = 'right'; c.fillText('x (m)', leftW - 8, yc + bh / 2 + 22);
  // equilibri i ±A
  c.save(); c.setLineDash([4, 4]); c.lineWidth = 1; c.strokeStyle = TK.muted;
  [-A, 0, A].forEach(xx => { const X = cx + xx * kpx; c.beginPath(); c.moveTo(X, yc - 74); c.lineTo(X, yc + bh / 2); c.stroke(); });
  c.restore();
  c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText('−A', cx - A * kpx, yc - 76); c.fillText('0', cx, yc - 76); c.fillText('+A', cx + A * kpx, yc - 76);
  // molla i bloc
  const bx = cx + x * kpx;
  c.strokeStyle = TK.ink; c.lineWidth = 2; c.lineJoin = 'round';
  spring(c, wallX, bx - bw / 2, yc, 12, 9);
  c.fillStyle = TK.wood; c.strokeStyle = TK.wood2; c.lineWidth = 2;
  c.fillRect(bx - bw / 2, yc - bh / 2, bw, bh); c.strokeRect(bx - bw / 2, yc - bh / 2, bw, bh);
  c.fillStyle = TK.surface; c.font = 'italic 500 15px ' + FB; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('m', bx, yc + 1);
  // vectors
  if (D1.vec) {
    const maxL = Math.min(70, leftW * 0.12);
    const lv = v / (A * w) * maxL, la = a / (A * w * w) * maxL;
    arrow(c, bx, yc - 38, bx + lv, yc - 38, TK.x, 2.4);
    arrow(c, bx, yc - 56, bx + la, yc - 56, TK.y, 2.4);
    c.font = 'italic 500 13px ' + FB; c.textBaseline = 'middle';
    if (Math.abs(lv) > 8) { c.fillStyle = TK.x; c.textAlign = lv > 0 ? 'left' : 'right'; c.fillText('v', bx + lv + (lv > 0 ? 6 : -6), yc - 38); }
    if (Math.abs(la) > 8) { c.fillStyle = TK.y; c.textAlign = la > 0 ? 'left' : 'right'; c.fillText('a', bx + la + (la > 0 ? 6 : -6), yc - 56); }
  }
  // fasor
  if (showP) {
    const pcx = leftW + (W - leftW) / 2, pcy = yc, R = Math.min((W - leftW) / 2 - 30, H * 0.34);
    c.strokeStyle = TK.grid2; c.lineWidth = 1.2; c.beginPath(); c.arc(pcx, pcy, R, 0, 2 * PI); c.stroke();
    c.strokeStyle = TK.muted; c.lineWidth = 1;
    c.beginPath(); c.moveTo(pcx - R - 8, pcy); c.lineTo(pcx + R + 8, pcy); c.moveTo(pcx, pcy - R - 8); c.lineTo(pcx, pcy + R + 8); c.stroke();
    const Px = pcx + R * Math.cos(th), Py = pcy - R * Math.sin(th);
    c.save(); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(Px, Py); c.lineTo(Px, pcy); c.stroke(); c.restore();
    arrow(c, pcx, pcy, Px, Py, TK.ink, 2);
    c.fillStyle = TK.ball; c.beginPath(); c.arc(Px, Py, 4.5, 0, 7); c.fill();
    c.fillStyle = TK.wood; c.fillRect(Px - 5, pcy - 5, 10, 10);
    c.font = '11px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('x = A·cos(ωt+φ)', pcx, pcy + R + 12);
    const thm = ((th % (2 * PI)) + 2 * PI) % (2 * PI);
    c.fillText('ωt+φ = ' + fmt(thm) + ' rad', pcx, pcy + R + 26);
  }
}

function plotStack1() {
  const { c, W, H } = fit($('c1g'));
  const { w, T, ph } = d1(), A = D1.A, tMax = 2 * T, t = D1.t;
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const ml = 54, mr = 12, mt = 8, mb = 22, ph3 = (H - mt - mb) / 3;
  const X = tt => ml + tt / tMax * (W - ml - mr);
  const S = [
    { n: 'x (m)', amp: A, f: tt => A * Math.cos(w * tt + ph), col: TK.ink, d: 2 },
    { n: 'v (m/s)', amp: A * w, f: tt => -A * w * Math.sin(w * tt + ph), col: TK.x, d: 2 },
    { n: 'a (m/s²)', amp: A * w * w, f: tt => -A * w * w * Math.cos(w * tt + ph), col: TK.y, d: 1 }
  ];
  c.font = '10.5px ' + FM;
  S.forEach((s, i) => {
    const top = mt + i * ph3 + 3, hh = ph3 - 8, mid = top + hh / 2;
    const Y = val => mid - val / (s.amp * 1.1) * (hh / 2);
    // quadrícula temporal cada T/4
    c.lineWidth = 1; c.strokeStyle = TK.grid; c.beginPath();
    for (let q = 0; q <= 8; q++) { const xx = Math.round(X(q * T / 4)) + .5; c.moveTo(xx, top); c.lineTo(xx, top + hh); }
    c.stroke();
    c.strokeStyle = TK.grid2; c.beginPath();
    [-s.amp, s.amp].forEach(v0 => { const yy = Math.round(Y(v0)) + .5; c.moveTo(ml, yy); c.lineTo(W - mr, yy); });
    c.stroke();
    c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(ml, Math.round(mid) + .5); c.lineTo(W - mr, Math.round(mid) + .5); c.moveTo(ml + .5, top); c.lineTo(ml + .5, top + hh); c.stroke();
    c.fillStyle = TK.muted; c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText(fmt(s.amp, s.d), ml - 6, Y(s.amp)); c.fillText('0', ml - 6, mid); c.fillText(fmt(-s.amp, s.d), ml - 6, Y(-s.amp));
    c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = s.col; c.fillText(s.n, ml + 6, top + 1);
    // corba
    c.save(); c.setLineDash([4, 4]); c.globalAlpha = 0.4; c.strokeStyle = s.col; c.lineWidth = 1.5; curve(c, s.f, 0, tMax, X, Y); c.stroke(); c.restore();
    if (t > 0) { c.strokeStyle = s.col; c.lineWidth = 2.2; curve(c, s.f, 0, t, X, Y, Math.max(8, Math.ceil(120 * t / tMax))); c.stroke(); }
    c.fillStyle = s.col; c.beginPath(); c.arc(X(t), Y(s.f(t)), 4, 0, 7); c.fill();
  });
  // cursor temporal i eix t
  c.strokeStyle = TK.muted; c.lineWidth = 1; c.save(); c.setLineDash([2, 3]); c.beginPath(); c.moveTo(X(t) + .5, mt); c.lineTo(X(t) + .5, H - mb); c.stroke(); c.restore();
  c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'top';
  for (let q = 0; q <= 4; q++) c.fillText(fmt(q * T / 2), X(q * T / 2), H - mb + 6);
  c.textAlign = 'left'; c.fillText('T', X(T) + 4, mt + 3 + 14);
  c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText('t (s)', W - mr - 2, H - mb - 3);
}

let key1 = '';
function texts1() {
  const { w, T, ph } = d1(), A = D1.A, t = D1.t, th = w * t + ph;
  const x = A * Math.cos(th), v = -A * w * Math.sin(th), a = -A * w * w * Math.cos(th);
  const arg = phiTxt(D1.phi) === '0' ? fmt(w) + '·t' : fmt(w) + '·t + ' + phiTxt(D1.phi);
  const key = [A, D1.m, D1.k, D1.phi].join('|');
  if (key !== key1) {
    key1 = key;
    $('d1eX').textContent = 'x(t) = ' + fmtN(A) + '·cos(' + arg + ')   (m)';
    $('d1eV').textContent = 'v(t) = −' + fmt(A * w, 3) + '·sin(' + arg + ')   (m/s)';
    $('d1eA').textContent = 'a(t) = −' + fmt(A * w * w, 3) + '·cos(' + arg + ')   (m/s²)';
    $('d1eW').textContent = 'ω = √(k/m) = √(' + fmtN(D1.k) + '/' + fmtN(D1.m) + ') = ' + fmt(w) + ' rad/s';
    $('d1eT').textContent = 'T = 2π/ω = ' + fmt(T, 3) + ' s   f = 1/T = ' + fmt(1 / T) + ' Hz';
    $('d1scrub').max = (2 * T).toFixed(3);
  }
  $('d1rt').textContent = fmt(t) + ' s'; $('d1rx').textContent = fmt(x, 3) + ' m';
  $('d1rv').textContent = fmt(v) + ' m/s'; $('d1ra').textContent = fmt(a) + ' m/s²';
  $('d1rw').textContent = fmt(w) + ' rad/s'; $('d1rT').textContent = fmt(T, 3) + ' s';
  $('d1tout').textContent = 't = ' + fmt(t) + ' s';
  setScrub('d1scrub', t);
  $('d1pt').textContent = fmt(D1.phi, 0) + '° = ' + phiTxt(D1.phi) + ' rad';
  $('d1n1').textContent = 'x = ' + fmtN(A) + '·cos(' + fmt(th) + ') = ' + fmt(x, 3) + ' m';
  $('d1n2').textContent = 'v = −' + fmt(A * w, 3) + '·sin(' + fmt(th) + ') = ' + fmt(v) + ' m/s';
  $('d1n3').textContent = 'a = −ω²·x = −' + fmt(w * w) + '·(' + fmt(x, 3) + ') = ' + fmt(a) + ' m/s²';
  $('d1play').textContent = D1.play ? 'Pausa' : 'Continua';
}
register($('c1s'), step1, () => { drawScene1(); plotStack1(); texts1(); });

/* =====================================================
   DEMO 2 · energia
   ===================================================== */
const D2 = { A: 0.10, m: 0.5, k: 20, t: 0, play: true, speed: 0.5, mark: true };
const d2 = () => { const w = Math.sqrt(D2.k / D2.m); return { w, T: 2 * PI / w, Em: 0.5 * D2.k * D2.A * D2.A }; };
const wrap2 = () => { const { T } = d2(); D2.t = ((D2.t % (2 * T)) + 2 * T) % (2 * T); };
bind('d2A', 'd2An', D2, 'A', 0.02, 0.2, wrap2);
bind('d2k', 'd2kn', D2, 'k', 5, 100, wrap2);
bind('d2m', 'd2mn', D2, 'm', 0.1, 2, wrap2);
$('d2mark').onchange = e => D2.mark = e.target.checked;
segBind('d2seg', 'v', D2, 'speed');
$('d2play').onclick = () => { D2.play = !D2.play; };
$('d2reset').onclick = () => { D2.t = 0; };
$('d2scrub').addEventListener('input', e => { D2.t = +e.target.value; D2.play = false; });
scrubGuard('d2scrub');
function step2(dt) {
  if (!D2.play) return;
  const { T } = d2(); D2.t += dt * D2.speed; if (D2.t >= 2 * T) D2.t -= 2 * T;
}
let e2Max = 0;
function drawE2x() {
  const { c, W, H } = fit($('c2x'));
  const A = D2.A, k = D2.k, { w, Em } = d2();
  const tgt = Em * 1.3; e2Max = e2Max ? e2Max + (tgt - e2Max) * 0.15 : tgt; if (Math.abs(e2Max - tgt) < 1e-5 * tgt) e2Max = tgt;
  const ml = 52, mr = 12, mt = 16, mb = 26, XR = 0.22;
  const X = x => ml + (x + XR) / (2 * XR) * (W - ml - mr), Y = e => H - mb - e / e2Max * (H - mb - mt);
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const es = niceStep(e2Max, 4);
  c.lineWidth = 1; c.strokeStyle = TK.grid; c.beginPath();
  for (let e = 0; e <= e2Max + 1e-12; e += es) { const y = Math.round(Y(e)) + .5; c.moveTo(ml, y); c.lineTo(W - mr, y); }
  for (let x = -0.2; x <= 0.2001; x += 0.1) { const xx = Math.round(X(x)) + .5; c.moveTo(xx, mt); c.lineTo(xx, H - mb); }
  c.stroke();
  c.font = '10.5px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let e = 0; e <= e2Max + 1e-12; e += es) c.fillText(fmtN(+e.toPrecision(3)), ml - 6, Y(e));
  c.textAlign = 'center'; c.textBaseline = 'top';
  for (let x = -0.2; x <= 0.2001; x += 0.1) c.fillText(fmtN(Math.round(x * 10) / 10), X(x), H - mb + 6);
  c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText('x (m)', W - mr - 2, H - mb - 3); c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('E (J)', 6, 12);
  c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(ml + .5, mt); c.lineTo(ml + .5, H - mb); c.moveTo(ml, H - mb + .5); c.lineTo(W - mr, H - mb + .5); c.stroke();
  c.save(); c.beginPath(); c.rect(ml, mt - 2, W - ml - mr, H - mb - mt + 2); c.clip();
  // Ep(x)
  c.strokeStyle = TK.ep; c.lineWidth = 2.2; c.beginPath();
  for (let i = 0; i <= 120; i++) { const x = -XR + 2 * XR * i / 120, e = 0.5 * k * x * x; i ? c.lineTo(X(x), Y(e)) : c.moveTo(X(x), Y(e)); } c.stroke();
  // Em
  c.save(); c.setLineDash([6, 4]); c.strokeStyle = TK.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ml, Y(Em)); c.lineTo(W - mr, Y(Em)); c.stroke(); c.restore();
  // Ec(x)
  c.strokeStyle = TK.ec; c.lineWidth = 2.2; c.beginPath();
  for (let i = 0; i <= 100; i++) { const x = -A + 2 * A * i / 100, e = Em - 0.5 * k * x * x; i ? c.lineTo(X(x), Y(e)) : c.moveTo(X(x), Y(e)); } c.stroke();
  c.restore();
  // ±A
  c.save(); c.setLineDash([2, 3]); c.strokeStyle = TK.muted; c.lineWidth = 1;
  [-A, A].forEach(xx => { c.beginPath(); c.moveTo(X(xx), Y(0)); c.lineTo(X(xx), Y(Em)); c.stroke(); });
  c.restore();
  c.font = '11px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText('−A', X(-A), Y(Em) - 4); c.fillText('+A', X(A), Y(Em) - 4);
  // Ec = Ep
  if (D2.mark) {
    const xs = A / Math.SQRT2;
    c.save(); c.setLineDash([2, 3]); c.strokeStyle = TK.ink; c.lineWidth = 1.2;
    [-xs, xs].forEach(xx => { c.beginPath(); c.moveTo(X(xx), Y(0)); c.lineTo(X(xx), Y(Em / 2)); c.stroke(); });
    c.restore();
    c.fillStyle = TK.ink;
    [-xs, xs].forEach(xx => { c.beginPath(); c.arc(X(xx), Y(Em / 2), 3.5, 0, 7); c.fill(); });
    c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('Ec = Ep', X(xs) + 8, Y(Em / 2) - 8);
  }
  // posició actual
  const xN = A * Math.cos(w * D2.t), Ep = 0.5 * k * xN * xN;
  c.lineCap = 'butt'; c.lineWidth = 6;
  c.strokeStyle = TK.ep; c.beginPath(); c.moveTo(X(xN), Y(0)); c.lineTo(X(xN), Y(Ep)); c.stroke();
  c.strokeStyle = TK.ec; c.beginPath(); c.moveTo(X(xN), Y(Ep)); c.lineTo(X(xN), Y(Em)); c.stroke();
  c.fillStyle = TK.ball; c.beginPath(); c.arc(X(xN), Y(Ep), 5, 0, 7); c.fill();
}
function drawScene2() {
  const { c, W, H } = fit($('c2s'));
  const A = D2.A, k = D2.k, m = D2.m, { w, Em } = d2();
  const x = A * Math.cos(w * D2.t), v = -A * w * Math.sin(w * D2.t);
  const Ep = 0.5 * k * x * x, Ec = Math.max(0, Em - Ep);
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const barW = W < 520 ? 112 : Math.min(160, W * 0.24), leftW = W - barW - 10;
  const wallX = 26, cx = wallX + (leftW - wallX) / 2, kpx = ((leftW - wallX) / 2 - 40) / 0.2;
  const yc = H * 0.56, bw = 38, bh = 38, gy = yc + bh / 2;
  c.strokeStyle = TK.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(wallX - 10, gy + .5); c.lineTo(leftW - 6, gy + .5); c.stroke();
  c.fillStyle = TK.stone; c.fillRect(wallX - 10, yc - bh * 0.9, 10, bh * 1.4);
  // escala
  c.font = '11px ' + FM; c.fillStyle = TK.muted; c.strokeStyle = TK.muted; c.lineWidth = 1; c.textAlign = 'center'; c.textBaseline = 'top';
  for (let n = -2; n <= 2; n++) { const X = cx + n * 0.1 * kpx; c.beginPath(); c.moveTo(X, gy); c.lineTo(X, gy + 5); c.stroke(); c.fillText(fmtN(n * 0.1), X, gy + 8); }
  c.textAlign = 'right'; c.fillText('x (m)', leftW - 6, gy + 22);
  // posicions clau
  const top = 10;
  c.save(); c.setLineDash([4, 4]); c.strokeStyle = TK.muted;
  [-A, 0, A].forEach(xx => { const X = cx + xx * kpx; c.beginPath(); c.moveTo(X, top + 15); c.lineTo(X, gy); c.stroke(); });
  c.restore();
  c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = TK.muted;
  c.fillText('−A', cx - A * kpx, top); c.fillText('0', cx, top); c.fillText('+A', cx + A * kpx, top);
  if (D2.mark) {
    const xs = A / Math.SQRT2;
    c.save(); c.setLineDash([2, 3]); c.strokeStyle = TK.ink; c.lineWidth = 1.4;
    [-xs, xs].forEach(xx => { const X = cx + xx * kpx; c.beginPath(); c.moveTo(X, top + 31); c.lineTo(X, gy); c.stroke(); });
    c.restore();
    c.fillStyle = TK.ink;
    c.fillText('−A/√2', cx - xs * kpx, top + 16); c.fillText('+A/√2', cx + xs * kpx, top + 16);
  }
  // molla i bloc
  const bx = cx + x * kpx;
  c.strokeStyle = TK.ink; c.lineWidth = 2; c.lineJoin = 'round';
  spring(c, wallX, bx - bw / 2, yc, 12, 8);
  c.fillStyle = TK.wood; c.strokeStyle = TK.wood2; c.lineWidth = 2;
  c.fillRect(bx - bw / 2, yc - bh / 2, bw, bh); c.strokeRect(bx - bw / 2, yc - bh / 2, bw, bh);
  c.fillStyle = TK.surface; c.font = 'italic 500 14px ' + FB; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('m', bx, yc + 1);
  const lv = v / (A * w) * Math.min(60, leftW * 0.1);
  arrow(c, bx, yc - bh / 2 - 9, bx + lv, yc - bh / 2 - 9, TK.x, 2.4);
  if (Math.abs(lv) > 8) { c.fillStyle = TK.x; c.font = 'italic 500 13px ' + FB; c.textAlign = lv > 0 ? 'left' : 'right'; c.fillText('v', bx + lv + (lv > 0 ? 5 : -5), yc - bh / 2 - 9); }
  // barra d'energia
  const bx0 = leftW + (W < 520 ? 12 : 30), bw2 = W < 520 ? 26 : Math.min(46, barW - 80), bTop = 26, bBot = H - 22, bh2 = bBot - bTop;
  const hp = Ep / Em * bh2, hc = Ec / Em * bh2;
  c.fillStyle = TK.ep; c.fillRect(bx0, bBot - hp, bw2, hp);
  c.fillStyle = TK.ec; c.fillRect(bx0, bBot - hp - hc, bw2, hc);
  c.strokeStyle = TK.ink; c.lineWidth = 1.2; c.strokeRect(bx0 + .5, bTop + .5, bw2, bh2);
  if (D2.mark) { c.save(); c.setLineDash([2, 3]); c.strokeStyle = TK.ink; c.beginPath(); c.moveTo(bx0 - 4, bTop + bh2 / 2); c.lineTo(bx0 + bw2 + 4, bTop + bh2 / 2); c.stroke(); c.restore(); }
  const dE = Em < 0.01 ? 4 : 3, lx = bx0 + bw2 + 7;
  c.font = (W < 520 ? '10px ' : '11px ') + FM; c.textAlign = 'left'; c.textBaseline = 'middle';
  const yc1 = Math.min(bTop + Math.max(14, hc / 2), bBot - 44), yp1 = Math.max(bBot - Math.max(14, hp / 2), bTop + 44);
  c.fillStyle = TK.ec; c.fillText('Ec ' + fmt(Ec / Em * 100, 0) + ' %', lx, yc1 - 7); c.fillText(fmt(Ec, dE) + ' J', lx, yc1 + 7);
  c.fillStyle = TK.ep; c.fillText('Ep ' + fmt(Ep / Em * 100, 0) + ' %', lx, yp1 - 7); c.fillText(fmt(Ep, dE) + ' J', lx, yp1 + 7);
  c.fillStyle = TK.ink; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText('Em = ' + fmt(Em, dE) + ' J', W - 6, bTop - 4);
}
function drawE2t() {
  const { c, W, H } = fit($('c2t'));
  const { w, T, Em } = d2(), tMax = 2 * T, t = D2.t;
  const ml = 52, mr = 12, mt = 16, mb = 26, ym = Em * 1.15;
  const X = tt => ml + tt / tMax * (W - ml - mr), Y = e => H - mb - e / ym * (H - mb - mt);
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const es = niceStep(ym, 4);
  c.lineWidth = 1; c.strokeStyle = TK.grid; c.beginPath();
  for (let e = 0; e <= ym + 1e-12; e += es) { const y = Math.round(Y(e)) + .5; c.moveTo(ml, y); c.lineTo(W - mr, y); }
  for (let q = 0; q <= 8; q++) { const xx = Math.round(X(q * T / 4)) + .5; c.moveTo(xx, mt); c.lineTo(xx, H - mb); }
  c.stroke();
  c.font = '10.5px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let e = 0; e <= ym + 1e-12; e += es) c.fillText(fmtN(+e.toPrecision(3)), ml - 6, Y(e));
  c.textAlign = 'center'; c.textBaseline = 'top';
  for (let q = 0; q <= 4; q++) c.fillText(fmt(q * T / 2), X(q * T / 2), H - mb + 6);
  c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText('t (s)', W - mr - 2, H - mb - 3); c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText('E (J)', 6, 12);
  c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(ml + .5, mt); c.lineTo(ml + .5, H - mb); c.moveTo(ml, H - mb + .5); c.lineTo(W - mr, H - mb + .5); c.stroke();
  c.save(); c.setLineDash([6, 4]); c.strokeStyle = TK.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ml, Y(Em)); c.lineTo(W - mr, Y(Em)); c.stroke(); c.restore();
  const fs = [{ f: tt => Em * Math.sin(w * tt) ** 2, col: TK.ec }, { f: tt => Em * Math.cos(w * tt) ** 2, col: TK.ep }];
  fs.forEach(s => {
    c.save(); c.setLineDash([4, 4]); c.globalAlpha = 0.4; c.strokeStyle = s.col; c.lineWidth = 1.5; curve(c, s.f, 0, tMax, X, Y); c.stroke(); c.restore();
    if (t > 0) { c.strokeStyle = s.col; c.lineWidth = 2.2; curve(c, s.f, 0, t, X, Y, Math.max(8, Math.ceil(120 * t / tMax))); c.stroke(); }
    c.fillStyle = s.col; c.beginPath(); c.arc(X(t), Y(s.f(t)), 4, 0, 7); c.fill();
  });
  c.save(); c.setLineDash([2, 3]); c.strokeStyle = TK.muted; c.lineWidth = 1; c.beginPath(); c.moveTo(X(t) + .5, mt); c.lineTo(X(t) + .5, H - mb); c.stroke(); c.restore();
}
let key2 = '';
function texts2() {
  const { w, T, Em } = d2(), A = D2.A, k = D2.k, m = D2.m, t = D2.t;
  const x = A * Math.cos(w * t), v = -A * w * Math.sin(w * t);
  const Ep = 0.5 * k * x * x, Ec = 0.5 * m * v * v;
  $('d2rx').textContent = fmt(x, 3) + ' m'; $('d2rv').textContent = fmt(v) + ' m/s';
  $('d2rc').textContent = fmt(Ec, 4) + ' J'; $('d2rp').textContent = fmt(Ep, 4) + ' J';
  $('d2rm').textContent = fmt(Em, 4) + ' J'; $('d2rT').textContent = fmt(T, 3) + ' s';
  $('d2tout').textContent = 't = ' + fmt(t) + ' s';
  setScrub('d2scrub', t);
  $('d2n1').textContent = 'Ep = ½·k·x² = ½·' + fmtN(k) + '·(' + fmt(x, 3) + ')² = ' + fmt(Ep, 4) + ' J';
  $('d2n2').textContent = 'Ec = ½·m·v² = ½·' + fmtN(m) + '·(' + fmt(v, 3) + ')² = ' + fmt(Ec, 4) + ' J';
  $('d2n3').innerHTML = 'Em = <span class="tec">Ec</span> + <span class="tep">Ep</span> = <span class="tec">' + fmt(Ec, 4) + '</span> + <span class="tep">' + fmt(Ep, 4) + '</span> = ' + fmt(Ec + Ep, 4) + ' J = ½·k·A² (constant)';
  const key = [A, k, m].join('|'); if (key !== key2) { key2 = key; $('d2scrub').max = (2 * T).toFixed(3); }
  $('d2play').textContent = D2.play ? 'Pausa' : 'Continua';
}
register($('c2s'), step2, () => { drawScene2(); drawE2x(); drawE2t(); texts2(); });

/* =====================================================
   DEMO 3 · pèndol
   ===================================================== */
const D3 = { L: 1, g: 9.81, th0: 10, m: 0.5, play: true, speed: 0.5, frc: true };
const S3 = { t: 0 };
function reset3() { S3.t = 0; }
bind('d3L', 'd3Ln', D3, 'L', 0.2, 2.5, reset3);
bind('d3a', 'd3an', D3, 'th0', 1, 15, reset3);
bind('d3m', 'd3mn', D3, 'm', 0.1, 2, () => {});
const mark3 = () => document.querySelectorAll('#d3gseg button').forEach(b => b.setAttribute('aria-pressed', Math.abs(+b.dataset.g - D3.g) < 1e-6));
document.querySelectorAll('#d3gseg button').forEach(b => b.onclick = () => { D3.g = +b.dataset.g; mark3(); reset3(); });
mark3();
segBind('d3seg', 'v', D3, 'speed');
$('d3frc').onchange = e => D3.frc = e.target.checked;
$('d3play').onclick = () => { D3.play = !D3.play; };
$('d3reset').onclick = reset3;
function step3(dt) { if (D3.play) S3.t += dt * D3.speed; }
function drawPend() {
  const { c, W, H } = fit($('c3'));
  c.fillStyle = TK.surface; c.fillRect(0, 0, W, H);
  const w = Math.sqrt(D3.g / D3.L), T = 2 * PI / w;
  const th = D3.th0 * DEG * Math.cos(w * S3.t);
  const px = W / 2, py = 34;
  const Pl = Math.min(150, H * 0.27), kp = (H - py - Pl - 30) / Math.max(D3.L, 1.2), Lp = D3.L * kp;
  // suport, vertical i arc de l'oscil·lació
  c.fillStyle = TK.stone; c.fillRect(px - 60, py - 12, 120, 10);
  c.save(); c.setLineDash([3, 4]); c.lineWidth = 1.2;
  c.strokeStyle = TK.grid2; c.beginPath(); c.arc(px, py, Lp, PI / 2 - D3.th0 * DEG, PI / 2 + D3.th0 * DEG); c.stroke();
  c.strokeStyle = TK.muted; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + Lp + 26); c.stroke(); c.restore();
  const bx = px + Lp * Math.sin(th), by = py + Lp * Math.cos(th);
  // angle
  if (Math.abs(th) > 0.5 * DEG) {
    c.strokeStyle = TK.ink; c.lineWidth = 1.1; c.beginPath();
    c.arc(px, py, Math.min(46, Lp * 0.4), PI / 2, PI / 2 - th, th > 0); c.stroke();
    c.fillStyle = TK.ink; c.font = 'italic 500 13px ' + FB; c.textAlign = th > 0 ? 'left' : 'right'; c.textBaseline = 'middle';
    c.fillText('θ', px + (th > 0 ? 6 : -6), py + Math.min(46, Lp * 0.4) + 10);
  }
  // fil i massa
  const r = 7 + D3.m * 5;
  c.strokeStyle = TK.ink; c.lineWidth = 1.8; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
  c.fillStyle = TK.ball; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
  c.fillStyle = TK.ink; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill();
  // forces: pes i components (el pes es dibuixa sempre amb la mateixa llargada; el valor és a les lectures)
  if (D3.frc) {
    const P = Pl, s = Math.sin(th), co = Math.cos(th);
    const tx = -s * co * P, ty = s * s * P;        // component tangencial (cap a l'equilibri)
    const nx = s * co * P, ny = co * co * P;        // component en la direcció del fil
    c.save(); c.setLineDash([4, 3]); c.strokeStyle = TK.muted; c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx + tx, by + ty); c.lineTo(bx, by + P); c.lineTo(bx + nx, by + ny); c.stroke(); c.restore();
    arrow(c, bx, by, bx + nx, by + ny, TK.grid2, 2);
    // tensió: cap al punt de suspensió, a la mateixa escala que el pes
    const vth = -D3.th0 * DEG * w * Math.sin(w * S3.t), FTr = co + D3.L * vth * vth / D3.g;
    const ux = (px - bx) / Lp, uy = (py - by) / Lp;
    arrow(c, bx, by, bx + ux * P * FTr, by + uy * P * FTr, TK.t, 2.6);
    c.fillStyle = TK.t; c.font = 'italic 500 13px ' + FB; c.textAlign = th > 0 ? 'right' : 'left'; c.textBaseline = 'middle';
    c.fillText('FT', bx + ux * P * FTr * 0.55 + (th > 0 ? -8 : 8), by + uy * P * FTr * 0.55);
    arrow(c, bx, by, bx, by + P, TK.muted, 2.4);
    arrow(c, bx, by, bx + tx, by + ty, TK.f, 2.8);
    c.font = 'italic 500 13px ' + FB; c.textBaseline = 'middle';
    c.fillStyle = TK.muted; c.textAlign = 'left'; c.fillText('P = m·g', bx + 8, by + P + 4);
    if (Math.abs(tx) > 6) { c.fillStyle = TK.f; c.textAlign = tx < 0 ? 'right' : 'left'; c.fillText('F', bx + tx + (tx < 0 ? -6 : 6), by + ty); }
  }
  c.font = '12px ' + FM; c.fillStyle = TK.muted; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText('θ₀ = ' + D3.th0 + '°', 12, H - 16);
  c.textAlign = 'right'; c.fillText('L = ' + fmt(D3.L) + ' m · m = ' + fmt(D3.m) + ' kg', W - 12, H - 16);
  // lectures
  const F = -D3.m * D3.g * Math.sin(th);
  const vth3 = -D3.th0 * DEG * w * Math.sin(w * S3.t), v = D3.L * vth3;
  const FT = D3.m * D3.g * Math.cos(th) + D3.m * v * v / D3.L;
  $('d3rt').textContent = fmt(S3.t) + ' s'; $('d3rth').textContent = fmt(th / DEG, 1) + '°';
  $('d3rv').textContent = fmt(v, 3) + ' m/s'; $('d3rF').textContent = fmt(F, 3) + ' N';
  $('d3rFT').textContent = fmt(FT, 3) + ' N'; $('d3rT').textContent = fmt(T, 3) + ' s';
  $('d3n3').textContent = 'v = −L·θ₀·ω·sin(ω·t) = ' + fmt(v, 3) + ' m/s   (θ₀ en rad)';
  $('d3n4').textContent = 'FT = m·g·cos θ + m·v²/L = ' + fmtN(D3.m) + '·' + fmtN(D3.g) + '·cos(' + fmt(th / DEG, 1) + '°) + ' + fmtN(D3.m) + '·(' + fmt(v, 3) + ')²/' + fmtN(D3.L) + ' = ' + fmt(FT, 3) + ' N';
  $('d3n1').textContent = 'θ = θ₀·cos(ω·t) = ' + D3.th0 + '°·cos(' + fmt(w) + '·' + fmt(S3.t) + ') = ' + fmt(th / DEG, 1) + '°';
  $('d3n2').textContent = 'F = −m·g·sin θ = −' + fmtN(D3.m) + '·' + fmtN(D3.g) + '·sin(' + fmt(th / DEG, 1) + '°) = ' + fmt(F, 3) + ' N';
  $('d3play').textContent = D3.play ? 'Pausa' : 'Continua';
}
register($('c3'), step3, drawPend);

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
  { g: 1, ti: 'Llegir una equació', hint: 'Compara amb x = A·cos(ω·t + φ). Per a la velocitat i l\'acceleració, deriva o utilitza els valors màxims A·ω i A·ω².',
    q: '<p>Un cos descriu un MHS d\'equació <i>x</i>(<i>t</i>) = 0,05·cos(4π·<i>t</i> + π/3) (unitats SI). Determina:</p>' + P([
      'l\'amplitud, la pulsació, el període, la freqüència i la fase inicial;',
      'la posició inicial;',
      'l\'equació de la velocitat i la velocitat màxima;',
      'l\'acceleració màxima.']),
    s: P([
      'A = ' + R('0,05 m') + '; ω = 4π = ' + R('12,57 rad/s') + '; T = 2π/ω = ' + R('0,50 s') + '; f = 1/T = ' + R('2,0 Hz') + '; φ = ' + R('π/3 rad') + '.',
      'x(0) = 0,05·cos(π/3) = ' + R('0,025 m') + '.',
      'v(t) = −A·ω·sin(ωt + φ) = ' + R('−0,63·sin(4π·t + π/3) m/s') + '; v<sub>màx</sub> = A·ω = 0,05·4π = ' + R('0,63 m/s') + '.',
      'a<sub>màx</sub> = A·ω² = 0,05·(4π)² = ' + R('7,9 m/s²') + '.']) },
  { g: 1, ti: 'Escriure l\'equació', hint: 'Si x(0) = +A, aleshores cos φ = 1. Posa la calculadora en radians.',
    q: '<p>Una partícula oscil·la amb una amplitud de 8 cm i un període de 2 s. En <i>t</i> = 0 es troba en l\'extrem positiu (<i>x</i> = +<i>A</i>).</p>' + P([
      'Escriu l\'equació <i>x</i>(<i>t</i>).',
      'Quina posició i quina velocitat té en <i>t</i> = 0,5 s?']),
    s: P([
      'A = 0,08 m; ω = 2π/T = π rad/s; x(0) = A → cos φ = 1 → φ = 0. Per tant ' + R('x(t) = 0,08·cos(π·t) m') + '.',
      'x(0,5) = 0,08·cos(π/2) = ' + R('0 m') + ' (passa per l\'equilibri). v(t) = −0,08π·sin(π·t) → v(0,5) = ' + R('−0,25 m/s') + '. El signe negatiu indica que es mou cap a x negatives, és a dir, cap a l\'equilibri des de +A.']) },
  { g: 1, ti: 'Massa–molla', hint: 'ω = √(k/m), i després T = 2π/ω.',
    q: '<p>Una massa de 0,40 kg, unida a una molla horitzontal de constant <i>k</i> = 25 N/m, oscil·la sense fricció. Calcula la pulsació, el període i la freqüència del moviment.</p>',
    s: '<p>ω = √(k/m) = √(25/0,40) = ' + R('7,91 rad/s') + '. T = 2π/ω = ' + R('0,79 s') + '. f = 1/T = ' + R('1,26 Hz') + '.</p><p>Aquests valors no depenen de l\'amplitud.</p>' },
  { g: 1, ti: 'Pèndol simple', hint: 'T = 2π·√(L/g). Per aïllar L, eleva al quadrat els dos membres.',
    q: '<p>Un pèndol simple té una longitud de 1,00 m.</p>' + P([
      'Calcula\'n el període a la Terra (<i>g</i> = 9,81 m/s²) i a la Lluna (<i>g</i> = 1,62 m/s²).',
      'Quina longitud ha de tenir a la Terra perquè el període sigui 1,00 s?']),
    s: P([
      'T<sub>Terra</sub> = 2π√(1,00/9,81) = ' + R('2,01 s') + '; T<sub>Lluna</sub> = 2π√(1,00/1,62) = ' + R('4,94 s') + ' (2,46 vegades més gran, perquè la gravetat és menor).',
      'T² = 4π²·L/g → L = g·T²/(4π²) = 9,81·1,00²/(4π²) = ' + R('0,248 m') + ' (uns 25 cm).']) },

  { g: 2, ti: 'Molla penjada', hint: 'En l\'equilibri, el pes i la força elàstica s\'igualen: k·Δx = m·g. Si s\'amolla des del repòs, l\'amplitud és el desplaçament inicial.',
    q: '<p>Una molla penja verticalment i s\'allarga 10,0 cm quan hi pengem una massa de 0,200 kg. (<i>g</i> = 9,81 m/s²)</p>' + P([
      'Calcula la constant elàstica <i>k</i>.',
      'Separem la massa 3,0 cm cap avall de la posició d\'equilibri i la deixem anar. Calcula el període, la velocitat màxima i l\'acceleració màxima.']),
    s: P([
      'k·Δx = m·g → k = 0,200·9,81/0,100 = ' + R('19,6 N/m') + '.',
      'ω = √(k/m) = √(19,62/0,200) = 9,90 rad/s → T = 2π/ω = ' + R('0,634 s') + '. A = 0,030 m (s\'amolla en repòs). v<sub>màx</sub> = A·ω = 0,030·9,90 = ' + R('0,30 m/s') + '; a<sub>màx</sub> = A·ω² = 0,030·98,1 = ' + R('2,9 m/s²') + '.']) +
      '<p>El pes només desplaça l\'equilibri; l\'oscil·lació al voltant d\'ell té ω = √(k/m). Comprovació: T = 2π√(Δx/g) també dóna 0,634 s.</p>' },
  { g: 2, ti: 'Energia en un oscil·lador', hint: 'E<sub>m</sub> = ½kA² és constant. E<sub>c</sub> = E<sub>m</sub> − E<sub>p</sub>. ',
    q: '<p>Un oscil·lador té <i>m</i> = 0,250 kg, <i>k</i> = 64,0 N/m i una amplitud de 5,00 cm.</p>' + P([
      'Calcula l\'energia mecànica.',
      'Calcula <i>E</i><sub>c</sub>, <i>E</i><sub>p</sub> i la velocitat quan <i>x</i> = 3,00 cm.',
      'Quina és la velocitat màxima?',
      'En quina posició <i>E</i><sub>c</sub> = <i>E</i><sub>p</sub>?']),
    s: P([
      'E<sub>m</sub> = ½·k·A² = ½·64,0·0,0500² = ' + R('0,0800 J') + '.',
      'E<sub>p</sub> = ½·64,0·0,0300² = ' + R('0,0288 J') + '; E<sub>c</sub> = E<sub>m</sub> − E<sub>p</sub> = ' + R('0,0512 J') + '; v = √(2·E<sub>c</sub>/m) = √(2·0,0512/0,250) = ' + R('0,640 m/s') + '.',
      'v<sub>màx</sub> = A·ω = 0,0500·16,0 = ' + R('0,800 m/s') + ' (a x = 0, on E<sub>c</sub> = E<sub>m</sub>).',
      'E<sub>c</sub> = E<sub>p</sub> → E<sub>p</sub> = E<sub>m</sub>/2 → ½kx² = ¼kA² → x = ±A/√2 = ' + R('±3,54 cm') + '.']) },
  { g: 2, ti: 'Quant triga?', hint: 'Isola t de la condició x = 5 cm. Pensa en angles: sin(πt) = 0,5 quan πt = π/6.',
    q: '<p>Una partícula descriu un MHS d\'amplitud 10 cm i període 2,0 s. Passa per <i>x</i> = 0 en <i>t</i> = 0 amb velocitat positiva, de manera que <i>x</i>(<i>t</i>) = 0,10·sin(π·<i>t</i>) (SI).</p>' + P([
      'Quant triga a arribar a <i>x</i> = 5,0 cm per primera vegada?',
      'Quant triga a anar de <i>x</i> = 5,0 cm a l\'extrem (<i>x</i> = 10 cm)?',
      'Compara els dos temps i explica per què no són iguals.']),
    s: P([
      '0,05 = 0,10·sin(π·t) → sin(π·t) = 0,5 → π·t = π/6 → t = 1/6 = ' + R('0,17 s') + '.',
      'L\'extrem s\'assoleix quan π·t = π/2 → t = 0,50 s (T/4). El temps de 5 cm a 10 cm és 0,50 − 0,167 = ' + R('0,33 s') + '.',
      'Els primers 5 cm es recorren en 0,17 s i els últims 5 cm en 0,33 s, el doble. Prop de l\'equilibri la velocitat és màxima i prop de l\'extrem tendeix a 0, i per això el recorregut final és més lent.']) }
];
const GROUPS = {
  1: ['★', 'Aplicació directa'],
  2: ['★★', 'Combinació de conceptes']
};
(function render() {
  const box = $('exlist'); if (!box) return;
  let n = 0, html = '';
  [1, 2].forEach(g => {
    html += '<div class="exgroup" id="nivell-' + g + '"><h3><span class="stars">' + GROUPS[g][0] + '</span>' + GROUPS[g][1] + '</h3>';
    EX.filter(e => e.g === g).forEach(e => {
      n++;
      html += '<article class="panel ex" id="ex-' + n + '"><div class="eh"><span class="num">' + n + '.</span><h4 class="ttl">' + e.ti + '</h4><a class="perma" href="#ex-' + n + '" aria-label="Enllaç directe a aquest exercici" title="Copia l\'enllaç d\'aquest exercici">#</a>' + (e.src ? (e.link ? '<a class="chip" href="' + e.link + '" target="_blank" rel="noopener" title="Enunciat original">' + e.src + '</a>' : '<span class="chip">' + e.src + '</span>') : '') + '</div>' +
        e.q +
        '<details class="sol"><summary>Solució</summary><div class="body">' + e.s + '</div></details></article>';
    });
    html += '</div>';
  });
  box.innerHTML = html;
  // els problemes de les PAU (bloc #pau, generat) continuen la numeració
  document.querySelectorAll('#pau .ex .num').forEach(e => { e.textContent = (++n) + '.'; });
})();

/* ---------- gràfica del formulari ---------- */
document.querySelectorAll('svg.xva').forEach(function formSvg(svg) {
  const W = 560, H = 150, ml = 34, mr = 60, mid = 72, amp = 50, NS = 'http://www.w3.org/2000/svg';
  const X = u => ml + u * (W - ml - mr);
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  for (let q = 0; q <= 4; q++) {
    svg.appendChild(el('line', { x1: X(q / 4), x2: X(q / 4), y1: mid - amp - 4, y2: mid + amp + 4, stroke: 'var(--grid2)', 'stroke-width': 1 }));
    const t = el('text', { x: X(q / 4), y: H - 6, 'text-anchor': 'middle', 'font-size': 11, 'font-family': FM, fill: 'var(--muted)' });
    t.textContent = ['0', 'T/4', 'T/2', '3T/4', 'T'][q]; svg.appendChild(t);
  }
  svg.appendChild(el('line', { x1: ml, x2: W - mr + 6, y1: mid, y2: mid, stroke: 'var(--muted)', 'stroke-width': 1 }));
  if (svg.dataset.temps) {
    const yh = mid - amp * 0.5, xt = X(1 / 6);
    svg.appendChild(el('line', { x1: ml, x2: xt, y1: yh, y2: yh, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    svg.appendChild(el('line', { x1: xt, x2: xt, y1: yh, y2: mid + amp + 4, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    svg.appendChild(el('circle', { cx: xt, cy: yh, r: 4, fill: 'var(--ink)' }));
    svg.appendChild(el('circle', { cx: X(0.25), cy: mid, r: 4, fill: 'var(--ink)' }));
    const t1 = el('text', { x: ml - 4, y: yh + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': FM, fill: 'var(--ink)' }); t1.textContent = 'A/2'; svg.appendChild(t1);
    const t0 = el('text', { x: ml - 4, y: mid - amp + 4, 'text-anchor': 'end', 'font-size': 11, 'font-family': FM, fill: 'var(--ink)' }); t0.textContent = 'A'; svg.appendChild(t0);
    const t2 = el('text', { x: xt, y: H - 6, 'text-anchor': 'middle', 'font-size': 11, 'font-family': FM, fill: 'var(--ink)' }); t2.textContent = 'T/6'; svg.appendChild(t2);
  }
  const S = [['x', u => Math.cos(2 * PI * u), 'var(--ink)', 1], ['v', u => -Math.sin(2 * PI * u), 'var(--x)', 0.75], ['a', u => -Math.cos(2 * PI * u), 'var(--y)', 0.9]];
  S.forEach(([n, f, col, k], i) => {
    let d = '';
    for (let j = 0; j <= 100; j++) { const u = j / 100; d += (j ? 'L' : 'M') + X(u).toFixed(1) + ' ' + (mid - amp * k * f(u)).toFixed(1); }
    svg.appendChild(el('path', { d, fill: 'none', stroke: col, 'stroke-width': 2.2 }));
    const t = el('text', { x: W - mr + 12, y: mid - amp * k * f(1) + 4 + [0, -2, 0][i], 'font-size': 13, 'font-style': 'italic', 'font-family': FB, fill: col });
    t.textContent = n + (n === 'x' ? ' (A)' : n === 'v' ? ' (Aω)' : ' (Aω²)'); svg.appendChild(t);
  });
});

const SVGNS = 'http://www.w3.org/2000/svg';
const sel = (n, a, txt) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
/* ---------- gràfiques de l'energia (E–x i E–t) ---------- */
document.querySelectorAll('svg.en').forEach(svg => {
  const vb = svg.viewBox.baseVal, W = vb.width, H = vb.height, gap = 36, pw = (W - gap) / 2;
  const mt = 24, mb = 34, ml = 38, mr = 12;
  const T = (x, y, t, a, col, it, fs) => svg.appendChild(sel('text', { x, y, 'text-anchor': a || 'middle', 'font-size': fs || 11, 'font-family': it ? FB : FM, 'font-style': it ? 'italic' : 'normal', fill: col || 'var(--muted)' }, t));
  let lx = W / 2 - 110;
  [['Ec', 'var(--ec)'], ['Ep', 'var(--ep)'], ['Em', 'var(--ink)']].forEach(([n, c], i) => {
    svg.appendChild(sel('line', { x1: lx, x2: lx + 18, y1: 10, y2: 10, stroke: c, 'stroke-width': 2.4, 'stroke-dasharray': i === 2 ? '5 3' : 'none' }));
    T(lx + 23, 14, n, 'start', c, true, 12); lx += 78;
  });
  const panel = (x0, xs, fns, ticks, extra) => {
    const X = u => x0 + ml + (u - xs[0]) / (xs[1] - xs[0]) * (pw - ml - mr), Y = e => H - mb - e / 1.2 * (H - mb - mt);
    svg.appendChild(sel('line', { x1: x0 + ml, x2: x0 + pw - mr, y1: Y(0), y2: Y(0), stroke: 'var(--muted)' }));
    svg.appendChild(sel('line', { x1: X(xs[0]), x2: X(xs[0]), y1: Y(1.2), y2: Y(0), stroke: 'var(--muted)' }));
    T(x0 + ml - 5, Y(1) + 4, 'Em', 'end'); T(x0 + ml - 5, Y(0.5) + 4, 'Em/2', 'end');
    svg.appendChild(sel('line', { x1: X(xs[0]), x2: X(xs[1]), y1: Y(1), y2: Y(1), stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
    ticks.forEach(([u, t, row]) => { svg.appendChild(sel('line', { x1: X(u), x2: X(u), y1: Y(0), y2: Y(0) + (row ? 16 : 4), stroke: 'var(--muted)', 'stroke-dasharray': row ? '2 2' : 'none' })); T(X(u), row ? H - 4 : H - 18, t); });
    if (extra) extra(X, Y);
    fns.forEach(([f, c, a, b]) => {
      let d = ''; for (let j = 0; j <= 120; j++) { const u = a + (b - a) * j / 120; d += (j ? 'L' : 'M') + X(u).toFixed(1) + ' ' + Y(f(u)).toFixed(1); }
      svg.appendChild(sel('path', { d, fill: 'none', stroke: c, 'stroke-width': 2.4 }));
    });
  };
  const r2 = 1 / Math.SQRT2;
  panel(0, [-1.25, 1.25], [[u => u * u, 'var(--ep)', -1.08, 1.08], [u => 1 - u * u, 'var(--ec)', -1, 1]],
    [[-1, '−A'], [-r2, '−A/√2', 1], [0, '0'], [r2, '+A/√2', 1], [1, '+A']],
    (X, Y) => { [-r2, r2].forEach(u => svg.appendChild(sel('line', { x1: X(u), x2: X(u), y1: Y(0.5), y2: Y(0), stroke: 'var(--grid2)', 'stroke-dasharray': '3 3' }))); T(X(1.25), Y(0) - 6, 'x', 'end', 'var(--ink)', true, 13); });
  panel(pw + gap, [0, 1], [[u => Math.cos(2 * PI * u) ** 2, 'var(--ep)', 0, 1], [u => Math.sin(2 * PI * u) ** 2, 'var(--ec)', 0, 1]],
    [[0, '0'], [0.25, 'T/4'], [0.5, 'T/2'], [0.75, '3T/4'], [1, 'T']],
    (X, Y) => T(X(1), Y(0) - 6, 't', 'end', 'var(--ink)', true, 13));
});

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
    { id: 'metode', t: 'Com atacar un problema', items: () => [{ id: 'metode', t: 'Passos' }, { id: 'errades', t: 'Errades típiques' }, { id: 'exemple', t: 'Exemple resolt' }] },
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
