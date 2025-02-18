import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { MindMapProvider } from './contexts/MindMapContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MindMapProvider>
      <App />
    </MindMapProvider>
  </React.StrictMode>,
)
