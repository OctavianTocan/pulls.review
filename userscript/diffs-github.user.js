// ==UserScript==
// @name         Diffs for GitHub Pull Requests
// @namespace    https://diffs.antfu.dev
// @version      0.4.0
// @description  Adds a Diffs-powered review drawer to GitHub pull request pages
// @author       antfu
// @match        https://github.com/*/*/pull/*
// @icon         https://github.com/favicon.ico
// @require      https://diffs.antfu.dev/embed/diffs-embed.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(() => {
  // Mount the Diffs embed panel Web Component from diffs.antfu.dev
  if (!document.querySelector('diffs-embed-panel'))
    document.body.appendChild(document.createElement('diffs-embed-panel'))
})()
