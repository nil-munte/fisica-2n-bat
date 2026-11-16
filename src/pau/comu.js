/* JavaScript comú de la pàgina dels exàmens (pau/) i de la pàgina de cada examen (pau/<examen>/) */

/* ---------- fletxa: desa el PDF ----------
   L'atribut download no sempre n'hi ha prou (alguns visors el passen per alt i obren el PDF a la mateixa pestanya):
   es baixa el fitxer i es desa des d'un blob. Si no es pot (p. ex. pàgina oberta com a fitxer local), fa el normal. */
document.addEventListener('click', async e => {
  const a = e.target.closest('a.ic[download]'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  try {
    const r = await fetch(a.href); if (!r.ok) throw new Error(r.status);
    const url = URL.createObjectURL(await r.blob());
    const tmp = Object.assign(document.createElement('a'), { href: url, download: a.getAttribute('download') });
    document.body.append(tmp); tmp.click(); tmp.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) { window.open(a.href, '_blank', 'noopener'); }
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
