# content

Agent guidelines for authoring documentation under `content/` (AsciiDoc style, xrefs, links). Loaded on demand; repo-wide rules live in the root `AGENTS.md`.

## AsciiDoc Table Format

Always write AsciiDoc tables with one cell per line and a blank line between each complete row:

```asciidoc
[cols="...",options="header"]
|===
| Header 1
| Header 2
| Header 3

| row 1, cell 1
| row 1, cell 2
| row 1, cell 3

| row 2, cell 1
| row 2, cell 2
| row 2, cell 3
|===
```

- Each `|` starts a new line, regardless of cell count or content length.
- A blank line separates one complete row from the next.
- Span rows (e.g. `6+| _Section heading_`) are also followed by a blank line.
- Empty cells are written as a bare `|` on its own line.

## Fixing Xrefs After Markdown Migration

Content migrated from Markdown often carries broken cross-reference patterns. When you encounter them, apply the corrections below.

### Forbidden prefixes and extensions

- `xref:./` — relative path prefix is not allowed. Use the Antora page path from the `pages/` root (e.g. `ocis/storage/spaces.adoc`).
- `xref:something.md` or `xref:./something.md#...` — `.md` extension is wrong. Rename to `.adoc`.

### Broken anchor-only xrefs

A pattern like `xref:#something.adoc[text]` is not a valid anchor reference — it accidentally includes `.adoc` in what should be a fragment. These were originally links to sections in a different page. Resolve them to the correct page and Asciidoctor auto-generated anchor:

- Asciidoctor auto-generates anchors from section titles: lowercase, spaces become underscores, prefixed with `_`. Example: `== Storage Spaces` → `#_storage_spaces`.
- When the target page has duplicate section titles, Asciidoctor appends `_2`, `_3`, … to later occurrences.

### Garbled fragment + extension

A pattern like `xref:./terminology.md#storage-spaces.adoc[text]` combines all three errors above. Correct form: `xref:ocis/storage/terminology.adoc#_storage_spaces[text]`.

### Quick checklist when reviewing migrated xrefs

1. No `./` prefix.
2. No `.md` extension.
3. No `#something.adoc` as a fragment.
4. Fragment anchors use Asciidoctor format (`#_section_title`), not Markdown slugs (`#section-title`).
5. Verify the target file exists under `content/<product>/<version>/modules/<module>/pages/`.

## Converting External doc.owncloud.com Links to Xrefs

Links of the form `link:https://doc.owncloud.com/<component>/...` that point to pages which exist in this repository must be converted to `xref:` cross-references. External `link:` macros bypass Antora's link validation and break when the site structure changes.

### Mapping a URL to an xref

Given a URL `https://doc.owncloud.com/<component>/<module>/<path>.html#<fragment>`:

1. **Find the source file**: `find content/ -path "*/<module>/pages/<path>.adoc"`. If the file exists, convert.
2. **Determine the component name**: read `content/<component>/<version>/antora.yml` → `name:` field.
3. **Build the xref**: `xref:<component>:<module>:<path>.adoc#<fragment>[link text]`
   - Omit the version segment to let Antora resolve the latest version automatically.
   - Omit `#<fragment>` when the URL has no fragment.
4. **Verify the fragment**: fragments in HTML are governed by `idprefix` and `idseparator` in `global-attributes.yml`. This repo uses `idprefix: ''` and `idseparator: '-'`, so auto-generated section IDs match the HTML fragment directly (e.g. `==== Function Arguments` → `#function-arguments`). Confirm the section exists in the target file before using a fragment.

### Example

```
# Before
link:https://doc.owncloud.com/server/developer_manual/core/apis/ocs-share-api.html#function-arguments[text]

# After
xref:server:developer_manual:core/apis/ocs-share-api.adoc#function-arguments[text]
```

### Links That Cannot Be Converted

Do **not** convert `doc.owncloud.com` URLs that appear inside any of the following contexts — AsciiDoc does not process macros inside verbatim or code regions:

- **Literal / source blocks** (`----` or `[source,...]` delimited blocks) — the URL is rendered as plain text and is intentional (e.g. a checklist template or a config comment).
- **`.env` / config file code blocks** — comment lines starting with `#` that reference documentation are part of the embedded file content; they cannot contain xref macros.
- **Diagram blocks** (e.g. Mermaid `@startdiagram`) — participant link metadata is processed by the diagram renderer, not by Asciidoctor.
- **Base URLs with no page path** (e.g. `https://doc.owncloud.com/ocis/`) — there is no target page to map to an xref.

When presenting a table of convertible links, mark these rows as `NOT CONVERTIBLE` and state the reason (e.g. "in source block", "in Mermaid diagram").

### Developer Docs Audit (2026-10-15)

`content/ocis/9.0/modules/developer/` was fully audited. Every `doc.owncloud.com` occurrence is in a non-convertible context (source/literal blocks, Mermaid diagram participant directives, bare base URLs, plain prose). No xref conversions are outstanding. Re-run the grep if new files are added.

## External Link Maintenance

When auditing external `link:` URLs for validity:

1. **Permanent redirects (301)** — update the link to the canonical target URL. The redirect target is authoritative; leaving the old URL means every visitor follows an unnecessary hop and the link may break again if the redirect is removed.

