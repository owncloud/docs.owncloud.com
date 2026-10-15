# content/ocis

Agent guidelines specific to the oCIS component (developer service pages, Collector and Swagger UI). Applies to every oCIS version directory. Loaded on demand; repo-wide rules live in the root `AGENTS.md`, content-authoring rules in `content/AGENTS.md`.

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
