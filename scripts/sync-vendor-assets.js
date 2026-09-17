'use strict'

// Copies the medium-zoom browser bundle out of node_modules into the Antora UI
// supplemental tree. ui/supplemental is layered onto the stock UI bundle as
// plain files (site.yml ui.supplemental_files) -- there is no bundler step of
// our own -- so a real npm dependency (tracked in package.json/package-lock.json,
// and by Dependabot) still needs its browser build placed on disk before Antora
// runs. Wired up as `preantora`/`preantora-local` in package.json.

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const PKG_DIR = path.join(ROOT, 'node_modules/medium-zoom')
const VENDOR_DIR = path.join(ROOT, 'ui/supplemental/js/vendor')

fs.mkdirSync(VENDOR_DIR, { recursive: true })
fs.copyFileSync(path.join(PKG_DIR, 'dist/medium-zoom.min.js'), path.join(VENDOR_DIR, 'medium-zoom.min.js'))
fs.copyFileSync(path.join(PKG_DIR, 'LICENSE'), path.join(VENDOR_DIR, 'LICENSE-medium-zoom.txt'))
