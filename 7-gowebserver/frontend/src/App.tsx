import './App.css'
import TaskList from './components/TaskList'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Task Manager</h1>
        <p>A Go + React Full Stack Application</p>
      </header>
      
      <main className="app-main">
        <TaskList />
      </main>
      
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Task Manager App</p>
      </footer>
    </div>
  )
}

export default App
