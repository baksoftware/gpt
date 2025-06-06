import './App.css'
import { useState } from 'react'
import { LLMService } from './services/llmService'
import MindMap from './components/MindMap'
import { useMindMapData } from './contexts/MindMapContext'

function App() {
  const [inputText, setInputText] = useState('Rational thinking');
  const { setMindMapData, loading, setLoading, mindMapData } = useMindMapData();

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    
    try {
      // Clear existing mindmap
      setMindMapData({
        id: 'root',
        name: inputText,
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
      flexDirection: 'column',
      overflow: 'hidden'
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
          placeholder="Enter the topic you want to explore"
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
          {loading ? 'Generating...' : 'Explore'}
        </button>
      </div>
      <div style={{ 
        flex: 1,
        overflow: 'hidden'
      }}>
        <MindMap data={mindMapData} />
      </div>
    </div>
  );
}

export default App;
