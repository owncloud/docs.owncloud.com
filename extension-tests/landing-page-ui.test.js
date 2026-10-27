'use strict'

// Build-output guards for the landing page UI (ui/supplemental/css/landing-page.css).
// The landing page sets `:role: landing-page`; ui/supplemental/layouts/default.hbs
// copies the page role onto <body>, and every rule in the stylesheet is scoped to
// that class. The build-dependent tests assert against the generated public/ tree
// and skip when the site has not been built yet (run `npm run antora`); the source
// guards run either way.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('path')

const { latestByComponent } = require('./latest-versions')

const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')

function builtOrSkip (t, rel) {
  const p = path.join(PUBLIC, rel)
  if (!fs.existsSync(path.join(PUBLIC, 'index.html'))) {
    t.skip('public/ not built (run `npm run antora` to enable)')
    return null
  }
  return fs.readFileSync(p, 'utf8')
}

test('the landing page sets the landing-page role and links its stylesheet', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  assert.match(html, /<body class="[^"]*\blanding-page\b/, 'landing page body is missing the landing-page role')
  assert.match(html, /<link rel="stylesheet" href="[^"]*css\/landing-page\.css">/, 'landing page does not link landing-page.css')
})

test('the landing page stylesheet is published and fully scoped to the role', (t) => {
  if (!fs.existsSync(path.join(PUBLIC, 'index.html'))) {
    t.skip('public/ not built (run `npm run antora` to enable)')
    return
  }
  const cssPath = path.join(PUBLIC, 'assets', 'css', 'landing-page.css')
  assert.ok(fs.existsSync(cssPath), 'assets/css/landing-page.css was not published')
  const css = fs.readFileSync(cssPath, 'utf8')
  assert.ok(css.trim().length > 0, 'landing-page.css is empty')
  // Every rule must be scoped to the landing-page body class so no other page
  // is affected. The single `@media screen` wrapper around the whole file is
  // fine; comments are stripped before the selectors are inspected.
  const selectors = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .map((block) => block.split('{')[0].trim())
    .filter((selector) => selector && !selector.startsWith('@media'))
  const unscoped = selectors.filter((selector) => !selector.includes('landing-page'))
  assert.deepEqual(unscoped, [], 'landing-page.css has rules not scoped to body.landing-page')
})

test('no other page carries the landing-page role', (t) => {
  if (!fs.existsSync(path.join(PUBLIC, 'index.html'))) {
    t.skip('public/ not built (run `npm run antora` to enable)')
    return
  }
  const samples = [
    'ocis/8.2/index.html',
    'server/11.0/index.html',
    'webui/index.html',
    'desktop/7.1/index.html',
    'android/4.7/index.html',
    'ios-app/12.7/index.html',
  ]
  const offenders = []
  for (const rel of samples) {
    const p = path.join(PUBLIC, rel)
    if (!fs.existsSync(p)) continue
    if (/<body class="[^"]*\blanding-page\b/.test(fs.readFileSync(p, 'utf8'))) offenders.push(rel)
  }
  assert.deepEqual(offenders, [], 'landing-page role leaked to other pages')
})

test('the landing page source sets the role and the head partial links the stylesheet', () => {
  const page = fs.readFileSync(path.join(ROOT, 'content/main/modules/ROOT/pages/index.adoc'), 'utf8')
  assert.match(page, /^:role: landing-page$/m, 'index.adoc does not set :role: landing-page')
  const head = fs.readFileSync(path.join(ROOT, 'ui/supplemental/partials/head-styles.hbs'), 'utf8')
  assert.ok(head.includes('css/landing-page.css'), 'head-styles.hbs does not link landing-page.css')
  assert.ok(
    fs.existsSync(path.join(ROOT, 'ui/supplemental/css/landing-page.css')),
    'ui/supplemental/css/landing-page.css is missing'
  )
})

