/* Problemes de les PAU: filtre per nivell (generat per eines/genera_pau.py a partir de eines/plantilles/pau.js) */
(() => {
  const box = document.getElementById('pau');
  if (!box) return;
  const bar = box.querySelector('.pau-filtre'), buit = box.querySelector('.pau-buit');
  const KEY = 'pau-filtre:' + location.pathname;
  // als índexs de la pàgina, els números dels problemes que el filtre amaga es mostren atenuats
  const ocults = document.head.appendChild(document.createElement('style'));
  function set(v) {
    if (v === '0') delete box.dataset.filtre; else box.dataset.filtre = v;
    bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === v)));
    const exs = [...box.querySelectorAll('.ex.pau')], amagats = exs.filter(e => v !== '0' && e.dataset.nivell !== v);
    if (buit) buit.hidden = amagats.length < exs.length;
    ocults.textContent = amagats.map(e => `a[href="#${e.id}"]:not(.perma)`).join(',') + (amagats.length ? '{opacity:.4}' : '');
    try { localStorage.setItem(KEY, v); } catch (e) { /* sense emmagatzematge */ }
  }
  // un enllaç a un problema amagat pel filtre (p. ex. el número a la barra de navegació) torna a mostrar-los tots
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#pau-"]');
    const t = a && document.getElementById(a.getAttribute('href').slice(1));
    if (t && t.matches('.ex.pau') && t.offsetParent === null) set('0');
  }, true);
  bar.addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) set(b.dataset.f); });
  let v = '0';
  try { v = localStorage.getItem(KEY) || '0'; } catch (e) { /* sense emmagatzematge */ }
  set(['0', '1', '2', '3'].includes(v) ? v : '0');
  // si s'arriba amb un enllaç a un problema amagat pel filtre, es mostren tots
  function obre() {
    const t = location.hash && document.getElementById(location.hash.slice(1));
    if (t && t.matches('.ex.pau') && t.offsetParent === null) { set('0'); t.scrollIntoView(); }
  }
  addEventListener('hashchange', obre); obre();
})();
