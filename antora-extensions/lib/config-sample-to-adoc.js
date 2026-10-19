'use strict'

/**
 * Convert ownCloud core's config.sample.php / config.apps.sample.php into the
 * AsciiDoc parameter pages under admin_manual/pages/configuration/server.
 *
 * This is a port of the retired owncloud/config-to-docs PHP tool. The output has
 * to stay byte-identical to what that tool produced, so its quirks are kept on
 * purpose -- see content/server/AGENTS.md for the ones that
 * matter to people editing the samples in core. The tool leaned on
 * phpdocumentor/reflection-docblock for the docblock split; splitDocBlock()
 * below is the same regular expression.
 *
 * Pure function, no I/O: the extension in ../config-sample-to-adoc.js does that.
 *
 * Derived from owncloud/config-to-docs, licensed under the MIT License:
 *
 * Copyright (c) 2018, ownCloud GmbH. Original author: Matthew Setter.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

const HEADER_END = '// header end do not delete or edit this line'

// PHP's trim() default character list.
const PHP_WS = '[ \\t\\n\\r\\0\\x0B]'
const phpTrim = (s) => s.replace(new RegExp(`^${PHP_WS}+|${PHP_WS}+$`, 'g'), '')

// Zend\Filter\StringTrim
const stringTrim = (s) => s.replace(/^\s+|\s+$/gu, '')

// \s as PCRE reads it without the /u flag.
const WS = '[ \\t\\n\\r\\f\\v]'

const DESCRIPTION_FILTERS = [
  [new RegExp(`^([^\\n]${WS}*)(?=-)`, 'gm'), ''],
  [new RegExp(`[^\\n][^\\n] warning::${WS}*`, 'gm'), 'WARNING: '],
  [/``/gm, '`'],
  [/\t/gm, ' '],
]
const SUMMARY_FILTER = new RegExp(`^${WS}*\\*${WS}*`, 'gm')
const CODE_FILTER = /^ {4}/gm

// Twig escapes the level-2 heading (autoescape) but not the rest (|raw).
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')

// phpDocumentor\Reflection\DocBlockFactory::stripDocComment()
function stripDocComment (docBlock) {
  let comment = phpTrim(docBlock.replace(/[ \t]*(?:\/\*\*|\*\/|\*)?[ \t]?([^\n]*)/g, '$1'))
  if (comment.endsWith('*/')) comment = phpTrim(comment.slice(0, -2))
  return comment.replace(/\r\n|\r/g, '\n')
}

// phpDocumentor\Reflection\DocBlockFactory::splitDocBlock(), summary and description only.
const SPLIT = new RegExp(
  '^' +
    '(?:(#@\\+|#@-)\\n?)?' +
    '(?:(?!@\\p{L})(' +
    '[^\\n.]+' +
    '(?:(?!\\.\\n|\\n{2})[\\n.](?![ \\t]*@\\p{L})[^\\n.]+)*' +
    '\\.?' +
    ')?)' +
    '(?:\\s*(?!@\\p{L})([^\\n]+(?:\\n+(?![ \\t]*@\\p{L})[^\\n]+)*))?' +
    '(\\s+[\\s\\S]*)?',
  'u'
)

function splitDocBlock (comment) {
  // A docblock that starts with a tag has no summary and no description.
  if (comment.startsWith('@')) return { summary: '', description: '' }
  const match = SPLIT.exec(comment.replace(/[ \t]+$/gm, ''))
  return { summary: match[2] || '', description: match[3] || '' }
}

// phpDocumentor\Reflection\DocBlock\DescriptionFactory
function renderDescription (description) {
  if (!description || description === '0') return ''
  const lines = description.split('\n')
  if (lines.length > 1) {
    let strip = Infinity
    for (const line of lines.slice(1)) {
      if (phpTrim(line) === '') continue
      strip = Math.min(strip, line.length - line.replace(new RegExp(`^${PHP_WS}+`), '').length)
    }
    if (strip > 0 && strip !== Infinity) description = [lines[0], ...lines.slice(1).map((l) => l.slice(strip))].join('\n')
  }
  if (/\{@(?!\})/.test(description)) {
    throw new Error(`inline phpDoc tags ({@...}) are not supported in the config samples: ${description}`)
  }
  return description.replace(/\{@\}/g, '@').replace(/\{\}/g, '}')
}

function buildRow (docBlock, codeBlock) {
  const { summary, description } = splitDocBlock(stripDocComment(docBlock))
  let desc = stringTrim(renderDescription(description))
  for (const [pattern, replacement] of DESCRIPTION_FILTERS) desc = desc.replace(pattern, replacement)
  return {
    summary: stringTrim(summary).replace(SUMMARY_FILTER, ''),
    description: desc,
    sectionHeader: codeBlock === null,
    code: codeBlock === null ? '' : stringTrim(codeBlock).replace(CODE_FILTER, ''),
  }
}

function extractBlocks (source) {
  const match = /\$CONFIG = array\(([\s\S]*)\);/.exec(source) || /\$CONFIG = \[([\s\S]*)\];/.exec(source)
  if (!match) throw new Error('no `$CONFIG = [` or `$CONFIG = array(` found in the source file')
  return match[1].split('/**')
}

function parseBlock (block) {
  const parts = ('/**' + block).split(' */')
  const codeBlock = parts.length === 2 && phpTrim(parts[1]) !== '' ? parts[1] : null
  return buildRow(parts[0] + ' */', codeBlock)
}

function render (rows) {
  return rows
    .map(({ summary, description, sectionHeader, code }) => {
      let out = sectionHeader ? `== ${escapeHtml(phpTrim(summary))}\n` : `=== ${phpTrim(summary)}\n`
      if (description) out += `\n${phpTrim(description)}\n`
      if (code) out += `\n==== Code Sample\n\n[source,php]\n....\n${phpTrim(code)}\n....\n`
      return out + '\n'
    })
    .join('')
}

/**
 * @param {string} source - contents of config.sample.php / config.apps.sample.php
 * @param {string} existingTarget - current contents of the target page; everything
 *   above the "header end" marker is hand-written and is kept
 * @returns {string} the new contents of the target page
 */
function convert (source, existingTarget) {
  const current = phpTrim(existingTarget)
  const marker = current.lastIndexOf(HEADER_END)
  if (marker < 0) {
    throw new Error(`the target page has no "${HEADER_END}" line, so the hand-written header cannot be kept`)
  }
  const header = current.slice(0, marker) + HEADER_END + '\n\n'
  const rows = extractBlocks(source)
    .filter((block) => phpTrim(block) !== '')
    .map(parseBlock)
  return header + render(rows)
}

module.exports = { convert, HEADER_END }
