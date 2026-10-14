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

### Links That Cannot Be Converted

Do **not** convert `doc.owncloud.com` URLs that appear inside any of the following contexts — AsciiDoc does not process macros inside verbatim or code regions:

- **Literal / source blocks** (`----` or `[source,...]` delimited blocks) — the URL is rendered as plain text and is intentional (e.g. a checklist template or a config comment).
- **`.env` / config file code blocks** — comment lines starting with `#` that reference documentation are part of the embedded file content; they cannot contain xref macros.
- **Diagram blocks** (e.g. Mermaid `@startdiagram`) — participant link metadata is processed by the diagram renderer, not by Asciidoctor.
- **Base URLs with no page path** (e.g. `https://doc.owncloud.com/ocis/`) — there is no target page to map to an xref.

When presenting a table of convertible links, mark these rows as `NOT CONVERTIBLE` and state the reason (e.g. "in source block", "in Mermaid diagram").

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

## Developer Service Pages

The oCIS developer module (`content/ocis/<version>/modules/developer/`) has a specific structure and content rule for service pages.

### File Naming and Location

Service pages live at `pages/services/s-list/<service>/<service>.adoc` — the filename matches the service name, **not** `index.adoc`. This aligns with the admin module naming convention.

### Content Separation Rule

Developer service pages must **not** duplicate admin content. The admin documentation is authoritative for service descriptions, configuration, and administration. A developer page contains:

1. The mandatory partial sequence (see below) — always present.
2. A `== Developer Readme` section — always present, links to the upstream README.
3. A `== Developer Topics` section — **only** when there is genuine developer-specific content (e.g. API details, code-level configuration, CLI internals). Omit the section entirely if there is nothing to add.

### Mandatory Partial Sequence

Every service page must open with these three includes in order, after setting `service_name`:

```asciidoc
= <Service Title>
:toc: right
:description: ...

:service_name: <service-folder-name>

// compute required links as attributes
include::partial$services/compute-links.adoc[]

include::partial$services/admin-tip.adoc[]

== Developer Readme

// add a predefined text that uses the computed links
include::partial$services/readme-link-text.adoc[]
```

### Service Partials

All three live in `developer/partials/services/`:

- **`compute-links.adoc`** — computes `{git-service-root}` (link to source on GitHub) and `{service-path-to-admin}` (xref to the admin page). Requires `service_name` to be set **before** this include.
- **`admin-tip.adoc`** — block TIP admonition pointing to the admin docs. Requires `{service-path-to-admin}` (set by `compute-links.adoc`).
- **`readme-link-text.adoc`** — standard prose linking to the upstream README and back to the admin docs. Requires both `{git-service-root}` and `{service-path-to-admin}`.

### Key Antora Attributes for Services

Defined in `content/ocis/<version>/antora.yml`:

| Attribute | Value | Use |
|---|---|---|
| `{s-path}` | `deployment/services/s-list` | Path segment for admin service pages |
| `{dev-s-path}` | `services/s-list` | Path segment for developer service pages |
| `{dev_ocis_services_path}` | `/services/` | Git path segment used in `compute-links.adoc` |

Use `{s-path}` in xrefs to admin service pages: `xref:admin:{s-path}/<service>.adoc[...]`.
Use `{dev-s-path}` in xrefs to developer service pages: `xref:developer:{dev-s-path}/<service>/<service>.adoc[...]`.

## Antora Collector and Swagger UI Extensions

Two additional Antora extensions are installed and configured in this repo:

| Package | License | Purpose |
|---|---|---|
| `@antora/collector-extension` | Apache 2.0 | Fetches remote files into the content catalog at build time |
| `@opendevise/antora-swagger-ui-extension` | MPL-2.0 | Renders an OpenAPI spec as an interactive Swagger UI page |

The MPL-2.0 license for `@opendevise/antora-swagger-ui-extension` was explicitly approved via discussion with Dan Allen (Antora maintainer) before introduction.

### Collector Configuration

The Collector is configured **per component** in `antora.yml` under the `ext.collector` key — not in `site.yml`. `site.yml` only registers the extension (`'@antora/collector-extension'`).

The Collector shell runs from the **repository root** (not the component directory).

Multiple entries are supported under `ext.collector` as a YAML list.

### Collector Fetch Pattern

All Collector fetch commands use a **SHA-check + cache-with-fallback** pattern:

1. `git ls-remote` fetches only the remote ref metadata (no data download) to get the current SHA.
2. If the SHA matches the cached SHA **and** the cache file exists → skip the download entirely.
3. Otherwise, download using the **commit-SHA URL** (not the branch URL) to bypass GitHub's CDN cache, which can serve stale content for a long time after a push.
4. Validate the download before accepting it (non-empty for single files; check for expected path for tarballs).
5. Only update the cache and SHA file if validation passes.
6. If `git ls-remote` fails (no network) and cache exists → use cache. If no cache → download with branch URL as fallback.

