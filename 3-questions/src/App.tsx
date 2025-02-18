import './App.css'
import { useState } from 'react'
import { useMindMapData } from './contexts/MindMapContext'
import { LLMService } from './services/llmService'
import MindMap from './components/MindMap'

function App() {
  const [inputText, setInputText] = useState('');
  const { mindMapData, setMindMapData, loading, setLoading } = useMindMapData();

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    
    try {
      // Clear existing mindmap
      setMindMapData({
        id: 'root',
        name: inputText,
        text: inputText,
        children: []
      });

      // Trigger LLM calculation with new root text
      const llmService = new LLMService();
      const response = await llmService.generateSubnodes(inputText);
      const newChildren = response.subnodes.map((text, index) => ({
        id: `${inputText}-${index}`,
        name: text,
        text: text,
        children: []
      }));
      
      setMindMapData({
        id: 'root',
        name: inputText,
        text: inputText,
        children: newChildren
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <div style={{ 
        padding: '1rem', 
        display: 'flex', 
        gap: '1rem',
        background: '#f5f5f5'
      }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter root node text..."
          style={{
            padding: '0.5rem',
            flex: 1,
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <button 
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            background: '#007bff',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Generating...' : 'Generate Mindmap'}
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <MindMap data={mindMapData} />
      </div>
    </div>
  );
}

export default App;
