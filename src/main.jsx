import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Replace Arabic-Indic and Extended Arabic-Indic numerals with Latin equivalents
function arabicToLatin(text) {
  return text
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
}

function convertTextNodes(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const converted = arabicToLatin(node.textContent)
    if (converted !== node.textContent) node.textContent = converted
  } else {
    node.childNodes.forEach(convertTextNodes)
  }
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(convertTextNodes)
    if (m.type === 'characterData') {
      const converted = arabicToLatin(m.target.textContent)
      if (converted !== m.target.textContent) m.target.textContent = converted
    }
  })
})

observer.observe(document.body, { childList: true, subtree: true, characterData: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
