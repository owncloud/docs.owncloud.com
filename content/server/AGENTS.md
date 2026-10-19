# server

Agent guidelines for the server component under `content/server/`. Loaded on demand; repo-wide rules live in the root `AGENTS.md`.

## Config Parameter Pages

The server configuration parameter pages are generated from `config/config.sample.php` and
`config/config.apps.sample.php` in [owncloud/core](https://github.com/owncloud/core/tree/master/config)
by the `config-sample-to-adoc` Antora extension (`antora-extensions/config-sample-to-adoc.js`), which
replaces the retired owncloud/config-to-docs tool. This file is the rulebook that core's sample files point to.


The pages are `config_sample_php_parameters.adoc` and `config_apps_sample_php_parameters.adoc` under
`content/server/<version>/modules/admin_manual/pages/configuration/server/`. The `config-docs-in-sync` CI check
regenerates them and fails on any difference.

### Working with the pages

* **Edit above the line `// header end do not delete or edit this line`** in the page for the introduction.
  That part is kept. Everything below it is machine output; a hand edit there is lost on the next run.
  If the marker is deleted, or the page is missing, the generator fails instead of guessing.
* **To document a config key, change its comment in core**, then regenerate.
* **To regenerate**, check out the core branch matching the docs version (`master` for the version in
  development), point the `config-sample-to-adoc` entry in `site.yml` at it and at that version's pages, set
  `enabled: true`, and run `npm run antora-local`. `report_only: true` shows what would change without writing.
  Review and commit the diff. Revert `enabled` before committing.

The generator (`antora-extensions/lib/config-sample-to-adoc.js`) is a port of the PHP tool and reproduces its
output byte for byte, quirks included, so the published pages do not change. The quirks below are why the samples
in core have to be written carefully.

### How a docblock becomes AsciiDoc

Everything between `$CONFIG = [` and `];` is split on `/**`. Each docblock becomes one section, and the PHP code
following it (if any) becomes that section's code sample.

* **The first line is the heading.** It ends at the first `.` at end-of-line, or the first blank line, whichever
  comes first. A heading that swallows its second line usually lacks a trailing period. Avoid `..` and `...` in
  it: two consecutive dots end the heading on the spot, mid-line.
* **A docblock with no code after it** produces a level-2 heading (`== ...`); **with code after it**, a level-3
  heading plus a `==== Code Sample` block.
* **Everything after the heading is emitted as raw AsciiDoc**, so write valid AsciiDoc there (labeled lists
  `keyname::`, backtick spans, `**bold**`, link macros).

What survives: blank ` *` lines (so multiple paragraphs work), a lone ` * +` line (list continuations), link macros
including `?`, `&` and `#` in the URL, backticks and `%` anywhere, `**bold**` in the body and mid-heading, and
flush-left `-` and `*` lists.

### What breaks

* **Never start a line with `@` followed by a letter.** It is parsed as a phpDoc tag, and everything from there to
  the end of the docblock is dropped without warning. Indenting does not help. As the first line you get an empty
  heading.
* **Never put a ` */` inside the code that follows a docblock**, e.g. `'key' => 'value', /* note */`. The block is
  split on ` */`, so the whole code sample is dropped and the heading demotes from level 3 to level 2. A literal
  `/**` inside a sample value invents a bogus extra section.
* **Never begin a line with a single character followed by `-`.** A filter deletes that leading run, so a line
  wrapped onto `e-mail to the admin` is published as `-mail to the admin`. Mid-line is fine. The filter exists to
  pull indented `-` list items flush left.
* **Never follow a line consisting of one character with a line starting `-`.** The filter spans whitespace
  *including newlines*, so the character and the line break are both lost; a blank line between does not protect you.
* **Do not start a heading with `*`.** The leading asterisk is stripped: `**bold**` publishes as `*bold**`.
* **Keep `'`, `"`, `<`, `>` and `&` out of the first line of a level-2 heading.** It is HTML-escaped (an
  apostrophe becomes `&#039;`). Level-3 headings are not escaped, which is why `ownCloud's` survives today; do not
  rely on that.
* **Avoid double backticks and tabs in the body.** They collapse to one backtick and to a single space. In a
  heading both survive, and tabs inside a code sample survive too.
* **Avoid `{}` and `{@}` in the body.** They come out as `}` and `@`. Inline phpDoc tags such as `{@link ...}` are
  not supported: the generator stops with an error.
* **Indentation.** Do not rely on it. The first body line always loses its own indentation and is excluded from the
  calculation that dedents the rest, so the lines after it keep indentation only when some later non-blank line is
  flush left. An indented line following a blank line becomes an AsciiDoc literal block.

### Two rewrites to know about

* `.. warning::` (a reStructuredText leftover) becomes `WARNING: `. The pattern is not anchored: *any* two
  characters followed by ` warning::` match anywhere in a line. Write `WARNING:` directly.
* In a code sample, four leading spaces are stripped from each line, except the first, which is left-trimmed
  completely. Start every sample flush at four spaces, as the existing entries do.
