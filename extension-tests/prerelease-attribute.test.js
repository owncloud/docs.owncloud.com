'use strict'

// Guards for antora-extensions/prerelease-attribute.js, which sets the AsciiDoc
// attribute page-component-version-is-prerelease on every page of a component
// version marked `prerelease` in its antora.yml.
//
// The extension only rewrites componentVersion.asciidoc, so a fake content catalog
// exercises it fully -- no built site needed. The one thing worth guarding beyond
// the flag itself is that the shared siteAsciiDocConfig object is never mutated:
// Antora hands that very object to every component version whose descriptor
// defines no attributes of its own, so an in-place write would mark the whole site
// as prerelease.

const test = require('node:test')
const assert = require('node:assert/strict')

const { register } = require('../antora-extensions/prerelease-attribute')

const ATTRIBUTE = 'page-component-version-is-prerelease'

const componentVersion = (name, version, extra = {}) =>
  Object.assign({ name, version, displayVersion: version || 'default' }, extra)

// The slice of Antora's ContentCatalog the extension reads.
const fakeCatalog = (components) => ({ getComponents: () => components })

// Run the extension and return the warnings it logged.
function run (components, siteAsciiDocConfig) {
  const warnings = []
  const handlers = {}
  register.call({
    once: (event, fn) => (handlers[event] = fn),
    getLogger: () => ({ warn: (...args) => warnings.push(args) }),
  })
  handlers.contentClassified({ contentCatalog: fakeCatalog(components), siteAsciiDocConfig })
  return warnings
}

const attrs = (cv) => cv.asciidoc?.attributes || {}

test('a prerelease version gets the attribute, a release version does not', () => {
  const dev = componentVersion('ocis', '8.3', { prerelease: true, asciidoc: { attributes: {} } })
  const release = componentVersion('ocis', '8.2', { asciidoc: { attributes: {} } })
  run([{ name: 'ocis', versions: [dev, release], latest: release, latestPrerelease: dev }], { attributes: {} })
  assert.equal(attrs(dev)[ATTRIBUTE], '', 'the prerelease version must carry the flag')
  assert.ok(!(ATTRIBUTE in attrs(release)), 'the release version must not carry the flag')
})

test('a string prerelease value still sets the flag to the empty string', () => {
  // antora.yml may say `prerelease: Beta` instead of `true`; the attribute stays a
  // flag either way -- the label belongs in page-component-display-version.
  const beta = componentVersion('ocis', '9.0', { prerelease: 'Beta', asciidoc: { attributes: {} } })
  run([{ name: 'ocis', versions: [beta], latest: beta }], { attributes: {} })
  assert.equal(attrs(beta)[ATTRIBUTE], '')
})

test('existing component version attributes are preserved', () => {
  const dev = componentVersion('ocis', '8.3', {
    prerelease: true,
    asciidoc: { attributes: { 'oc-version': '8.3' }, extensions: ['./asciidoc-extensions/tabs.js'] },
  })
  run([{ name: 'ocis', versions: [dev], latest: dev }], { attributes: {} })
  assert.equal(attrs(dev)['oc-version'], '8.3', 'component attributes must survive')
  assert.deepEqual(dev.asciidoc.extensions, ['./asciidoc-extensions/tabs.js'], 'config keys must survive')
})

test('the shared site AsciiDoc config is not mutated', () => {
  // Both versions inherit the site config object itself, which is what Antora does
  // for a descriptor without an `asciidoc` key.
  const siteAsciiDocConfig = { attributes: { 'site-title': 'ownCloud' } }
  const dev = componentVersion('ocis', '8.3', { prerelease: true, asciidoc: siteAsciiDocConfig })
  const release = componentVersion('server', '11.0', { asciidoc: siteAsciiDocConfig })
  run(
    [
      { name: 'ocis', versions: [dev], latest: dev },
      { name: 'server', versions: [release], latest: release },
    ],
    siteAsciiDocConfig
  )
  assert.deepEqual(
    siteAsciiDocConfig,
    { attributes: { 'site-title': 'ownCloud' } },
    'the site config must come out untouched'
  )
  assert.equal(attrs(dev)[ATTRIBUTE], '')
  assert.equal(release.asciidoc, siteAsciiDocConfig, 'an untouched version must keep sharing the site config')
})

