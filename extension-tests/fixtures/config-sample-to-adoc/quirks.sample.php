<?php
/**
 * Quirk fixture: every case here was checked against the retired PHP converter.
 */
$CONFIG = [

/**
 * Section & "heading" <with> 'chars'
 */

/**
 * Heading one.
 *
 * Paragraph with `backticks`, ``double ticks``, 50% done, {} braces, a tab	here
 * and a link https://example.com/a?b=1&c=2#d[text].
 *
 * keyname::
 * description
 *
 * - flush list
 * - second item
 *
 * NOTE: and a wrapped e-mail
 * e-mail address and x-ray
 *
 * .. warning::
 *    careful now
 *
 * @param string $ignored
 * dropped by the tag split
 */
'one' => 'value',

/**
 * Heading without period
 * second line swallowed
 *
 * Body text.
 */
'two' => [
    'a' => 1, // trailing
    'b' => "multi
    line",
],

/**
 * Inline comment in code drops the sample.
 */
'three' => 'x', /* note */

/**
 * Heading with ellipsis... mid line. Rest
 *
 * Indented body:
 *     four spaces kept
 *   two spaces
 */
'four' => 'y',

/**
 * @tag first line is a tag
 */
'five' => 'z',

/**
 * Unicode — ümlaut “quotes” heading.
 *
 * Body with ünïcode.
 */
'six' => 'ü',

/**
 * Code containing a docblock marker.
 */
'seven' => '/** not a section */',

];
