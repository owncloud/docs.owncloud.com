# ui

Agent guidelines for the UI layer (`supplemental/llms.txt`, supplemental JS/CSS). Loaded on demand; repo-wide rules live in the root `AGENTS.md`.

## LLM Discovery File (`llms.txt`)

`ui/supplemental/llms.txt` is served at `https://doc.owncloud.com/llms.txt` and follows the [llmstxt.org](https://llmstxt.org/) convention for AI-readable site indexes. It lists one URL per documentation section. **CI validates every URL in this file; an unresolvable URL is a build error.**

### Maintenance rules

- **Adding a module** to any Antora component → add a corresponding entry to `llms.txt`.
- **Removing a module** from any component → remove its entry from `llms.txt`.
- **Adding a new component** (new product) → add a new section with the component's index URL.

### Version resolution at build time

`antora-extensions/llms-txt.js` runs at `sitePublished` and rewrites every `/<component>/latest/` segment in the generated `public/llms.txt` with the component's actual GA version number (the same version `latest-alias.js` mirrors). This means:

- The template in `ui/supplemental/llms.txt` uses `latest` for all entries and is human-readable.
- The published file always contains real version numbers that CI can validate against `public/`.
- When the GA version rolls forward (e.g. 9.0 ships), the file updates automatically on the next build.

### Prerelease-only modules

If a module exists **only** in a prerelease version (e.g. the `developer` module was introduced in 9.0 while `latest` still points to 8.2), `latest` cannot be used — the GA release has no such module. In this case pin the URL to the explicit prerelease version in the template:

```
https://doc.owncloud.com/ocis/9.0/developer/index.html
```

The extension leaves explicit version numbers untouched — it only resolves `latest` segments.

**When to switch:** once `prerelease: true` is removed from that version's `antora.yml` and `latest` moves to it, change the pinned version in the template to `latest`. The extension resolves it from that point on.

This applies to **any component** — whenever a new module is first introduced in a prerelease version, pin its template URL until GA.

### Versionless components

The `webui` component uses `version: ~` (no version segment in URLs). Its entries in `llms.txt` correctly omit the version segment, e.g. `https://doc.owncloud.com/webui/index.html`.


## UI Supplemental CSS

Custom stylesheets live in `ui/supplemental/css/` and are linked from `ui/supplemental/partials/head-styles.hbs`. Link new sheets **after** `owncloud.css`, so equal-specificity rules win on source order and the brand custom properties (`--oc-navy`, `--oc-link`, ...) are available.

### Landing page layout (`landing-page.css`)

`content/main/modules/ROOT/pages/index.adoc` sets `:role: landing-page`. The custom `layouts/default.hbs` copies the page role onto the body element (`<body class="article landing-page">`), and every rule in `landing-page.css` is scoped to `body.landing-page`, so the compact card grid, the getting-started card row, and the inline version chips apply to the landing page only. All layout rules are wrapped in `@media screen`; print keeps the stock stacked layout.

The landing page has **no table of contents**: it sets no `:toc:` attribute (which removes the inline AsciiDoc TOC), and `landing-page.css` hides `aside.toc.sidebar` and `aside.toc.embedded` — the stock UI otherwise builds the sidebar TOC client-side from the page headings and clones it into an embedded in-body copy (see the toc routine in the stock `site.js`). Do not add `:toc:` to the page without also removing those two rules.

To give another page its own scoped styles: set `:role: <name>` in the page header and scope the rules to `body.<name>`. `extension-tests/landing-page-ui.test.js` guards the role, the stylesheet link, and the scoping.

## UI Supplemental JavaScript

Custom JavaScript lives in `ui/supplemental/js/` and is layered onto the stock Antora default UI at build time (linked from `ui/supplemental/partials/footer-scripts.hbs`).

### Expand the landing page navigation on startup (`nav-expand.js`)

The stock `site.js` expands only the branch of the current page: it adds `is-active` to the ancestors of `.is-current-page`, and the stock CSS hides an item's children unless the item has `is-active`. On the landing page that leaves the product groups (oCIS / Classic / Apps & Clients in `content/main/modules/ROOT/partials/nav.adoc`) collapsed. `nav-expand.js` adds `is-active` to every `.nav-item` once the DOM is ready, scoped to `body.landing-page` via the page's `:role: landing-page` attribute; other components keep the stock behavior (their nav trees are large). The per-item toggles and the expand/collapse-all button keep working, since removing `is-active` collapses an item again.

### Click-to-zoom for images and diagrams (`medium-zoom-init.js`)

`medium-zoom-init.js` wires click-to-zoom behaviour for the whole site:

- **Regular images** (`div.imageblock img`, `span.image img`) — bound directly via `mediumZoom()` on page load.
- **Mermaid diagrams** — handled separately via a `MutationObserver` + custom overlay (see below).

**Why Mermaid needs special treatment:** `@sntke/antora-mermaid-extension` renders diagrams client-side as inline `<svg>` elements inside `div.mermaid.content`, asynchronously after the DOM is ready. `medium-zoom` v1.1.0 filters all targets through `tagName === "IMG"` and silently ignores anything else, so passing an `<svg>` node attaches nothing. Serialising the SVG to a blob URL and wrapping it in an `<img>` also fails because Mermaid's generated SVGs rely on inline `<style>` blocks that lose their document context when loaded as a standalone resource.

**The fix:** a `MutationObserver` watches for `<svg>` nodes inserted into the container elements listed in `SVG_CONTAINER_CLASSES`. When one appears, a click handler is attached that opens a full-screen overlay containing a `cloneNode(true)` of the live SVG — no serialisation, all inline styles intact.

**Extending to another diagram library:** if a new library also renders async `<svg>` children that are not zoomable on click, add its container CSS class to the `SVG_CONTAINER_CLASSES` array at the top of the observer block in `medium-zoom-init.js` — no other changes needed:

```js
var SVG_CONTAINER_CLASSES = ['mermaid', 'your-new-library-class']
```
