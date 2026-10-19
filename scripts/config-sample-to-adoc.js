'use strict'

// Regenerate one server config parameter page from a core config sample:
//
//   node scripts/config-sample-to-adoc.js <config.sample.php> <page.adoc>
//
// Used by the config-docs-in-sync workflow, which has no Antora build. Locally,
// prefer the config-sample-to-adoc Antora extension (see site.yml). Errors exit
// non-zero.

const fs = require('node:fs')
const { convert } = require('../antora-extensions/lib/config-sample-to-adoc')

const [source, target] = process.argv.slice(2)
if (!source || !target) {
  console.error('usage: node scripts/config-sample-to-adoc.js <config.sample.php> <page.adoc>')
  process.exit(2)
}
fs.writeFileSync(target, convert(fs.readFileSync(source, 'utf8'), fs.readFileSync(target, 'utf8')))
