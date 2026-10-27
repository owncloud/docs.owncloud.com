'use strict'

/**
 * Generate the per-component version lists for the site landing page
 * (content/main/modules/ROOT/pages/index.adoc) at build time.
 *
 * The landing page includes one generated partial per multi-version component:
 *
 *   include::partial$generated-versions-<component>.adoc[]
 *
 * This extension adds those partials to the content catalog at contentClassified
 * (i.e. before documents are converted, so the includes resolve). Each partial
 * is an unordered list with one item per version, newest first:
 *
 *   * xref:<version>@<component>:ROOT:index.adoc[<display version>]
 *
 * The lists are derived from the catalog itself, so they update automatically
 * when a version folder is added to site.yml, when a display_version changes,
 * or when a prerelease graduates to GA. Version-less components (ROOT, webui)
 * get no partial; their product entries link straight to the start page.
 *
 * Maintenance: when adding a new multi-version component to site.yml, add the
 * matching include line to index.adoc.
 */

module.exports.register = function () {
  this.once('contentClassified', ({ contentCatalog }) => {
    const logger = this.getLogger('landing-versions')
    // The landing page lives in the version-less ROOT component; reuse its src
    // coordinates so the generated partials resolve in the same component.
    const landingPage = contentCatalog
      .findBy({ component: 'ROOT', family: 'page' })
      .find((page) => page.src.module === 'ROOT' && page.src.relative === 'index.adoc')
    if (!landingPage) {
      logger.warn('landing page not found in the content catalog -- version lists not generated')
      return
    }
    let generated = 0
    contentCatalog.getComponents().forEach((component) => {
      if (!component.versions || component.versions.length === 0) return // version-less component
      const versions = component.versions.slice().sort((a, b) => compareVersions(b.version, a.version))
      const lines = versions.map((version) => {
        const label = version.displayVersion || version.version
        return `* xref:${version.version}@${component.name}:ROOT:index.adoc[${label}]`
      })
      contentCatalog.addFile({
        src: {
          component: landingPage.src.component,
          version: landingPage.src.version,
          module: 'ROOT',
          family: 'partial',
          relative: `generated-versions-${component.name}.adoc`,
        },
        contents: lines.join('\n') + '\n',
      })
      generated += 1
      logger.info(
        `generated version list for ${component.name}: ` +
          versions.map((it) => it.displayVersion || it.version).join(', ')
      )
    })
    logger.info(`generated ${generated} version list partials for the landing page`)
  })
}

// Numeric, segment-wise compare ('10.16' > '10.9', not the string order).
function compareVersions (a, b) {
  const as = String(a).split('.').map(Number)
  const bs = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const diff = (as[i] || 0) - (bs[i] || 0)
    if (diff) return diff
  }
  return 0
}
