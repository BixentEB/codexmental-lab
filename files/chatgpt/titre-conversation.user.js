// ==UserScript==
// @name         ChatGPT - Titre de conversation
// @namespace    https://chatgpt.com/
// @version      2.0
// @description  Affiche le titre de la conversation en haut à gauche
// @author       Bixounet et ChatGPT
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const box = document.createElement('div');
  box.id = 'nox-conversation-title';
  document.body.appendChild(box);

  function updateTitle() {
    const isConversation = /\/c\/[^/]+/.test(location.pathname);
    const title = isConversation ? document.title : '';

    if (box.textContent !== title) {
      box.textContent = title;
    }
  }

  // Surveille les changements de titre de l'onglet
  const titleObserver = new MutationObserver(updateTitle);

  const titleElement = document.querySelector('title');

  if (titleElement) {
    titleObserver.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  // Vérification complémentaire lors de la navigation
  setInterval(updateTitle, 500);

  updateTitle();
})();
