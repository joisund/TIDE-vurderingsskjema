import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { testDrivePath } from './content/test-drive-api.ts'

const root = createRoot(document.getElementById('root')!)
if ([testDrivePath, testDrivePath.slice(0, -1)].includes(window.location.pathname)) {
  document.title = 'Testkjøring · Tide'
  void import('./ui/TestDriveApp.tsx').then(({ TestDriveApp }) => root.render(<StrictMode><TestDriveApp /></StrictMode>))
} else {
  void Promise.all([import('./bootstrap/start.ts'), import('./ui/App.tsx')]).then(([{ app }, { App }]) => {
    root.render(<StrictMode><App {...app} /></StrictMode>)
  })
}
