'use strict'

/**
 * Resolve `latest` version segments in llms.txt at build time.
 *
 * ui/supplemental/llms.txt is the human-maintained template. It uses `latest`
 * as the version segment for every component URL (e.g. /ocis/latest/admin/).
 * Antora copies that file verbatim to public/llms.txt -- but `latest` on the
 * static-hosted site is a tree of <meta http-equiv="refresh"> redirect stubs,
 * not real content pages, so URL validators (including CI) reject it.
 *
 * This extension runs at sitePublished, reads public/llms.txt, and replaces
 * every /<component>/latest/ segment with the component's actual GA version
 * (the same version `latest-alias.js` mirrors). Explicit version numbers in the
 * template (e.g. /ocis/9.0/developer/ for a module that only exists in a
 * prerelease) are left untouched.
 *
 * Maintenance: when a prerelease version graduates to GA and `latest` moves to
 * it, change the explicit version in the template to `latest` -- this extension
 * will resolve it automatically from then on.
 */

const path = require('path')
const fs = require('fs')

module.exports.register = function () {
  const latestByComponent = {}

  this.once('contentClassified', ({ contentCatalog }) => {
    contentCatalog.getComponents().forEach((component) => {
      const latest = component.latest
      if (latest && latest.version) latestByComponent[component.name] = latest.version
    })
  })

  this.once('sitePublished', ({ playbook, publications }) => {
    const logger = this.getLogger('llms-txt')
    const outputDir = publications[0].resolvedPath
    const llmsFile = path.join(outputDir, 'llms.txt')

    let content
    try {
      content = fs.readFileSync(llmsFile, 'utf8')
    } catch (e) {
      logger.warn('llms.txt not found at: ' + llmsFile + ' -- skipping')
      return
    }

    let changed = false

    Object.entries(latestByComponent).forEach(([name, version]) => {
      // Match /<component>/latest/ regardless of domain so the replacement works
      // for both the production build (https://doc.owncloud.com) and local
      // preview builds (http://localhost:8080). Escape hyphens in component
      // names such as `ios-app`.
      const escapedName = name.replace(/-/g, '\\-')
      const pattern = new RegExp(`(https?:\\/\\/[^/]+\\/${escapedName})\\/latest\\/`, 'g')
      const updated = content.replace(pattern, `$1/${version}/`)
      if (updated !== content) {
        content = updated
        changed = true
      }
    })

    if (!changed) {
      logger.warn('llms.txt: no latest/ segments found to resolve -- check template')
      return
    }

    try {
      fs.writeFileSync(llmsFile, content, { encoding: 'utf8', mode: 0o664 })
      logger.info('llms.txt: resolved latest/ segments to real version numbers')
    } catch (e) {
      logger.warn('llms.txt: failed to write resolved file: ' + e.message)
    }
  })
}