```yaml
ext:
  collector:
  - run:
      command: |
        mkdir -p .cache/<name> build/<name>
        CACHE=".cache/<name>/<file>"
        SHA_FILE=".cache/<name>/main.sha"
        REMOTE_SHA=$(git ls-remote https://github.com/<org>/<repo> refs/heads/main 2>/dev/null | awk '{print $1}')
        CACHED_SHA=$(cat "$SHA_FILE" 2>/dev/null || echo "")
        if ([ -n "$REMOTE_SHA" ] && [ "$REMOTE_SHA" != "$CACHED_SHA" ]) || [ ! -f "$CACHE" ]; then
          [ -n "$REMOTE_SHA" ] \
            && URL="https://github.com/<org>/<repo>/archive/${REMOTE_SHA}.tar.gz" \
            || URL="https://github.com/<org>/<repo>/archive/refs/heads/main.tar.gz"
          if curl -sLf "$URL" -o "${CACHE}.new" 2>/dev/null && [ -s "${CACHE}.new" ]; then
            mv "${CACHE}.new" "$CACHE"
            [ -n "$REMOTE_SHA" ] && echo "$REMOTE_SHA" > "$SHA_FILE"
          fi
        fi
        cp "$CACHE" build/<name>/<file>
      shell: true
    scan:
      dir: build/<name>
      into: modules/<module>/attachments
```

### GitHub Tarball Gotchas

**CDN staleness:** Branch-based tarball URLs (`/archive/refs/heads/main.tar.gz`) are served from GitHub's CDN and can remain stale long after a push. Always use the commit-SHA URL (`/archive/${REMOTE_SHA}.tar.gz`) obtained from `git ls-remote` — SHA-based URLs bypass the CDN cache.

**`export-ignore` in `.gitattributes`:** GitHub generates tarballs using `git archive` internally, which honours `export-ignore` entries in `.gitattributes`. Any folder marked `export-ignore` will be silently absent from the tarball regardless of URL or SHA. **Always check `.gitattributes` in the source repo before designing a Collector fetch.** Fix: remove `export-ignore` from any folder that the Collector needs to fetch (see `owncloud/ocis-php-sdk` PR #322 as an example).

### Attachment Directory Structure

`scan.dir` sets the root of what gets scanned into the target family. Files are placed at `attachment$<relative-path-within-scan-dir>`.

- **Single file** (`libre-graph`): `scan.dir: build/libre-graph` → `attachment$v1.0.yaml`
- **Multi-file tree** (`ocis-php-sdk`): `scan.dir: build/ocis-php-sdk` with files at `build/ocis-php-sdk/ocis-php-sdk-docs/index.html` → `attachment$ocis-php-sdk-docs/index.html`

For a multi-file tree from a repo tarball, the top-level directory name changes with each commit SHA. Detect it dynamically:

```bash
TOP=$(tar -tzf "$CACHE" 2>/dev/null | head -1 | cut -d/ -f1)
tar -xzf "$CACHE" --strip-components=2 -C build/<name>/<subdir> "${TOP}/<subfolder>"
```

Validate before accepting:
```bash
tar -tzf "${CACHE}.new" 2>/dev/null | grep -q "^${TOP}/<subfolder>/"
```

### Swagger UI Macro

Once a YAML file is in the `attachments` family, render it with:

```asciidoc
swagger-ui::attachment$<filename>.yaml[]
```

The extension injects the Swagger UI CSS/JS and generates a spec-loader script automatically. No other configuration is needed on the page.

### Embedding a Multi-File HTML Site (phpDocumentor)

When the fetched content is a self-contained HTML site (e.g. phpDocumentor output), it cannot be imported as Antora pages. Place the whole tree in `attachments` — internal relative links within the HTML continue to work because all files maintain their relative directory structure.

Embed on an AsciiDoc page using a `++++` passthrough block with an iframe. Set `src="about:blank"` and resolve the URL at runtime via JavaScript to avoid hardcoding the Antora published path (which includes component, version, and module segments):

```asciidoc
++++
<iframe id="my-frame" src="about:blank" style="width:100%;border:none;min-height:300px;" title="...">
</iframe>
<script>
  (function () {
    var path = window.location.pathname;
    var moduleBase = path.substring(0, path.indexOf('/<known-path-segment>/'));
    var frame = document.getElementById('my-frame');
    frame.src = moduleBase + '/_attachments/<attachment-subdir>/index.html';
    frame.onload = function () {
      try {
        this.style.height = this.contentWindow.document.documentElement.scrollHeight + 'px';
      } catch (e) {}
    };
  })();
</script>
++++
```

- The `onload` handler dynamically resizes the iframe height by reading `scrollHeight` from the loaded document — requires same-origin (both Antora pages and their attachments are served from the same domain in production).
- The `try/catch` silently suppresses cross-origin errors in local or preview builds.
- Always add a `link:attachment$<subdir>/index.html[Open in new tab,window=_blank]` fallback above the passthrough block.

### Collector Use Cases in This Repo

| Source | Type | Attachment path | Page |
|---|---|---|---|
| `owncloud/libre-graph-api` | Single YAML | `attachment$v1.0.yaml` | `apis/http/graph/swagger-ui.adoc` |
| `owncloud/ocis-php-sdk` | phpDocumentor HTML tree | `attachment$ocis-php-sdk-docs/...` | `clients/ocis-php-sdk/ocis-php-sdk-docs.adoc` |

Both Collector configs live in `content/ocis/9.0/antora.yml` under `ext.collector`.

## File Relationship: CLAUDE.md and AGENTS.md

`CLAUDE.md` is a symlink to this file (`AGENTS.md`). Both names are provided so that different AI tools find their expected filename — Claude Code reads `CLAUDE.md`, OpenAI Codex-based tools read `AGENTS.md`. **Always edit `AGENTS.md` directly**; `CLAUDE.md` reflects all changes automatically via the symlink.

## Context for AI Agents
- Match existing code style
- Do not refactor unrelated code in the same PR
- Write tests for new functionality
- Keep PRs focused and atomic
