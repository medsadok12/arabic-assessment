import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import QuickTestApp from './quicktest/QuickTestApp.jsx'
import ConsultationSurvey from './components/ConsultationSurvey.jsx'
import BeginnerSkillsAssessment from './components/BeginnerSkillsAssessment.jsx'
import { isQuickTestMode } from './quicktest/quickTestMode.js'
import { isConsultationSurveyMode } from './utils/surveyMode.js'
import { isBeginnerSkillsMode } from './utils/beginnerSkillsMode.js'

function renderApp() {
  if (isQuickTestMode()) return <QuickTestApp />;
  if (isConsultationSurveyMode()) return <ConsultationSurvey />;
  if (isBeginnerSkillsMode()) return <BeginnerSkillsAssessment />;
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {renderApp()}
  </StrictMode>,
)
