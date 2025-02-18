import './App.css'
import ReactRulesMindmap from './examples/ReactRulesMindmap'

function App() {
  return (
    <div className="App">
      <h1>TypeScript React Rules Mindmap</h1>
      <ReactRulesMindmap 
        dataUrl="/src/data/typescript-react-rules.json"
        width={800}
        height={600}
      />
    </div>
  );
}

export default App;
