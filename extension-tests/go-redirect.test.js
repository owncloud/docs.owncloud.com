'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { resolve, resolveSiteGo, resolveGoPhp, MAPPING, SITE_MAPPING, fallbackFor, siteFallbackFor, PUBLISHED_VERSIONS } = require('../ui/supplemental/js/go-redirect.js')

const PREFIX = '/owncloud-docs-monorepo/server/latest/'

test('non-go.php paths are left untouched', () => {
  assert.equal(resolveGoPhp('/owncloud-docs-monorepo/server/latest/index.html', ''), null)
  assert.equal(resolveGoPhp('/owncloud-docs-monorepo/server/latest/', ''), null)
  // "cargo.php" must not be mistaken for the go.php endpoint.
  assert.equal(resolveGoPhp('/owncloud-docs-monorepo/server/latest/cargo.php', '?to=admin-sharing'), null)
})

test('a known key redirects to its mapped page under the version root', () => {
  assert.equal(
    resolveGoPhp(PREFIX + 'go.php', '?to=admin-sharing'),
    PREFIX + 'admin_manual/configuration/files/file_sharing_configuration.html'
  )
})

test('a developer key redirects into the developer manual', () => {
  assert.equal(
    resolveGoPhp(PREFIX + 'go.php', '?to=developer-theming'),
    PREFIX + 'developer_manual/core/theming.html'
  )
})

test('a user key redirects into the classic_ui module', () => {
  assert.equal(
    resolveGoPhp(PREFIX + 'go.php', '?to=user-webdav'),
    PREFIX + 'classic_ui/files/access_webdav.html'
  )
})

test('a published version segment is preserved for per-version fidelity', () => {
  // `latest` and `next` are served redirect trees, so they are preserved too: the
  // stub the go.php link lands on carries the reader on to the real version.
  for (const v of ['10.16', '11.0', 'latest', 'next']) {
    const p = `/owncloud-docs-monorepo/server/${v}/`
    assert.equal(
      resolveGoPhp(p + 'go.php', '?to=admin-sharing'),
      p + 'admin_manual/configuration/files/file_sharing_configuration.html'
    )
  }
})

test('an unpublished (old) version segment falls back to latest', () => {
  // A long-deployed old server still emits e.g. /server/10.9/go.php; that
  // version has no published tree, so it must land on /server/latest/.
  assert.equal(
    resolveGoPhp('/owncloud-docs-monorepo/server/10.9/go.php', '?to=user-webdav'),
    '/owncloud-docs-monorepo/server/latest/classic_ui/files/access_webdav.html'
  )
})

test('a URL-encoded key (e.g. the well-known-URL key) resolves', () => {
  assert.equal(
    resolveGoPhp(PREFIX + 'go.php', '?to=admin-setup-well-known-URL'),
    PREFIX + 'admin_manual/troubleshooting/general_troubleshooting.html'
  )
})

test('unknown keys fall back to the server docs entrypoint', () => {
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=admin-does-not-exist'), PREFIX + 'index.html')
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=developer-nope'), PREFIX + 'index.html')
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=user-nope'), PREFIX + 'index.html')
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=totally-unknown'), PREFIX + 'index.html')
})

test('a missing/empty key falls back to the server docs entrypoint', () => {
  assert.equal(resolveGoPhp(PREFIX + 'go.php', ''), PREFIX + 'index.html')
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to='), PREFIX + 'index.html')
})

test('extra query parameters around to= are ignored', () => {
  assert.equal(
    resolveGoPhp(PREFIX + 'go.php', '?foo=1&to=admin-sharing&bar=2'),
    PREFIX + 'admin_manual/configuration/files/file_sharing_configuration.html'
  )
})

test('a malformed percent-escape degrades to the fallback, never throws', () => {
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=%'), PREFIX + 'index.html')
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=admin-%zz'), PREFIX + 'index.html')
})

test('a value containing = is preserved (not truncated at the first =)', () => {
  // No real key contains '=', so this just proves the parser keeps the whole
  // value: "admin-x=y" is unknown -> entrypoint fallback (not silently the
  // truncated "admin-x", which is also unknown here but proves the point).
  assert.equal(resolveGoPhp(PREFIX + 'go.php', '?to=admin-x=y'), PREFIX + 'index.html')
})

test('a site-level go?to= key redirects relative to the site root', () => {
  // ownCloud Web emits https://doc.owncloud.com/go?to=<key> (no .php, no version).
  assert.equal(
    resolveSiteGo('/go', '?to=webui-users-sharing'),
    '/webui/owncloud_web/web_for_users.html#sharing'
  )
  assert.equal(
    resolveSiteGo('/owncloud-docs-monorepo/go', '?to=webui-users-sharing'),
    '/owncloud-docs-monorepo/webui/owncloud_web/web_for_users.html#sharing'
  )
})