2. **Temporary redirects (302/307)** — evaluate case by case. A `master`→`main` branch rename on GitHub (302) should be updated; a login-wall redirect (e.g. transifex requiring sign-in) is expected behaviour and should be left as-is.

3. **Permanent redirects (308)** — treat the same as 301: update to the redirect target.

4. **403 bot-blocked** — do **not** treat as broken. Many sites (npmjs.com, medium.com, ClamAV docs) return 403 to headless HTTP clients but serve content normally in a browser. Only flag as broken if a manual browser check also fails.

5. **Private GitHub repositories** (e.g. `https://github.com/owncloud/enterprise/...`) return 404 to unauthenticated requests. These links are valid — the repository is private, not gone. Do not flag or remove them.

6. **Links inside code blocks, literal blocks, `.env` blocks, or diagram blocks** — cannot be updated to xref macros and must stay as plain URLs. See "Links That Cannot Be Converted" above for the full list of non-convertible contexts.

7. **Reporting** — present findings as a numbered table with columns: `#`, `File:Line`, `Status`, `Current URL`, `Suggested URL`. Separate broken links (4xx) from redirects. Apply fixes only after explicit user confirmation.

## AsciiDoc Image Width

All images — both block (`image::`) and inline (`image:`) — must include a `width=` attribute. The first positional attribute in the brackets is alt text and is left empty, so the width is always preceded by a comma:

```asciidoc
image::path/to/image.svg[,width=300]
image:path/to/image.svg[,width=300]
```

- If no width is present, add `,width=300` as the default.
- If a width is already set, leave its value unchanged.
- Never write `[width=300]` without the leading comma.

## AsciiDoc List Formatting

A list must be preceded by a blank line. If the first list item immediately follows a paragraph or any other block with no blank line in between, AsciiDoc will not render it as a list.

Use `*` instead of `-` for unordered list items. Both render identically but `*` is easier to read in source.

```asciidoc
// Wrong — no blank line before list, wrong marker
Some text:
- item one
- item two

// Correct
Some text:

* item one
* item two
```

This applies to all list types: unordered (`*`), ordered (`.`), and description lists.

## AsciiDoc Section Heading Capitalisation

All section headings (lines starting with one or more `=` followed by a space) must use **Associated Press (AP) title case**. Use https://headlinecapitalization.com/ (select "AP" style) as the reference tool when writing or reviewing headings.

Rules in brief:
- Capitalise the first and last word, all "major" words (nouns, verbs, adjectives, adverbs).
- Do **not** capitalise articles (`a`, `an`, `the`), coordinating conjunctions (`and`, `but`, `or`, `nor`, `for`, `so`, `yet`) or short prepositions unless they are the first or last word.
- **Proper names keep their original casing** regardless of position — e.g. `reva`, `oCIS`, `WebDAV`, `CS3` are never up-cased or down-cased to fit title case rules.

```asciidoc
// Wrong
== a dedicated shares storage provider
== The Gateway should be responsible for Path transformations

// Correct
== A Dedicated Shares Storage Provider
== The Gateway Should Be Responsible for Path Transformations
```

## Xref Link Text vs. AP-Capitalised Section Heading

When section headings are updated to AP title case, `xref:` link text across the codebase may lag behind. This check is **never run automatically** — only when explicitly requested, scoped to one of:

- a **source file** (check all headings in that file, find all xrefs pointing to them anywhere in the module/component)
- a **referencing file** (check all xrefs in that file, compare their link text against the current heading in the target page)
- a **full module** (both of the above across every page in the module)

### Procedure

1. For each `xref:` in scope, resolve the target page and anchor, then read the actual section heading.
2. Compare the heading (AP-cased) with the xref link text.
3. **Close match** (same words, different casing, minor article/preposition difference) → flag as a likely stale link text that should be updated to match the heading.
4. **Significant difference** (xref text is a descriptive phrase rather than the heading title) → do **not** auto-correct; this is intentional. Flag it separately so a human can decide.
5. **Cross-component or cross-module references** (xref target includes a component prefix, e.g. `xref:server:…`) → highlight these prominently — they are harder to trace and may span a different release cycle.

### Output format

Always report as a **numbered table** so the user can reference items by number. Never silently fix — present findings first and wait for explicit confirmation.

Use two separate tables: one for close matches (fixable) and one for significant differences (human review). Add a `[CROSS-COMPONENT]` note in the Notes column for xrefs that include a component prefix.

```
**Close matches — pending confirmation:**

| # | File | xref link text | Actual heading/title | Notes |
|---|---|---|---|---|
| 1 | `ocis/storage/namespaces.adoc:42` | `webdav` | `WebDAV` | Casing only |
| 2 | `ocis/storage/index.adoc:10` | `OCS share api` | `OCS Share API` | [CROSS-COMPONENT] |

**Significant differences — human review required:**

| # | File | xref link text | Actual heading/title | Notes |
|---|---|---|---|---|
| 3 | `ocis/storage/index.adoc:15` | `_references_` | `References` | Descriptive/intentional |
```

Only apply corrections after explicit user confirmation, referencing items by number.
