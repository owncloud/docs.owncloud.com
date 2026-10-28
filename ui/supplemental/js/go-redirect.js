/*
 * Static replacement for the legacy server-side `go.php` documentation
 * redirector.
 *
 * ownCloud core (lib/private/legacy/defaults.php::buildDocLinkToKey) builds
 * deep links into the docs as:
 *
 *     https://doc.owncloud.com/server/<version>/go.php?to=<key>
 *
 * On the old Sphinx site `go.php` was a PHP script that 302-redirected the
 * key to the real page (see owncloud/enterprise .../ocdoc/go.php). The docs
 * now build as a static Antora site on GitHub Pages, which executes no PHP and
 * ignores the query string, so every one of those links 404s. Because every
 * ownCloud server already deployed keeps emitting `go.php?to=` links, we cannot
 * fix this purely in core -- we must honor the old URL shape on the site.
 *
 * GitHub Pages serves the site-wide custom 404 page for the missing `go.php`
 * path (a file literally named `go.php` would be served as
 * application/x-httpd-php, i.e. downloaded, so a static stub does NOT work).
 * This script is loaded from the page <head> on EVERY page; it is a no-op
 * except when the current path ends in `go.php` (reproducing the original
 * redirector against the current Antora page layout) or is the site-level
 * `go` endpoint that ownCloud Web links to (see SITE_MAPPING), which likewise
 * falls through to the 404 page.
 *
 * The key -> target map is derived from the `:page-aliases: go/<key>.adoc`
 * stubs the docs already generate (the maintained source of truth), plus the
 * keys core requests that had no alias yet. Targets are relative to the
 * version root (e.g. /server/latest/), matching how the links are versioned.
 *
 * Version remap: core emits the CONCRETE server version in the path (e.g.
 * /server/10.16/go.php). The site now publishes every real version explicitly,
 * so a known version segment is kept as-is for per-version fidelity. Only a
 * segment with no published tree -- an old, long-unpublished release from a
 * still-deployed server -- is remapped to `latest` (a static redirect tree
 * built by the latest-alias extension) as a safety net. PUBLISHED_VERSIONS is
 * checked in CI against the built public/server/* directories so it cannot
 * silently go stale.
 */
