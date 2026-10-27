/*
 * Expand the whole left navigation on the landing page at startup.
 *
 * The stock UI's site.js expands only the branch of the current page: it walks
 * up from the `.is-current-page` item and adds `is-active` to its ancestor
 * `.nav-item`s, and the stock CSS hides an item's children unless the item has
 * `is-active` (`.nav-item:not(.is-active) > .nav-list { display: none }`). On
 * the landing page that leaves the product groups collapsed, so this script
 * adds `is-active` to every `.nav-item` once the DOM is ready. The per-item
 * toggles keep working: removing `is-active` collapses an item again.
 *
 * Scoped to the landing page via its `:role: landing-page` page attribute,
 * which layouts/default.hbs copies onto `<body class="article landing-page">`.
 * Other components have large nav trees and keep the stock behavior.
 */
;(function () {
  'use strict'

  function expandNav () {
    if (!document.body.classList.contains('landing-page')) return
    var items = document.querySelectorAll('.nav-item')
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-active')
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', expandNav)
  } else {
    expandNav()
  }
})()
