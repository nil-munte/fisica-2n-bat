/* Problemes de les PAU: filtres per nivell i per tema (generat per eines/genera_pau.py a partir de eines/plantilles/pau.js) */
(() => {
  const box = document.getElementById('pau');
  if (!box) return;
  const barN = box.querySelector('.pau-filtre:not(.pau-filtre-et)'), barE = box.querySelector('.pau-filtre-et');
  const buit = box.querySelector('.pau-buit');
  const exs = [...box.querySelectorAll('.ex.pau')];
  const KEY = 'pau-filtre:' + location.pathname;
  // als índexs de la pàgina, els números dels problemes que els filtres amaguen es mostren atenuats
  const ocults = document.head.appendChild(document.createElement('style'));
  const estat = { n: '0', et: '' };
  function aplica() {
    barN.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === estat.n)));
    if (barE) barE.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.et === estat.et)));
    const amagats = exs.filter(e => {
      const fora = (estat.n !== '0' && e.dataset.nivell !== estat.n) ||
                   (estat.et && !(e.dataset.etiquetes || '').split(' ').includes(estat.et));
      e.classList.toggle('fora', fora);
      return fora;
    });
    if (buit) buit.hidden = amagats.length < exs.length;
    ocults.textContent = amagats.map(e => `a[href="#${e.id}"]:not(.perma)`).join(',') + (amagats.length ? '{opacity:.4}' : '');
    try { localStorage.setItem(KEY, estat.n); } catch (e) { /* sense emmagatzematge */ }
  }
  function tots() { estat.n = '0'; estat.et = ''; aplica(); }
  barN.addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) { estat.n = b.dataset.f; aplica(); } });
  if (barE) barE.addEventListener('click', e => {
    const b = e.target.closest('button[data-et]'); if (!b) return;
    estat.et = b.dataset.et; aplica();
    const u = new URL(location.href);   // l'URL recorda l'etiqueta triada, per poder-la compartir
    if (estat.et) u.searchParams.set('etiqueta', estat.et); else u.searchParams.delete('etiqueta');
    history.replaceState(null, '', u);
  });
  // un enllaç a un problema amagat pels filtres (p. ex. el número a la barra de navegació) els treu
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#pau-"]');
    const t = a && document.getElementById(a.getAttribute('href').slice(1));
    if (t && t.matches('.ex.pau.fora')) tots();
  }, true);
  try { const v = localStorage.getItem(KEY); if (['0', '1', '2', '3'].includes(v)) estat.n = v; } catch (e) { /* sense emmagatzematge */ }
  const et = new URLSearchParams(location.search).get('etiqueta');
  if (et && barE && barE.querySelector(`button[data-et="${CSS.escape(et)}"]`)) estat.et = et;
  aplica();
  // si s'arriba amb un enllaç a un problema amagat pels filtres, es mostren tots
  function obre() {
    const t = location.hash && document.getElementById(location.hash.slice(1));
    if (t && t.matches('.ex.pau.fora')) { tots(); t.scrollIntoView(); }
  }
  addEventListener('hashchange', obre); obre();
})();