test('an unknown webui-* key falls back to the Web docs', () => {
  assert.equal(resolveSiteGo('/go', '?to=webui-nope'), '/webui/index.html')
})

test('an unknown or missing site-level key falls back to the site root', () => {
  assert.equal(resolveSiteGo('/go', ''), '/index.html')
  assert.equal(resolveSiteGo('/go', '?to=totally-unknown'), '/index.html')
  // Server keys are not resolved at the site level.
  assert.equal(resolveSiteGo('/go', '?to=admin-sharing'), '/index.html')
})

test('only the site-level go endpoint matches, not a nested or similar path', () => {
  assert.equal(resolveSiteGo('/server/latest/go', '?to=webui-users-sharing'), null)
  assert.equal(resolveSiteGo('/owncloud-docs-monorepo/server/latest/go', '?to=webui-users-sharing'), null)
  assert.equal(resolveSiteGo('/cargo', '?to=webui-users-sharing'), null)
  assert.equal(resolveSiteGo('/go/', '?to=webui-users-sharing'), null)
  assert.equal(resolveSiteGo(PREFIX + 'go.php', '?to=admin-sharing'), null)
})

test('resolve dispatches to the matching endpoint and ignores other pages', () => {
  assert.equal(resolve('/go', '?to=webui-users-sharing'), '/webui/owncloud_web/web_for_users.html#sharing')
  assert.equal(
    resolve(PREFIX + 'go.php', '?to=admin-sharing'),
    PREFIX + 'admin_manual/configuration/files/file_sharing_configuration.html'
  )
  assert.equal(resolve('/server/latest/go', '?to=webui-users-sharing'), null)
  assert.equal(resolve('/webui/owncloud_web/web_for_users.html', ''), null)
})

test('fallbackFor returns the version-root entrypoint for any key', () => {
  assert.equal(fallbackFor('admin-x'), 'index.html')
  assert.equal(fallbackFor('developer-x'), 'index.html')
  assert.equal(fallbackFor('user-x'), 'index.html')
  assert.equal(fallbackFor('anything-else'), 'index.html')
})

// Guard against version drift: PUBLISHED_VERSIONS must list exactly the server
// version segments the build actually emits under public/server/*.
test('PUBLISHED_VERSIONS matches the built server version segments', (t) => {
  const serverDir = path.join(__dirname, '..', 'public', 'server')
  if (!fs.existsSync(serverDir)) {
    t.skip('public/server not built (run `npm run antora` to enable)')
    return
  }
  const built = fs.readdirSync(serverDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  assert.deepEqual(
    [...PUBLISHED_VERSIONS].sort(),
    built,
    'PUBLISHED_VERSIONS in go-redirect.js is out of sync with public/server/* — update the list'
  )
})

// Guard against page moves: every mapped target must exist in the built site.
// Skips automatically when the site has not been built yet.
test('every mapped target exists in the built server/latest site', (t) => {
  const base = path.join(__dirname, '..', 'public', 'server', 'latest')
  if (!fs.existsSync(base)) {
    t.skip('public/server/latest not built (run `npm run antora` to enable)')
    return
  }
  const missing = []
  for (const [key, target] of Object.entries(MAPPING)) {
    if (!fs.existsSync(path.join(base, target))) missing.push(`${key} -> ${target}`)
  }
  // The unknown-key fallback landing must exist too.
  if (!fs.existsSync(path.join(base, fallbackFor('')))) missing.push(`(fallback) ${fallbackFor('')}`)
  assert.deepEqual(missing, [], 'mapped go.php targets missing from the build:\n' + missing.join('\n'))
})

// Guard against page moves for the site-level map: every target page must
// exist in the built site, and so must its #anchor, since released oCIS
// versions deep-link to it. The fallback landings must exist too.
test('every site-level mapped target and anchor exists in the built site', (t) => {
  const base = path.join(__dirname, '..', 'public')
  if (!fs.existsSync(base)) {
    t.skip('public not built (run `npm run antora` to enable)')
    return
  }
  const missing = []
  for (const [key, target] of Object.entries(SITE_MAPPING)) {
    const [page, anchor] = target.split('#')
    const file = path.join(base, page)
    if (!fs.existsSync(file)) {
      missing.push(`${key} -> ${target}`)
    } else if (anchor && !fs.readFileSync(file, 'utf8').includes(`id="${anchor}"`)) {
      missing.push(`${key} -> ${target} (anchor not found)`)
    }
  }
  for (const landing of [siteFallbackFor(''), siteFallbackFor('webui-x')]) {
    if (!fs.existsSync(path.join(base, landing))) missing.push(`(fallback) ${landing}`)
  }
  assert.deepEqual(missing, [], 'mapped go targets missing from the build:\n' + missing.join('\n'))
})
