import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { app } from './bootstrap/start.ts'
import { App } from './ui/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App {...app} />
  </StrictMode>,
)
