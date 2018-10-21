Array.from(document.querySelectorAll('h1, h2, h3')).forEach(function (el) {
  if (!el.id) return
  var a = document.createElement('a')
  a.href = '#' + el.id
  a.textContent = el.textContent
  while (el.firstChild) el.removeChild(el.firstChild)
  el.appendChild(a)
})