test('a component version without its own AsciiDoc config falls back to the site config', () => {
  const siteAsciiDocConfig = { attributes: { 'site-title': 'ownCloud' } }
  const dev = componentVersion('desktop', '7.2', { prerelease: true }) // no asciidoc key
  run([{ name: 'desktop', versions: [dev], latest: dev }], siteAsciiDocConfig)
  assert.equal(attrs(dev)[ATTRIBUTE], '')
  assert.equal(attrs(dev)['site-title'], 'ownCloud', 'site attributes must not be dropped')
})

test('a hand-set flag on a release version is dropped and warned about', () => {
  const release = componentVersion('ocis', '8.2', { asciidoc: { attributes: { [ATTRIBUTE]: '' } } })
  const warnings = run([{ name: 'ocis', versions: [release], latest: release }], { attributes: {} })
  assert.ok(!(ATTRIBUTE in attrs(release)), 'the derived attribute must win over a hand-set one')
  assert.equal(warnings.length, 1, 'dropping a hand-set flag must be reported')
  assert.match(warnings[0].join(' '), /prerelease/)
})

test('the versionless components (main, webui) are left alone', () => {
  const siteAsciiDocConfig = { attributes: {} }
  const webui = componentVersion('webui', '', { asciidoc: siteAsciiDocConfig })
  const warnings = run([{ name: 'webui', versions: [webui], latest: webui }], siteAsciiDocConfig)
  assert.ok(!(ATTRIBUTE in attrs(webui)))
  assert.deepEqual(warnings, [])
})

// The real content tree: every version marked `prerelease` in its antora.yml must
// end up with the flag, and no other version may. This is the mapping the
// extension is there to produce, checked against the descriptors on disk.
test('every prerelease version in content/ gets the flag, and only those', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const CONTENT = path.join(__dirname, '..', 'content')

  const versions = [] // { component, version, prerelease }
  for (const product of fs.readdirSync(CONTENT)) {
    const productDir = path.join(CONTENT, product)
    if (!fs.statSync(productDir).isDirectory()) continue
    for (const entry of fs.readdirSync(productDir)) {
      const descriptor = path.join(productDir, entry, 'antora.yml')
      if (!fs.existsSync(descriptor)) continue // versionless: antora.yml sits one level up
      const yaml = fs.readFileSync(descriptor, 'utf8')
      versions.push({ component: product, version: entry, prerelease: /^prerelease:\s*(true|\S+)/m.test(yaml) })
    }
  }
  assert.ok(versions.some((v) => v.prerelease), 'no prerelease version found in content/ -- test is not exercising anything')

  const catalogVersions = versions.map(({ component, version, prerelease }) =>
    componentVersion(component, version, Object.assign({ asciidoc: { attributes: {} } }, prerelease && { prerelease }))
  )
  const byComponent = new Map()
  catalogVersions.forEach((cv) => {
    if (!byComponent.has(cv.name)) byComponent.set(cv.name, { name: cv.name, versions: [] })
    byComponent.get(cv.name).versions.push(cv)
  })
  byComponent.forEach((component) => (component.latest = component.versions[0]))
  run([...byComponent.values()], { attributes: {} })

  const flagged = catalogVersions.filter((cv) => ATTRIBUTE in attrs(cv)).map((cv) => `${cv.name}/${cv.version}`)
  const expected = versions.filter((v) => v.prerelease).map((v) => `${v.component}/${v.version}`)
  assert.deepEqual(flagged.sort(), expected.sort())
})
