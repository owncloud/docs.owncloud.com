'use strict'

// Copies prebuilt browser bundles out of node_modules into the Antora UI
// supplemental tree. ui/supplemental is layered onto the stock UI bundle as
// plain files (site.yml ui.supplemental_files) -- there is no bundler step of
// our own -- so real npm dependencies (tracked in package.json/package-lock.json,
// and by Dependabot) still need their browser build placed on disk before
// Antora runs. Wired up as `preantora`/`preantora-local` in package.json.
//
// To vendor another package's browser build the same way, add an entry below
// rather than writing a new script.
const VENDOR_FILES = [
  { package: 'medium-zoom', src: 'dist/medium-zoom.min.js', dest: 'js/vendor/medium-zoom.min.js' },
  { package: 'medium-zoom', src: 'LICENSE', dest: 'js/vendor/LICENSE-medium-zoom.txt' },
]

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const VENDOR_DIR = path.join(ROOT, 'ui/supplemental/js/vendor')

// Wiped and repopulated on every run (this directory only ever holds files this
// script manages -- see the .gitignore entry), so dropping an entry from
// VENDOR_FILES actually removes the stale file instead of leaving it on disk
// for any local checkout or reused CI workspace that copied it in previously.
fs.rmSync(VENDOR_DIR, { recursive: true, force: true })

for (const { package: pkg, src, dest } of VENDOR_FILES) {
  const from = path.join(ROOT, 'node_modules', pkg, src)
  const to = path.join(ROOT, 'ui/supplemental', dest)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
}
