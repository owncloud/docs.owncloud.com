'use strict'

/**
 * Set the AsciiDoc attribute `page-component-version-is-prerelease` on every page
 * of a component version that is marked `prerelease` in its antora.yml.
 *
 * Antora derives `page-component-version-is-latest` from the content catalog but
 * has no counterpart for the prerelease flag (see computePageAttrs() in
 * @antora/asciidoc-loader/lib/load-asciidoc.js), so content cannot ask "am I the
 * dev line?" without hard-coding the version number -- which then rots at every
 * version rollover. This extension closes that gap by reading the flag off the
 * component version object in the content catalog, the same source Antora itself
 * uses for `latest`, and exposing it to pages, partials and nav files:
 *
 *   ifdef::page-component-version-is-prerelease[]
 *   This documents a version that is still in development.
 *   endif::[]
 *
 * The attribute is also visible to the UI templates as
 * `page.attributes.[component-version-is-prerelease]` (the page composer drops the
 * `page-` prefix when it builds the UI model).
 *
 * Value semantics follow Antora's `page-component-version-is-latest`: the
 * attribute is set to the empty string when the version is a prerelease and is
 * absent otherwise -- it is a flag for ifdef/ifndef, not a label. Use
 * `page-component-display-version` for the visible marker (`8.3 (dev)` here).
 *
 * Because the attribute is derived, it is authoritative: if an antora.yml sets it
 * by hand on a version that is NOT a prerelease, the value is dropped and a
 * warning logged, so a stale hand-written flag cannot outlive the release it was
 * added for.
 */
const ATTRIBUTE = 'page-component-version-is-prerelease'

module.exports.register = function () {
  const logger = this.getLogger('prerelease-attribute-extension')

  this.once('contentClassified', ({ contentCatalog, siteAsciiDocConfig }) => {
    contentCatalog.getComponents().forEach((component) => {
      component.versions.forEach((componentVersion) => {
        // NOTE when a component descriptor defines no AsciiDoc attributes of its
        // own, componentVersion.asciidoc IS the shared siteAsciiDocConfig object
        // (classify-content.js returns it unchanged). Never mutate it in place --
        // that would leak this component version's flag into every other one.
        const asciidoc = componentVersion.asciidoc || siteAsciiDocConfig || {}
        const isPrerelease = !!componentVersion.prerelease
        if (!isPrerelease && !(asciidoc.attributes && ATTRIBUTE in asciidoc.attributes)) return
        const attributes = Object.assign({}, asciidoc.attributes)
        if (isPrerelease) {
          attributes[ATTRIBUTE] = ''
        } else {
          delete attributes[ATTRIBUTE]
          logger.warn(
            'Removed hand-set %s from %s@%s: the version is not marked prerelease in its antora.yml.',
            ATTRIBUTE,
            componentVersion.version || '~',
            componentVersion.name
          )
        }
        componentVersion.asciidoc = Object.assign({}, asciidoc, { attributes })
      })
    })
  })
}
