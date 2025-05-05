Example of HTML includes with Custom Elements
=============================================

Based on a real website: https://amc.melanie-de-la-salette.fr/

To test it locally, run:

    python -m http.server

A simple [polyfill.js](polyfill.js) is used to implement tha `<load-file/>`
custom element that allows for includes. It it was not for this file, it would
be possible to create powerful websites without javascript at all.

This is based and improved from the simple `<load-file/>` webcomponent described
at https://dev.to/dannyengelman/load-file-web-component-add-external-content-to-the-dom-1nd

The `<load-file/>` custom element
---------------------------------

Usage:

    <load-file [replace-with] [layout] [src="..."] [isolate=" [css] "]>

      [ <any-element shadow-root/> ]

      [ <any-element slot="..."/> ]

    </load-file>

### Nominal mode

The load-file element will fetch the file referenced by the src attribute, parse
the HTML document (with full head/body split like any HTML5 document), adjust
relative URIs to reference the resources relative to where the loaded document
is located, and add an open mode shadow DOM root using the fetched document
body.

Any element appearing below the `load-file` that has a `shadow-root` attribute
defined is moved to the shadow tree at the end.

Unless css isolation is specified, the stylesheets of the current page are added
to the shadow DOM to allow global styles to affect the included markup.

The shadow DOM slots can be used, any elements below `load-file` that defines a
slot name can be used by the shadow DOM tree using `<slot/>` elements.

### Replace mode

When `replace-with` is specified, it does not create a shadow DOM tree but
replaces the `load-file` element by the loaded DOM (the body)

### Layout mode

When the `layout` attribute is specified, the loaded file page head is also
used. The layout head is appended to the document head.

In layout mode, documents loaded before that are not CSS isolated will have
their CSS included as part of the layout.

### Full Algorithm

  - it fetches the document referenced by `src`
  - it parses a HTML document (using `DOMParser`) and convert all `src` and
    `href` attribute to relative URLs
  - it attaches the parsed document body as open shadow root to the
    `<load-file/>` custom element
  - it execute any `<script/>` tag by removing it and inserting it again from
    the shadow DOM
  - any element that has a `shadow-root` attribute id moved to the shadow DOM.
    (I'm not using it, it's from the original component)
  - if the `load-file` contains `replace-with`, no shadow DOM is used and the
    custom element is replaced by the loaded DOM.
    (I'm not using it, it's from the original component)
  - if the `load-file` contains `layout`:
      - the `<head/>` part of the document that was loaded is added to the
        current page head.
      - if there was some files loaded before that did not specify `css` in the
        wordlist of the `isolate` attribute, CSS from those files will be
        included in the page head too (between existing head markup and after
        the current loaded file head).
  - if `css` was not specified in the wordlist of the `isolate` attribute, then
    the CSS stylesheets (`link[rel=stylesheet]`) are added to the shadow DOM
  - a `load` event is dispatched.

Implementation of template source
---------------------------------

Usage:

    <template src="..."></template>

After the page load, it will  look up once any `template[src]` element, load the
referenced file and set it as page content after adjusting relative URIs.

Implementation of layouts
-------------------------

Usage:

    <link rel="layout" href="..." />

After the page load, once, it will look up all link layout tags as above, fetch
the referenced HTML document, parse it and adjust relative URIs, append the
fetched document head to the current document head, and replace the curent
document body by the fetched document body.

If the fetched document body (the layout) contains a `<slot/>` element, the
first slot element is replaced by the current document body before it replaces
it. Else, the two document bodies are merged so that the layout comes first.
