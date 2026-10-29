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

// Parse the rendered nav menu into a tree of { href, text, children } nodes,
// using the data-depth attributes the Antora UI emits on each .nav-item.
function navTree (navHtml) {
  const roots = []
  const stack = []
  for (const chunk of navHtml.split('<li class="nav-item').slice(1)) {
    const depth = Number(chunk.match(/data-depth="(\d+)"/)[1])
    const own = chunk.slice(chunk.indexOf('>') + 1)
    const childList = own.indexOf('<ul class="nav-list">')
    const ownContent = childList === -1 ? own : own.slice(0, childList)
    const link = ownContent.match(/<a class="nav-link" href="([^"]+)">([^<]*)<\/a>/)
    const text = ownContent.match(/<span class="nav-text">([^<]*)<\/span>/)
    const node = {
      href: link ? link[1] : null,
      text: (link ? link[2] : text ? text[1] : '').replace(/&amp;/g, '&'),
      children: [],
    }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    if (stack.length) stack[stack.length - 1].node.children.push(node)
    else roots.push(node)
    stack.push({ node, depth })
  }
  return roots
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

test('the landing page menu mirrors the product structure', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  const navMatch = html.match(/<nav class="nav-menu">[\s\S]*?<\/nav>/)
  assert.ok(navMatch, 'landing page has no nav menu')
  const latest = latestByComponent()
  // The trailing untitled list (How to Contribute) is wrapped by Antora's nav
  // builder in an empty parent item; that parent's list is the depth-0 first
  // child, so the stock CSS gives it margin 0 and the entry renders at
  // top-level indentation.
  const expected = [
    {
      href: 'index.html',
      text: 'Releases by Product',
      children: [
        {
          href: null,
          text: 'oCIS',
          children: [
            { href: 'ocis_releases.html', text: 'Releases', children: [] },
            { href: 'ocis_release_notes.html', text: 'Release Notes', children: [] },
          ],
        },
        {
          href: null,
          text: 'Classic',
          children: [
            { href: 'server_releases.html', text: 'Releases', children: [] },
            { href: 'server_release_notes.html', text: 'Release Notes', children: [] },
          ],
        },
        {
          href: null,
          text: 'Apps & Clients',
          children: [
            { href: 'desktop_release_notes.html', text: 'Desktop App', children: [] },
            { href: 'ios_release_notes.html', text: 'iOS App', children: [] },
            { href: 'android_release_notes.html', text: 'Android App', children: [] },
          ],
        },
      ],
    },
    {
      href: null,
      text: 'Documentation by Product',
      children: [
        {
          href: null,
          text: 'oCIS',
          children: [
            { href: `ocis/${latest.ocis}/index.html`, text: 'oCIS Server', children: [] },
            { href: 'webui/index.html', text: 'oCIS Web Client', children: [] },
            { href: null, text: 'MCP Server (coming soon)', children: [] },
          ],
        },
        {
          href: null,
          text: 'Classic',
          children: [
            { href: `server/${latest.server}/index.html`, text: 'Classic Server', children: [] },
            { href: `server/${latest.server}/classic_ui/index.html`, text: 'Classic Web', children: [] },
          ],
        },
        {
          href: null,
          text: 'Apps & Clients',
          children: [
            { href: `desktop/${latest.desktop}/index.html`, text: 'Desktop Client', children: [] },
            { href: `android/${latest.android}/index.html`, text: 'Android App', children: [] },
            { href: `ios-app/${latest['ios-app']}/index.html`, text: 'iOS App', children: [] },
          ],
        },
      ],
    },
    {
      href: null,
      text: '',
      children: [{ href: 'how_to_contribute.html', text: 'How to Contribute', children: [] }],
    },
  ]
  const tree = navTree(navMatch[0])
  assert.deepEqual(tree, expected, 'nav menu does not mirror the product structure')

  // every nav link target exists in the built site (hrefs are site-root relative)
  const unresolved = []
  const collect = (nodes) =>
    nodes.forEach((node) => {
      if (node.href && !fs.existsSync(path.join(PUBLIC, node.href))) unresolved.push(node.href)
      collect(node.children)
    })
  collect(tree)
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
