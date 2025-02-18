import './App.css'
import ReactRulesMindmap from './examples/ReactRulesMindmap'

function App() {
  return (
    <div className="App">
      <h1>TypeScript React Rules Mindmap</h1>
      <ReactRulesMindmap 
        dataUrl="/src/data/data.json"
        width={800}
        height={600}
      />
    </div>
  );
}

export default App;
