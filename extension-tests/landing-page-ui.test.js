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
