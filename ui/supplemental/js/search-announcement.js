/*
 * One-time dismissible announcement banner for the Pagefind filter feature.
 * Uses localStorage so the banner disappears permanently once dismissed.
 *
 * TO REMOVE THIS BANNER (3 steps):
 *   1. Delete this file:
 *        ui/supplemental/js/search-announcement.js
 *   2. Remove the <script> tag that loads it from:
 *        ui/supplemental/partials/footer-scripts.hbs
 *      (the line referencing "search-announcement.js")
 *   3. Remove the banner CSS block from:
 *        ui/supplemental/css/owncloud.css
 *      (the section marked "Search-filter announcement banner")
 */
;(function () {
  var KEY = 'oc-search-filter-announced-v1'
  if (localStorage.getItem(KEY)) return

  var banner = document.createElement('div')
  banner.id = 'oc-search-announcement'
  banner.setAttribute('role', 'status')
  banner.innerHTML =
    '<span class="oc-announcement-text">' +
      '<strong>New:</strong> Filter search results by product and version &mdash; ' +
      'open the search box ' +
      '(<kbd>Ctrl</kbd>&thinsp;+&thinsp;<kbd>K</kbd>) and try the filter pane.' +
    '</span>' +
    '<button class="oc-announcement-close" aria-label="Dismiss announcement">' +
      '&times;' +
    '</button>'

  document.body.insertBefore(banner, document.body.firstChild)

  banner.querySelector('.oc-announcement-close').addEventListener('click', function () {
    localStorage.setItem(KEY, '1')
    banner.remove()
  })
})()
