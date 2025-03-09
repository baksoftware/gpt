import './App.css'
import FertilityMap from './components/FertilityMap'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>World Fertility Rates Map</h1>
      </header>
      <main>
        <FertilityMap />
      </main>
      <footer>
        <p>Data source: World Bank - Total Fertility Rate</p>
      </footer>
    </div>
  )
}

export default App
