// ==UserScript==
// @name         Diffs for GitHub Pull Requests
// @namespace    https://diffs.antfu.dev
// @version      0.3.0
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

  const WIDTH_STORAGE_KEY = 'diffs-userscript:drawer-width'
  const DEFAULT_WIDTH = 480
  const MIN_WIDTH = 320
  const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif'

  function loadWidth() {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY))
    if (!Number.isFinite(stored) || stored <= 0)
      return DEFAULT_WIDTH
    return clampWidth(stored)
  }

  function clampWidth(width) {
    const max = Math.round(window.innerWidth * 0.92)
    return Math.min(Math.max(width, MIN_WIDTH), max)
  }

  let drawerWidth = loadWidth()

  let toggleEl
  let drawerEl
  let resizeHandleEl
  let panelEl
  let open = false
  let currentPrKey

  function parsePr(pathname) {
    const match = pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
    if (!match)
      return undefined
    return { owner: match[1], repo: match[2], number: match[3] }
  }

  function applyWidth() {
    drawerEl.style.width = `${drawerWidth}px`
    if (open)
      toggleEl.style.right = `${drawerWidth}px`
  }

  function toggleDrawer() {
    open = !open
    drawerEl.style.transform = open ? 'translateX(0)' : 'translateX(100%)'
    toggleEl.style.right = open ? `${drawerWidth}px` : '0'
  }

  function startResize(event) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = drawerWidth
    resizeHandleEl.setPointerCapture(event.pointerId)

    function onMove(moveEvent) {
      // Anchored to the right edge - dragging the left-edge handle further left
      // (decreasing clientX) should widen the drawer.
      drawerWidth = clampWidth(startWidth + (startX - moveEvent.clientX))
      applyWidth()
    }

    function onUp() {
      resizeHandleEl.removeEventListener('pointermove', onMove)
      resizeHandleEl.removeEventListener('pointerup', onUp)
      localStorage.setItem(WIDTH_STORAGE_KEY, String(drawerWidth))
    }

    resizeHandleEl.addEventListener('pointermove', onMove)
    resizeHandleEl.addEventListener('pointerup', onUp)
  }

  // Built once, on the first PR page visited - hidden (not removed) when navigating
  // away from a PR, since GitHub's SPA navigation keeps reusing this same document.
  function ensureUI() {
    if (toggleEl)
      return

    toggleEl = document.createElement('button')
    toggleEl.type = 'button'
    toggleEl.textContent = 'Diffs'
    toggleEl.style.cssText = `position:fixed;top:50%;right:0;z-index:2147483000;transform:translateY(-50%);writing-mode:vertical-rl;padding:10px 6px;background:#1f2328;color:#fff;border:1px solid #444c56;border-right:none;border-radius:8px 0 0 8px;cursor:pointer;font:600 12px/1 ${FONT};box-shadow:-2px 0 8px rgba(0,0,0,.25);transition:right .2s ease;`
    toggleEl.addEventListener('click', toggleDrawer)
    document.body.appendChild(toggleEl)

    drawerEl = document.createElement('div')
    drawerEl.style.cssText = `position:fixed;top:0;right:0;height:100vh;width:${drawerWidth}px;max-width:92vw;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.25);z-index:2147483001;transition:transform .2s ease;transform:translateX(100%);display:flex;flex-direction:column;`

    resizeHandleEl = document.createElement('div')
    resizeHandleEl.style.cssText = 'position:absolute;top:0;left:-4px;width:8px;height:100%;cursor:ew-resize;touch-action:none;'
    resizeHandleEl.addEventListener('pointerdown', startResize)
    drawerEl.appendChild(resizeHandleEl)

    const header = document.createElement('div')
    header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #d0d7de;font:600 13px/1.2 ${FONT};color:#1f2328;flex:0 0 auto;`

    const title = document.createElement('span')
    title.textContent = 'Diffs'

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.textContent = '✕'
    closeButton.setAttribute('aria-label', 'Close')
    closeButton.style.cssText = 'border:none;background:transparent;cursor:pointer;font-size:14px;line-height:1;padding:4px;color:#1f2328;'
    closeButton.addEventListener('click', toggleDrawer)

    header.append(title, closeButton)

    drawerEl.appendChild(header)
    document.body.appendChild(drawerEl)
  }

  // `usePullRequest` inside the component only reads its props once, at setup - like
  // the main app's own routed page, a PR change needs a fresh element, not an attribute
  // mutation on the existing one.
  function mountPanel(pr) {
    panelEl?.remove()
    panelEl = document.createElement('diffs-embed-panel')
    panelEl.style.cssText = 'flex:1 1 auto;min-height:0;display:block;overflow:auto;'
    panelEl.setAttribute('owner', pr.owner)
    panelEl.setAttribute('repo', pr.repo)
    panelEl.setAttribute('number', pr.number)
    drawerEl.appendChild(panelEl)
  }

  function syncForCurrentPage() {
    const pr = parsePr(location.pathname)
    if (!pr) {
      if (toggleEl)
        toggleEl.style.display = 'none'
      if (open)
        toggleDrawer()
      currentPrKey = undefined
      return
    }

    ensureUI()
    toggleEl.style.display = 'block'

    const key = `${pr.owner}/${pr.repo}#${pr.number}`
    if (key !== currentPrKey) {
      currentPrKey = key
      mountPanel(pr)
    }
  }

  syncForCurrentPage()
  // GitHub is a Turbo (Hotwire) SPA - navigating between PRs (or to/from one)
  // doesn't reload the page, so re-check on every Turbo navigation too.
  document.addEventListener('turbo:load', syncForCurrentPage)
  window.addEventListener('popstate', syncForCurrentPage)
})()
