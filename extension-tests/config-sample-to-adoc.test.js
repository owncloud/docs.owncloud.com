'use strict'

// Guards for antora-extensions/config-sample-to-adoc.js and its converter in
// antora-extensions/lib/config-sample-to-adoc.js, the port of the retired
// owncloud/config-to-docs PHP tool.
//
// quirks.expected.adoc was produced by that PHP tool from quirks.sample.php, not
// by this code, so the golden test is a regression guard against the original
// behaviour -- including the quirks documented in content/server/AGENTS.md that look
// like bugs but are what the published pages were built with.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { convert, HEADER_END } = require('../antora-extensions/lib/config-sample-to-adoc')
const { register } = require('../antora-extensions/config-sample-to-adoc')

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', 'config-sample-to-adoc', name), 'utf8')

test('converter reproduces the output of the PHP tool, quirks included', () => {
  assert.equal(convert(fixture('quirks.sample.php'), fixture('quirks.target.adoc')), fixture('quirks.expected.adoc'))
})

test('converter keeps the hand-written header and replaces what is below the marker', () => {
  const out = convert(fixture('quirks.sample.php'), fixture('quirks.target.adoc'))
  assert.ok(out.startsWith('= Quirks\n:toc: right\n\nHand-written intro.\n\n' + HEADER_END + '\n\n'))
  assert.ok(!out.includes('stale generated content'))
})

test('converter accepts the array() syntax', () => {
  const out = convert('<?php\n$CONFIG = array(\n/**\n * Heading.\n */\n\'a\' => 1,\n);\n', HEADER_END)
  assert.ok(out.endsWith('=== Heading.\n\n==== Code Sample\n\n[source,php]\n....\n\'a\' => 1,\n....\n\n'))
})

test('converter fails loudly instead of wiping a page', () => {
  assert.throws(() => convert(fixture('quirks.sample.php'), '= No marker\n'), /hand-written header/)
  assert.throws(() => convert('<?php echo 1;', HEADER_END), /\$CONFIG/)
  assert.throws(() => convert('$CONFIG = [\n/**\n * Head.\n *\n * See {@link x}.\n */\n];', HEADER_END), /inline phpDoc tags/)
})

// Run the extension against real files in a temp playbook directory.
function setup (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-sample-to-adoc-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.writeFileSync(path.join(dir, 'config.sample.php'), fixture('quirks.sample.php'))
  fs.writeFileSync(path.join(dir, 'target.adoc'), fixture('quirks.target.adoc'))
  const logs = []
  t.mock.method(console, 'log', (message) => logs.push(message))
  return { dir, logs, target: path.join(dir, 'target.adoc') }
}

function run (dir, config) {
  let stopped
  const handlers = {}
  register.call({ once: (event, fn) => (handlers[event] = fn), stop: (code) => (stopped = code) }, { config })
  handlers.playbookBuilt({ playbook: { dir } })
  return { stopped }
}

// Antora camelCases the keys of extension config before the extension sees them.
const pairs = [{ sourcePath: 'config.sample.php', targetPath: 'target.adoc' }]

test('extension writes the regenerated page, resolving paths from the playbook dir', (t) => {
  const { dir, logs, target } = setup(t)
  const { stopped } = run(dir, { pairs })
  assert.equal(fs.readFileSync(target, 'utf8'), fixture('quirks.expected.adoc'))
  assert.match(logs[0], /updated: target\.adoc/)
  assert.equal(stopped, undefined)
})

test('extension reports a page that is already up to date', (t) => {
  const { dir, logs } = setup(t)
  run(dir, { pairs })
  run(dir, { pairs })
  assert.match(logs[1], /unchanged: target\.adoc/)
})

test('report_only logs the change and writes nothing', (t) => {
  const { dir, logs, target } = setup(t)
  run(dir, { pairs, reportOnly: true })
  assert.equal(fs.readFileSync(target, 'utf8'), fixture('quirks.target.adoc'))
  assert.match(logs[0], /would update: target\.adoc/)
})

test('stop_after_processing stops the build with exit code 0', (t) => {
  const { dir } = setup(t)
  assert.equal(run(dir, { pairs, stopAfterProcessing: true }).stopped, 0)
})

test('extension fails on bad configuration and bad paths', (t) => {
  const { dir } = setup(t)
  assert.throws(() => run(dir, {}), /`pairs` is required/)
  assert.throws(() => run(dir, { pairs: [{ sourcePath: 'config.sample.php' }] }), /exactly a `source_path` and a `target_path`/)
  assert.throws(() => run(dir, { pairs, report_only: true }), /unknown config key.*report_only/)
  assert.throws(() => run(dir, { pairs: [{ sourcePath: 'nope.php', targetPath: 'target.adoc' }] }), /cannot read source_path/)
  assert.throws(() => run(dir, { pairs: [{ sourcePath: 'config.sample.php', targetPath: 'nope.adoc' }] }), /cannot read target_path/)
})
