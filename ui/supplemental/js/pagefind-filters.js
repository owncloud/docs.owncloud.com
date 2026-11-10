// Injects a pagefind-filter-pane into the search modal body after the modal has
// rendered. Creating it here (rather than as a static HTML child of
// <pagefind-modal>) avoids the double-init problem: the modal's render() moves
// its custom children from <pagefind-modal> into the inner <dialog>, triggering
// a disconnect/reconnect cycle that re-runs connectedCallback and creates
// duplicate filter containers. Dynamic insertion puts the pane directly into
// its final position with a single connect.
//
// One <pagefind-filter-pane> shows ALL indexed filter types automatically; the
// data-pagefind-filter tags on each page (component and version) determine what
// appears. No filter attribute is needed.
customElements.whenDefined('pagefind-modal-body').then(function () {
  var body = document.querySelector('pagefind-modal-body')
  if (!body) return
  var summary = body.querySelector('pagefind-summary')
  var pane = document.createElement('pagefind-filter-pane')
  body.insertBefore(pane, summary)
})
