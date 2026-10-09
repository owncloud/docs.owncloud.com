# AI Agent Guidelines for ownCloud Docs

This file provides context for AI coding agents (Claude Code, GitHub Copilot, Cursor, etc.) working in this repository.

## Repository Overview
- **Product family:** Documentation
- **Primary language(s):** JavaScript, AsciiDoc
- **Build system:** npm (Antora + Pagefind)
- **Test framework:** `node --test` (`npm test`), plus the Antora build itself (`npm run antora`)
- **CI system:** GitHub Actions (build & deploy to GitHub Pages)

## Architecture & Key Paths

This is the consolidated documentation **monorepo**. It supersedes the previous
9-repo setup (1 orchestrator + 7 content repos + a custom UI repo).

- `site.yml` -- Antora playbook; all content sources are local
- `content/<product>/<version>/` -- documentation content; products are `main`, `server`, `webui`, `ocis`, `desktop`, `android`, `ios`
- `antora-extensions/` -- custom Antora extensions (`comp-version`, `latest-alias`, `next-alias`, `sitemap-cleanup`, `load-global-site-attributes`)
- `asciidoc-extensions/` -- custom AsciiDoc extensions (`tabs`, `remote-include-processor`)
- `ui/supplemental/` -- supplemental files layered onto the stock Antora default UI
- `global-attributes.yml` -- site-wide AsciiDoc attributes
- `sync/` -- the retired upstream import tooling (`manifest.yml`, `patches/`); kept for provenance
- `extension-tests/` -- Node test suite
- `scripts/` -- one-off build helpers (e.g. `sync-vendor-assets.js`, wired as `preantora`/`preantora-local`)
- `package.json` -- npm scripts

## Development Conventions
- **Branching:** `main`
- **Commit messages:** Conventional Commits; DCO sign-off required (`git commit -s`)
- **PR process:** Open a PR against `main`. All CI checks must pass. PR titles are linted for Conventional Commits format.

## Build & Test Commands
```bash
# Build
npm run antora          # Antora site build only
npm run build           # Antora build + Pagefind search index

# Test -- build first: 4 of the redirect/alias tests skip themselves without public/
npm run antora && npm test

# Preview
npm run antora-local && npm run serve   # http://localhost:8080
```

Node 22 is used in CI.

## Important Constraints
- All contributions must be compatible with the **AGPL-3.0** license
- Do not introduce new **copyleft-licensed dependencies** (GPL, AGPL, LGPL, MPL) without explicit discussion in an issue first. This is especially important for repos migrating to Apache 2.0.
- Do not introduce new dependencies without discussion in an issue first
- **Versions are folders, not branches.** A new documentation version is a new directory under `content/<product>/<version>/` -- never a git branch, and never a backport.
- **The upstream mirror is retired.** Content is authored in this repository. Do not re-introduce a sync from the archived `docs-*` repos.

## OSPO Policy Constraints

### GitHub Actions
- **Only** use actions owned by `owncloud`, created by GitHub (`actions/*`), verified on the GitHub Marketplace, or verified by the ownCloud Maintainers.
- Pin all actions to their full commit SHA (not tags): `uses: actions/checkout@<SHA> # vX.Y.Z`
- Never introduce actions from unverified third parties.

### Dependency Management
- Dependabot is configured for automated dependency updates.
- Review and merge Dependabot PRs as part of regular maintenance.
- Do not introduce new dependencies without discussion in an issue first.

### Git Workflow
- **Rebase policy**: Always rebase; never create merge commits. Use `git pull --rebase` and `git rebase` before pushing.
- **Signed commits**: All commits **must** be PGP/GPG signed (`git commit -S -s`).
- **DCO sign-off**: Every commit needs a `Signed-off-by` line (`git commit -s`).
- **Conventional Commits & Squash Merge**: Use the [Conventional Commits](https://www.conventionalcommits.org/) format. This repository squash-merges, so the PR title becomes the commit message on `main` -- apply Conventional Commits format to PR titles as well. A GitHub Actions workflow enforces this.

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

```asciidoc
// Wrong — no blank line before list
Some text:
- item one
- item two

// Correct
Some text:

- item one
- item two
```

This applies to all list types: unordered (`-`, `*`), ordered (`.`), and description lists.

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

Always report as a numbered list grouped by file, never silently fix:

```
File: ocis/storage/namespaces.adoc
  1. xref:ocis/storage/spacesprovider.adoc#webdav[webdav]
     Heading: "WebDAV"  →  suggest link text: "WebDAV"
  2. [CROSS-COMPONENT] xref:server:developer_manual:core/apis/ocs-share-api.adoc[OCS share api]
     Heading: "OCS Share API"  →  suggest link text: "OCS Share API"

File: ocis/storage/index.adoc
  3. [INTENTIONAL — differs significantly, review manually]
     xref:ocis/storage/terminology.adoc#references[_references_]
     Heading: "References"
```

Only apply corrections after explicit user confirmation.

## File Relationship: CLAUDE.md and AGENTS.md

`CLAUDE.md` is a symlink to this file (`AGENTS.md`). Both names are provided so that different AI tools find their expected filename — Claude Code reads `CLAUDE.md`, OpenAI Codex-based tools read `AGENTS.md`. **Always edit `AGENTS.md` directly**; `CLAUDE.md` reflects all changes automatically via the symlink.

## Context for AI Agents
- Match existing code style
- Do not refactor unrelated code in the same PR
- Write tests for new functionality
- Keep PRs focused and atomic
