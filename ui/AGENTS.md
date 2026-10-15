# ui

Agent guidelines for the UI layer (`supplemental/llms.txt`, supplemental JS/CSS). Loaded on demand; repo-wide rules live in the root `AGENTS.md`.

## LLM Discovery File (`llms.txt`)

`ui/supplemental/llms.txt` is served at `https://doc.owncloud.com/llms.txt` and follows the [llmstxt.org](https://llmstxt.org/) convention for AI-readable site indexes. It lists one URL per documentation section. **CI validates every URL in this file; an unresolvable URL is a build error.**

### Maintenance rules

- **Adding a module** to any Antora component → add a corresponding entry to `llms.txt`.
- **Removing a module** from any component → remove its entry from `llms.txt`.
- **Adding a new component** (new product) → add a new section with the component's index URL.

### Version resolution at build time

`antora-extensions/llms-txt.js` runs at `sitePublished` and rewrites every `/<component>/latest/` segment in the generated `public/llms.txt` with the component's actual GA version number (the same version `latest-alias.js` mirrors). This means:

- The template in `ui/supplemental/llms.txt` uses `latest` for all entries and is human-readable.
- The published file always contains real version numbers that CI can validate against `public/`.
- When the GA version rolls forward (e.g. 9.0 ships), the file updates automatically on the next build.

### Prerelease-only modules

If a module exists **only** in a prerelease version (e.g. the `developer` module was introduced in 9.0 while `latest` still points to 8.2), `latest` cannot be used — the GA release has no such module. In this case pin the URL to the explicit prerelease version in the template:

```
https://doc.owncloud.com/ocis/9.0/developer/index.html
```

The extension leaves explicit version numbers untouched — it only resolves `latest` segments.

**When to switch:** once `prerelease: true` is removed from that version's `antora.yml` and `latest` moves to it, change the pinned version in the template to `latest`. The extension resolves it from that point on.

This applies to **any component** — whenever a new module is first introduced in a prerelease version, pin its template URL until GA.

### Versionless components

The `webui` component uses `version: ~` (no version segment in URLs). Its entries in `llms.txt` correctly omit the version segment, e.g. `https://doc.owncloud.com/webui/index.html`.

