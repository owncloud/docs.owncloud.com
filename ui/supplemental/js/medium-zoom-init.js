/*
 * Click-to-zoom for images, restoring the behavior the retired custom UI
 * (docs-ui) provided via its webpack-bundled `js/vendor/medium-zoom.js`.
 *
 * Binds medium-zoom to every image Asciidoctor emits:
 *   span.image img     -- inline images (`image:file[]`)
 *   div.imageblock img -- block images (`image::file[]`), including svg
 * With that, no `role` or attribute is needed in the page source: all images
 * are zoomable.
 *
 * Loaded with `defer` after js/vendor/medium-zoom.min.js so the global is in
 * place -- deferred external scripts execute in document order.
 */
;(function () {
  'use strict'

  if (typeof window.mediumZoom !== 'function') return
  window.mediumZoom('span.image img, div.imageblock img', { background: '#fff', margin: 10 })
})()