test('the landing page has no table of contents', (t) => {
  // source guard: no :toc: attribute (also catches a future global toc attribute)
  const page = fs.readFileSync(path.join(ROOT, 'content/main/modules/ROOT/pages/index.adoc'), 'utf8')
  assert.ok(!/^:toc:/m.test(page), 'index.adoc sets a :toc: attribute')
  // the stock UI builds the sidebar/embedded TOC client-side from the headings,
  // so the stylesheet must hide both aside types on this page
  const css = fs.readFileSync(path.join(ROOT, 'ui/supplemental/css/landing-page.css'), 'utf8')
  assert.ok(
    /body\.landing-page aside\.toc\.sidebar,[\s\S]*?body\.landing-page aside\.toc\.embedded \{\s*display: none/.test(css),
    'landing-page.css does not hide aside.toc.sidebar / aside.toc.embedded'
  )
  // build guard: no inline AsciiDoc TOC in the rendered page
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  assert.ok(!html.includes('<div id="toc"'), 'landing page renders an inline TOC')
})

test('the landing page menu is renamed and regrouped by product', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  const navMatch = html.match(/<nav class="nav-menu">[\s\S]*?<\/nav>/)
  assert.ok(navMatch, 'landing page has no nav menu')
  const nav = navMatch[0]

  // renamed top item (the release-notes subtree under it is kept)
  assert.ok(nav.includes('<a class="nav-link" href="index.html">Release Notes</a>'), 'nav item is not renamed to Release Notes')
  assert.ok(!nav.includes('>Overview</a>'), 'nav still has the old Overview item')
  assert.ok(nav.includes('<span class="nav-text">Server Releases</span>'), 'release-notes subtree lost its Server Releases group')
  assert.ok(nav.includes('How to Contribute'), 'release-notes subtree lost How to Contribute')

  // product groups
  for (const group of ['oCIS', 'Classic', 'Apps &amp; Clients']) {
    assert.ok(nav.includes(`<span class="nav-text">${group}</span>`), `nav is missing the ${group} group`)
  }

  // product items link to the latest stable version of each component
  const latest = latestByComponent()
  const expected = {
    'oCIS Server': `ocis/${latest.ocis}/index.html`,
    'oCIS Web Client': 'webui/index.html',
    'Classic Server': `server/${latest.server}/index.html`,
    'Classic Web': `server/${latest.server}/classic_ui/index.html`,
    'Desktop Client': `desktop/${latest.desktop}/index.html`,
    'Android App': `android/${latest.android}/index.html`,
    'iOS App': `ios-app/${latest['ios-app']}/index.html`,
  }
  const missing = []
  for (const [label, href] of Object.entries(expected)) {
    if (!nav.includes(`<a class="nav-link" href="${href}">${label}</a>`)) missing.push(`${label} -> ${href}`)
  }
  assert.deepEqual(missing, [], 'nav is missing product items')

  // MCP Server is a placeholder: present as text, without a link
  assert.ok(nav.includes('<span class="nav-text">MCP Server (coming soon)</span>'), 'nav is missing the MCP Server placeholder')

  // the old flat product labels are gone
  const gone = ['Web Infinite Scale', 'Web ownCloud Classic', '>Mobile App for Android</a>', '>Mobile App for iOS</a>', '>Desktop App</a>']
  const stale = gone.filter((label) => nav.includes(label))
  assert.deepEqual(stale, [], 'nav still has old product labels')

  // every nav link target exists in the built site (hrefs are site-root relative)
  const unresolved = []
  for (const match of nav.matchAll(/<a class="nav-link" href="([^"]+)">/g)) {
    if (!fs.existsSync(path.join(PUBLIC, match[1]))) unresolved.push(match[1])
  }
  assert.deepEqual(unresolved, [], 'nav links to pages missing from public/')
})

test('the landing page expands its navigation on startup via nav-expand.js', (t) => {
  const script = path.join(ROOT, 'ui/supplemental/js/nav-expand.js')
  assert.ok(fs.existsSync(script), 'ui/supplemental/js/nav-expand.js is missing')
  const source = fs.readFileSync(script, 'utf8')
  assert.ok(source.includes('landing-page'), 'nav-expand.js is not scoped to the landing page')
  assert.ok(source.includes('is-active'), 'nav-expand.js does not expand via the stock is-active mechanism')
  const footer = fs.readFileSync(path.join(ROOT, 'ui/supplemental/partials/footer-scripts.hbs'), 'utf8')
  assert.ok(footer.includes('js/nav-expand.js'), 'footer-scripts.hbs does not load nav-expand.js')
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  assert.ok(html.includes('js/nav-expand.js'), 'landing page does not load nav-expand.js')
  assert.ok(
    fs.existsSync(path.join(PUBLIC, 'assets/js/nav-expand.js')),
    'assets/js/nav-expand.js was not published'
  )
})