;(function (root) {
  'use strict'

  // Server version path segments that have their own published doc tree. Every
  // real version is now published explicitly, so these pass through untouched;
  // only unknown/old segments with no tree fall back to `latest`. `latest`
  // itself is included because it is a valid served segment (a redirect tree
  // built by the latest-alias extension), and so is `next` (the same, built by
  // the next-alias extension for the legacy `…/next/…` URLs) -- a go.php link
  // under either resolves inside that tree and its stub carries the reader on to
  // the real version. Both are permanent entries, not versions to maintain.
  // The real version numbers are the ONE part of this list that must be
  // maintained by hand on each server release — the latest-alias extension and
  // the sitemap keep-set both derive `latest` automatically from
  // component.latest. The unit tests fail the build if this list drifts from
  // the published server segments.
  var PUBLISHED_VERSIONS = ['10.16', '11.0', 'latest', 'next']

  // key -> path relative to the version root (…/server/<version>/).
  var MAPPING = {
    // -- admin manual --------------------------------------------------------
    'admin-background-jobs': 'admin_manual/configuration/server/background_jobs_configuration.html',
    'admin-backup': 'admin_manual/maintenance/backup_and_restore/backup.html',
    'admin-cli-upgrade': 'admin_manual/configuration/server/occ_command.html',
    'admin-config': 'admin_manual/configuration/server/config_sample_php_parameters.html',
    'admin-db-conversion': 'admin_manual/configuration/database/db_conversion.html',
    'admin-dir_permissions': 'admin_manual/installation/installation_wizard.html',
    'admin-email': 'admin_manual/configuration/server/email_configuration.html',
    'admin-encryption': 'admin_manual/configuration/files/encryption/encryption_configuration.html',
    'admin-enterprise-license': 'admin_manual/enterprise/installation/install.html',
    'admin-external-storage': 'admin_manual/configuration/files/external_storage/configuration.html',
    'admin-install': 'admin_manual/installation/index.html',
    'admin-ldap': 'admin_manual/configuration/user/user_auth_ldap.html',
    'admin-logfiles': 'admin_manual/troubleshooting/general_troubleshooting.html',
    'admin-marketplace-apps': 'admin_manual/maintenance/upgrading/marketplace_apps.html',
    'admin-monitoring': 'admin_manual/installation/deployment_considerations.html',
    'admin-performance': 'admin_manual/configuration/server/oc_server_tuning.html',
    'admin-php-fpm': 'admin_manual/installation/configuration_notes_and_tips.html',
    'admin-reverse-proxy': 'admin_manual/configuration/server/reverse_proxy_configuration.html',
    'admin-security': 'admin_manual/configuration/server/harden_server.html',
    'admin-setup-well-known-URL': 'admin_manual/troubleshooting/general_troubleshooting.html',
    'admin-sharing': 'admin_manual/configuration/files/file_sharing_configuration.html',
    'admin-sharing-federated': 'admin_manual/configuration/files/federated_cloud_sharing_configuration.html',
    'admin-source_install': 'admin_manual/installation/manual_installation/manual_installation.html',
    'admin-transactional-locking': 'admin_manual/configuration/files/files_locking_transactional.html',
    'admin-untrusted-domains': 'admin_manual/maintenance/migrating.html',
    'enable-http-strict-transport-security': 'admin_manual/configuration/server/harden_server.html',
    'use-https': 'admin_manual/configuration/server/harden_server.html',

    // -- developer manual ----------------------------------------------------
    'admin-code-integrity': 'developer_manual/app/advanced/code_signing.html',
    'admin-provisioning-api': 'developer_manual/core/apis/provisioning-api.html',
    'developer-code-integrity': 'developer_manual/app/advanced/code_signing.html',
    'developer-theming': 'developer_manual/core/theming.html',

    // -- user manual (now the "classic_ui" module) ---------------------------
    'user-encryption': 'classic_ui/files/encrypting_files.html',
    'user-files': 'classic_ui/files/index.html',
    'user-manual': 'classic_ui/index.html',
    'user-sharing-federated': 'classic_ui/files/federated_cloud_sharing.html',
    'user-sync-calendars': 'classic_ui/apps/calendar.html',
    'user-sync-contacts': 'classic_ui/apps/contacts.html',
    'user-trashbin': 'classic_ui/files/deleted_file_management.html',
    'user-versions': 'classic_ui/files/version_control.html',
    'user-webdav': 'classic_ui/files/access_webdav.html'
  }

  // key -> path relative to the site root, for links that are not tied to a
  // server version. ownCloud Web (oCIS) links its contextual help as
  //
  //     https://doc.owncloud.com/go?to=<key>
  //
  // i.e. a root-level `go` without `.php` and without a version segment. Every
  // released oCIS keeps emitting these, so the targets are maintained here.
  var SITE_MAPPING = {
    'webui-users-sharing': 'webui/owncloud_web/web_for_users.html#sharing'
  }

  // Landing page for an unknown/mistyped key. The original go.php split the
  // fallback by key prefix (admin_manual / developer_manual / user_manual), but
  // those manuals have since been reorganized and an unknown key has no better
  // destination than the server docs entrypoint, so we send every unknown key
  // to the version root (index.html) regardless of prefix. `key` is accepted
  // for signature stability and future per-prefix routing if ever needed.
  function fallbackFor (key) { // eslint-disable-line no-unused-vars
    return 'index.html'
  }

  // Landing page for an unknown site-level key. A `webui-*` key that Web ships
  // before SITE_MAPPING is updated lands on the Web docs instead of the site
  // landing page. Relative to the site root.
  function siteFallbackFor (key) {
    return /^webui-/.test(key) ? 'webui/index.html' : 'index.html'
  }

  // Return map[key], or fallback(key) when the key is not mapped.
  function lookup (map, fallback, key) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback(key)
  }

  /**
   * Return the value of the `to` query parameter, or '' when absent.
   *
   * @param {string} search e.g. "?to=admin-sharing"
   * @returns {string}
   */
  function parseKey (search) {
    // URLSearchParams handles '+', percent-decoding, and values containing
    // '='; it never throws on a malformed escape (unlike a bare
    // decodeURIComponent), so a garbage query degrades to the fallback landing
    // rather than an uncaught exception that leaves the 404 visible.
    if (typeof URLSearchParams !== 'undefined') {
      return new URLSearchParams(search || '').get('to') || ''
    }
    // Fallback for very old engines without URLSearchParams (e.g. IE).
    var params = (search || '').replace(/^\?/, '').split('&')
    for (var i = 0; i < params.length; i++) {
      var eq = params[i].indexOf('=')
      if (params[i].slice(0, eq === -1 ? params[i].length : eq) === 'to') {
        var raw = (eq === -1 ? '' : params[i].slice(eq + 1)).replace(/\+/g, ' ')
        try { return decodeURIComponent(raw) } catch (e) { return raw }
      }
    }
    return ''
  }

  /**
   * Resolve a site-level `go?to=<key>` request, or return null when the path
   * is not the site-level endpoint. Only `/go` directly under the site root
   * matches, optionally behind a single project-pages prefix
   * (e.g. "/owncloud-docs-monorepo/go"); a nested `.../latest/go` does not.
   *
   * @param {string} pathname e.g. "/go"
   * @param {string} search   e.g. "?to=webui-users-sharing"
   * @returns {string|null} the redirect target, relative to the site, or null
   */
  function resolveSiteGo (pathname, search) {
    if (!/^(\/[^/]+)?\/go$/.test(pathname)) return null

    var siteRoot = pathname.replace(/go$/, '') // keeps trailing slash
    return siteRoot + lookup(SITE_MAPPING, siteFallbackFor, parseKey(search))
  }

  /**
   * Given the current location's pathname and query string, return the URL to
   * redirect a legacy `go.php?to=<key>` request to, or null when this is not a
   * go.php request (so callers leave the page untouched).
   *
   * @param {string} pathname e.g. "/server/latest/go.php"
   * @param {string} search   e.g. "?to=admin-sharing"
   * @returns {string|null} the redirect target, relative to the site, or null
   */
  function resolveGoPhp (pathname, search) {
    // Only act on the exact legacy endpoint: a path segment named "go.php".
    if (!/\/go\.php$/.test(pathname)) return null

    var versionRoot = pathname.replace(/go\.php$/, '') // keeps trailing slash

    // Remap the version segment ".../server/<version>/" to a published one.
    // Published versions pass through unchanged; only a version not in
    // PUBLISHED_VERSIONS (an old, unpublished release) is remapped to `latest`.
    versionRoot = versionRoot.replace(/(\/server\/)([^/]+)(\/)$/, function (m, pre, version, post) {
      return PUBLISHED_VERSIONS.indexOf(version) === -1 ? pre + 'latest' + post : m
    })

    return versionRoot + lookup(MAPPING, fallbackFor, parseKey(search))
  }

  /**
   * Return the redirect target for either endpoint, or null for any other page.
   *
   * @param {string} pathname
   * @param {string} search
   * @returns {string|null}
   */
  function resolve (pathname, search) {
    return resolveSiteGo(pathname, search) || resolveGoPhp(pathname, search)
  }

  // Export for the browser (auto-redirect) and for tests (Node/CommonJS).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      resolve: resolve,
      resolveSiteGo: resolveSiteGo,
      resolveGoPhp: resolveGoPhp,
      MAPPING: MAPPING,
      SITE_MAPPING: SITE_MAPPING,
      fallbackFor: fallbackFor,
      siteFallbackFor: siteFallbackFor,
      PUBLISHED_VERSIONS: PUBLISHED_VERSIONS
    }
  } else if (root && root.location) {
    var to = resolve(root.location.pathname, root.location.search)
    if (to) root.location.replace(to)
  }
})(typeof window !== 'undefined' ? window : this)
