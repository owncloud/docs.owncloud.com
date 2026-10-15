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

  // Mermaid diagrams (rendered by @sntke/antora-mermaid-extension) are not
  // present as <img> elements — they land as inline <svg> inside
  // div.mermaid.content, rendered asynchronously by the Mermaid ESM module
  // after the DOM is ready. medium-zoom v1.1.0 filters all targets through
  // `tagName === "IMG"` and silently drops anything else, so passing an <svg>
  // node to mediumZoom() attaches nothing. Serialising the SVG to a blob URL
  // and wrapping it in an <img> also fails because Mermaid's generated SVGs
  // rely on inline <style> blocks and computed CSS that lose their context when
  // loaded as a standalone resource.
  //
  // Instead: a MutationObserver watches for <svg> nodes inserted by Mermaid
  // and attaches a custom click handler that clones the live SVG node directly
  // into a full-screen overlay — no serialisation, all styles intact.
  function openSvgOverlay(svg) {
    var overlay = document.createElement('div')
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'right:0', 'bottom:0', 'left:0',
      'background:rgba(255,255,255,0.92)', 'z-index:9999',
      'display:flex', 'align-items:center', 'justify-content:center',
      'cursor:zoom-out', 'opacity:0', 'transition:opacity .3s',
    ].join(';')

    var clone = svg.cloneNode(true)
    clone.removeAttribute('width')
    clone.removeAttribute('height')
    clone.style.cssText = 'max-width:90vw;max-height:90vh;width:auto;height:auto;'
    overlay.appendChild(clone)
    document.body.appendChild(overlay)
    requestAnimationFrame(function () { overlay.style.opacity = '1' })

    function close() {
      overlay.style.opacity = '0'
      overlay.addEventListener('transitionend', function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      }, { once: true })
    }
    overlay.addEventListener('click', close)
    document.addEventListener('keyup', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keyup', onKey) }
    })
  }

  // CSS classes whose host elements may receive an async-rendered <svg> child.
  // Add entries here to extend zoom support to other diagram libraries.
  var SVG_CONTAINER_CLASSES = ['mermaid']

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      var cl = mutation.target.classList
      if (cl && SVG_CONTAINER_CLASSES.some(function (c) { return cl.contains(c) })) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeName === 'svg' || node.nodeName === 'SVG') {
            node.style.cursor = 'zoom-in'
            node.addEventListener('click', function () { openSvgOverlay(node) })
          }
        })
      }
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
})()
