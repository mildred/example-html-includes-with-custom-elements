document.addEventListener('load', (e) => {
  for(let link of document.querySelectorAll('a.email-link[data-local-part][data-domain]')) {
    let address = `${link.dataset.localPart}@${link.dataset.domain}`
    let urlEncodedAddress = ''
    for(let i = 0; i < address.length; i++) {
      let code = address.charCodeAt(i).toString(16).toUpperCase().padStart(2, '0')
      urlEncodedAddress += "%" + code
    }
    link.href = `mailto:${urlEncodedAddress}`
  }
})
