(() => {
  let parser = new DOMParser()

  let globalSheets = null;

  function getGlobalStyleSheets() {
    if (globalSheets === null) {
      globalSheets = Array.from(document.styleSheets)
        .map(x => {
          const sheet = new CSSStyleSheet();
          const css = Array.from(x.cssRules).map(rule => rule.cssText).join(' ');
          sheet.replaceSync(css);
          return sheet;
        });
    }

    return globalSheets;
  }

  /*
    defining the <load-file> Web Component,
    yes! the documenation is longer than the code
    License: https://unlicense.org/
  */
  customElements.define("load-file", class extends HTMLElement {

    // declare default connectedCallback as async so await can be used
    async connectedCallback(
      // call connectedCallback with parameter to *replace* SVG (of <load-file> persists)
      src = this.getAttribute("src"),
    ) {
      // attach a shadowRoot if none exists (prevents displaying error when moving Nodes)
      let shadowRoot = this.shadowRoot || this.attachShadow({ mode: "open" })

      document.loadFileCssRoots ||= []

      // load SVG file from src="" async, parse to text, add to shadowRoot.innerHTML
      let resp = await fetch(src)
      let html = await resp.text()
      let base = resp.url
      let doc = parseHTML(html, resp.headers.get('content-type'), base)
      shadowRoot.innerHTML = doc.body.innerHTML
      shadowRoot.insertBefore(document.createComment(`load-file src="${base}"`), shadowRoot.firstChild)

      // Run scripts
      for(let script of shadowRoot.querySelectorAll('script')) {
        // let newScript = script.cloneNode()
        let before = script.nextSibling
        let parent = script.parentElement ?? shadowRoot
        script.remove()
        let newScript = document.createElement('script');
        newScript.textContent = script.textContent
        window.currentScript = newScript
        parent.insertBefore(newScript, before)
        window.currentScript = null
      }

      // append optional <tag [shadow-root]> Elements from <load-svg> innerHTML/lightDOM after parsed <svg>
      shadowRoot.append(...this.querySelectorAll("[shadow-root]"))

      // if "replaceWith" attribute exists
      // then replace <load-svg> with loaded content <load-svg>
      // childNodes instead of children to include #textNodes also
      if (this.hasAttribute("replace-with")) {
        this.replaceWith(...shadowRoot.childNodes)
      }

      if (this.hasAttribute("layout")) {
        //this.outerHTML = `<template shadowrootmode="open">${shadowRoot.innerHTML}</template>`
        let frag = new DocumentFragment()
        frag.append(...doc.head.childNodes)
        document.loadFileCssRoots.forEach(root => addCssToRoot(frag, root))
        this.ownerDocument.head.append(frag)
      }

      if (!(this.getAttribute("isolate") ?? "").split(/\W+/).includes("css")) {
        document.loadFileCssRoots.push(shadowRoot)
        // shadowRoot.adoptedStyleSheets.push(
        //   ...getGlobalStyleSheets()
        // );
        addCssToRoot(document.head, shadowRoot)
      }

      this.dispatchEvent(new Event('load', {bubbles: true, composed: true}))
    }
  })

  addEventListener('load', (e) => {
    insertLayouts()
    insertTemplateSrc()

    async function insertTemplateSrc() {
      let templates = Array.from(document.querySelectorAll('template[src]'), (template => ({
        template,
        src: template.getAttribute('src'),
        req: fetch(template.getAttribute('src'))
      })))
      for (let { template, req } of templates) {
        let resp = await req;
        let html = await resp.text()
        template.innerHTML = html
        relativeURLs(template.content, req.url)
      }
    }

    async function insertLayouts() {
      let layouts = Array.from(document.querySelectorAll('link[rel=layout]'),
        (layout) => ({
          href: layout.href,
          base: layout.getAttribute('href'),
          req: fetch(layout.href)
        }))
      for (let { href, base, req } of layouts) {
        let resp = await req;
        let html = await resp.text()
        let doc = parseHTML(html, resp.headers.get('content-type'), href)

        document.head.append(...doc.head.childNodes)

        let body = new DocumentFragment()
        body.append(...document.body.childNodes)
        let slot = doc.body.querySelector('slot')
        if (slot) {
          slot.parentElement.replaceChild(body, slot)
        } else {
          doc.body.append(body)
        }
        document.body.append(...doc.body.childNodes)
      }
    }
  }, { "once": true })

  function parseHTML(html, content_type, base) {
    let doc = parser.parseFromString(html, content_type.replace(/; *charset=.*/, ''))
    relativeURLs(doc, base)
    return doc
  }

  function relativeURLs(node, base) {
    for (let n of node.querySelectorAll('[src]')) {
      relativeURL(n, 'src', base)
    }
    for (let n of node.querySelectorAll('[href]')) {
      relativeURL(n, 'href', base)
    }
  }

  function relativeURL(node, attrname, base) {
    let raw = node.getAttribute(attrname)
    let url = URL.parse(raw, base)
    // console.log("transform URL from %s to %o using %s", raw, url?.toString(), base)
    node.setAttribute(attrname, url?.toString())
  }

  function addCssToRoot(node, shadowRoot) {
    let before = shadowRoot.insertBefore(document.createComment("imported global stylesheets"), shadowRoot.firstChild)
    for (let sheet of node.querySelectorAll('link[rel=stylesheet]')) {
      before = shadowRoot.insertBefore(sheet.cloneNode(), before.nextSibling)
    }
  }

})()
