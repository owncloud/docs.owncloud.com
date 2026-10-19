'use strict'

/**
 * config-sample-to-adoc — Antora extension
 *
 * Regenerates the server configuration parameter pages
 * (config_sample_php_parameters.adoc, config_apps_sample_php_parameters.adoc)
 * from the config.sample.php / config.apps.sample.php files in a local
 * owncloud/core checkout. It replaces the retired owncloud/config-to-docs tool.
 *
 * This is a maintainer tool, not part of the site build: the extension is
 * registered with `enabled: false` and is meant to be switched on locally,
 * with a core clone on the branch that matches the docs version. It writes
 * into content/, so the result is reviewed and committed like any other edit.
 *
 * Everything above the `// header end do not delete or edit this line` marker
 * in a target page is hand-written and kept; everything below it is replaced.
 * The target page must already exist and contain the marker.
 *
 * It listens to playbookBuilt, which fires before content is aggregated, so a
 * regenerated page is already picked up by the same build.
 *
 *   antora:
 *     extensions:
 *       - require: ./antora-extensions/config-sample-to-adoc.js
 *         enabled: true
 *         pairs:
 *           - source_path: ../core/config/config.sample.php
 *             target_path: content/server/11.0/modules/admin_manual/pages/configuration/server/config_sample_php_parameters.adoc
 *           - source_path: ../core/config/config.apps.sample.php
 *             target_path: content/server/11.0/modules/admin_manual/pages/configuration/server/config_apps_sample_php_parameters.adoc
 *         report_only: true
 *         stop_after_processing: true
 *
 * Config keys:
 *   pairs                 (array, required)          — Source→target pairs to process.
 *     source_path         (string, required)         — Path to a config.sample.php or
 *                                                      config.apps.sample.php file (a file,
 *                                                      not a URL). Relative paths are
 *                                                      resolved from the playbook directory.
 *     target_path         (string, required)         — Path to the existing .adoc page in this
 *                                                      repo. Resolved like source_path.
 *   report_only           (boolean, default: false)  — When true, only log which pages would
 *                                                      change; write nothing.
 *   stop_after_processing (boolean, default: false)  — When true, stop the Antora build with
 *                                                      exit code 0 once the pages are done.
 *                                                      Combine with report_only to inspect
 *                                                      without running a full build.
 */

const fs = require('node:fs')
const path = require('node:path')
const { convert } = require('./lib/config-sample-to-adoc')

module.exports.register = function ({ config }) {
  this.once('playbookBuilt', ({ playbook }) => {
    // Antora camelCases the keys of extension config, so the snake_case keys of
    // the playbook arrive as sourcePath, reportOnly, etc. An unknown key is an
    // error rather than ignored: a dry run that silently writes would be bad.
    const { pairs, reportOnly = false, stopAfterProcessing = false, ...unknown } = config
    if (Object.keys(unknown).length) {
      throw new Error(`config-sample-to-adoc: unknown config key(s): ${Object.keys(unknown).join(', ')}`)
    }
    if (!Array.isArray(pairs) || !pairs.length) {
      throw new Error('config-sample-to-adoc: `pairs` is required and must be a non-empty list')
    }
    const log = (message) => console.log(`[config-sample-to-adoc] ${message}`)

    for (const { sourcePath: source, targetPath: target, ...extra } of pairs) {
      if (typeof source !== 'string' || typeof target !== 'string' || Object.keys(extra).length) {
        throw new Error('config-sample-to-adoc: every pair needs exactly a `source_path` and a `target_path`')
      }
      const sourceFile = path.resolve(playbook.dir, source)
      const targetFile = path.resolve(playbook.dir, target)
      // Unlike the retired PHP tool, a bad path is an error, not a silent no-op.
      const sample = readFile(sourceFile, 'source_path')
      const current = readFile(targetFile, 'target_path')
      const updated = convert(sample, current)

      if (updated === current) {
        log(`unchanged: ${target}`)
      } else if (reportOnly) {
        log(`would update: ${target}`)
      } else {
        fs.writeFileSync(targetFile, updated)
        log(`updated: ${target}`)
      }
    }

    if (stopAfterProcessing) this.stop(0)
  })
}

function readFile (file, key) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch (err) {
    throw new Error(`config-sample-to-adoc: cannot read ${key} ${file}: ${err.message}`)
  }
}
