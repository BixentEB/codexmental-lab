/* ======================================================================
   LABORATOIRE — typographie française (reprise de l'Observatoire)
   Espaces insécables avant « : ; ! ? » et à l'intérieur des guillemets « » :
   la ponctuation ne part jamais seule en début de ligne. Appliqué à tout le texte affiché,
   y compris celui ajouté plus tard (consoles, pages, étiquettes), sans toucher aux sources.
   ====================================================================== */
(function () {
  'use strict';
  var NB = ' ', NNB = ' ';
  var RE_BEFORE = /[ \t\n]+([:;!?»])/g, RE_AFTER = /«[ \t\n]+/g;
  function fix(t) {
    if (t.indexOf(':') < 0 && t.indexOf(';') < 0 && t.indexOf('!') < 0 && t.indexOf('?') < 0 && t.indexOf('«') < 0 && t.indexOf('»') < 0) return t;
    return t.replace(RE_BEFORE, function (m, p) { return (p === ':' || p === '»' ? NB : NNB) + p; }).replace(RE_AFTER, '«' + NB);
  }
  function skip(n) { var p = n.parentNode; return !p || /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/.test(p.nodeName) || (p.isContentEditable); }
  function walk(root) {
    if (root.nodeType === 3) { if (!skip(root)) { var v = fix(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; } return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(root.nodeName)) return;
    var it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = it.nextNode())) { if (skip(n)) continue; var t = fix(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
  }
  window.LAB_TYPO = { fix: fix, walk: walk };
  function start() {
    walk(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'characterData') { walk(m.target); return; }
        for (var i = 0; i < m.addedNodes.length; i++) walk(m.addedNodes[i]);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
