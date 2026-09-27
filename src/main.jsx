import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import QuickTestApp from './quicktest/QuickTestApp.jsx'
import { isQuickTestMode } from './quicktest/quickTestMode.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isQuickTestMode() ? <QuickTestApp /> : <App />}
  </StrictMode>,
)
