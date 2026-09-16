// ==UserScript==
// @name         Diffs for GitHub Pull Requests
// @namespace    https://diffs.antfu.dev
// @version      0.4.0
// @description  Adds a Diffs-powered review drawer to GitHub pull request pages
// @author       antfu
// @match        https://github.com/*/*/pull/*
// @icon         https://diffs.antfu.dev/favicon.ico
// @require      https://diffs.antfu.dev/embed/diffs-embed.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function () {
  'use strict'

  // Everything else - PR detection, the toggle tab, the resizable drawer, re-syncing
  // on GitHub's Turbo SPA navigation - lives inside the custom element itself
  // (app/embed/EmbedApp.ce.vue). Mount it once and get out of the way.
  if (!document.querySelector('diffs-embed-panel'))
    document.body.appendChild(document.createElement('diffs-embed-panel'))
})()
