'use strict'

// Build-output guards for antora-extensions/landing-versions.js. The extension can
// only be exercised through a real Antora build (it needs the content catalog),
// so these tests assert against the generated public/ tree and skip when the
// site has not been built yet (run `npm run antora`).

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')

const { latestByComponent } = require('./latest-versions')

const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')

// The components and versions the build renders, derived from site.yml
// start_paths and the antora.yml descriptors -- never hardcoded, so a version
// rollover cannot leave a test asserting yesterday's numbers. Only versions
// named in start_paths are rendered; antora.yml folders outside them (e.g.
// content/ocis/7.3) must NOT appear on the landing page.
function renderedComponents () {
  const playbook = yaml.load(fs.readFileSync(path.join(ROOT, 'site.yml'), 'utf8'))
  const source = playbook.content.sources.find((it) => it.url === '.')
  const components = {} // component name -> [{ version, displayVersion }]
  for (const startPath of source.start_paths) {
    // start_paths are either exact component dirs (content/ocis/9.0) or globs
    // over a product's version folders (content/server/*).
    const candidates = startPath.endsWith('/*')
      ? fs
          .readdirSync(path.join(ROOT, path.dirname(startPath)))
          .map((entry) => path.join(path.dirname(startPath), entry))
      : [startPath]
    for (const rel of candidates) {
      const descriptor = path.join(ROOT, rel, 'antora.yml')
      if (!fs.existsSync(descriptor)) continue
      const doc = yaml.load(fs.readFileSync(descriptor, 'utf8'))
      const versions = components[doc.name] || (components[doc.name] = [])
      versions.push({ version: doc.version, displayVersion: doc.display_version || doc.version })
    }
  }
  return components
}

function builtOrSkip (t, rel) {
  const p = path.join(PUBLIC, rel)
  if (!fs.existsSync(p)) {
    t.skip(`${rel} not built (run \`npm run antora\` to enable)`)
    return null
  }
  return fs.readFileSync(p, 'utf8')
}

test('the landing page lists every rendered version of every multi-version component', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  const missing = []
  for (const [name, versions] of Object.entries(renderedComponents())) {
    const versioned = versions.filter((it) => it.version)
    if (versioned.length === 0) continue // version-less component: no list expected
    for (const { version, displayVersion } of versioned) {
      const anchor = `<a href="${name}/${version}/index.html">${displayVersion}</a>`
      if (!html.includes(anchor)) missing.push(`${name} ${displayVersion} (want ${anchor})`)
    }
  }
  assert.deepEqual(missing, [], 'landing page is missing generated version links')
})

test('every generated version link target exists in the built site', (t) => {
  if (!fs.existsSync(path.join(PUBLIC, 'index.html'))) {
    t.skip('public/ not built (run `npm run antora` to enable)')
    return
  }
  const missing = []
  for (const [name, versions] of Object.entries(renderedComponents())) {
    for (const { version } of versions) {
      // js-yaml parses an unquoted 10.16 as a number -- coerce for path.join
      if (version && !fs.existsSync(path.join(PUBLIC, name, String(version), 'index.html'))) {
        missing.push(`/${name}/${version}/index.html`)
      }
    }
  }
  assert.deepEqual(missing, [], 'rendered version start pages missing from public/')
})

test('the landing page links each product to its latest stable version', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  const missing = []
  for (const [name, version] of Object.entries(latestByComponent())) {
    if (!html.includes(`href="${name}/${version}/index.html"`)) {
      missing.push(`/${name}/${version}/index.html`)
    }
  }
  assert.deepEqual(missing, [], 'landing page is missing product links to the latest stable version')
})

test('the landing page keeps its metadata, H1, and legacy page aliases', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  assert.ok(!html.includes('Unresolved include directive'), 'landing page contains an unresolved include')
  const description = html.match(/<meta name="description" content="([^"]*)"/)
  assert.ok(description, 'landing page has no meta description')
  assert.ok(description[1].length <= 155, `meta description is ${description[1].length} chars (max 155)`)
  assert.ok(html.includes('<h1 class="page">ownCloud Documentation</h1>'), 'landing page H1 changed')
  // legacy aliases from :page-aliases: must keep resolving as redirect stubs
  for (const stub of ['docs/next/index.html', 'docs_main/next/index.html']) {
    assert.ok(fs.existsSync(path.join(PUBLIC, stub)), `alias stub /${stub} missing`)
  }
})

test('the landing page highlights the getting-started resources', (t) => {
  const html = builtOrSkip(t, 'index.html')
  if (html == null) return
  const missing = []
  const expected = [
    'ocis/9.0/admin/depl-examples/ubuntu-compose/ubuntu-compose-prod.html',
    'https://join.owncloud.com',
    'https://owncloud.dev/ocis-field-guide/',
  ]
  for (const href of expected) {
    if (!html.includes(`href="${href}"`)) missing.push(href)
  }
  assert.deepEqual(missing, [], 'landing page is missing getting-started highlight links')
})
