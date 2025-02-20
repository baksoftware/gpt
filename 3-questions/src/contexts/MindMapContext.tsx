import { createContext, useContext, useState } from 'react';
import { MindMapNode } from '../types/mindmap';

interface MindMapContextType {
  mindMapData: MindMapNode;
  setMindMapData: (data: MindMapNode) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const MindMapContext = createContext<MindMapContextType | undefined>(undefined);

export function MindMapProvider({ children }: { children: React.ReactNode }) {
  const [mindMapData, setMindMapData] = useState<MindMapNode>({
    id: 'root',
    name: 'Start here',
    text: 'Enter text and click Generate',
    children: []
  });
  const [loading, setLoading] = useState(false);

  const processNode = (node: MindMapNode, isLastQuestion = false, isAnswer = false): MindMapNode => {
    return {
      id: node.id,
      name: node.text || node.name,
      text: node.text || node.name,
      attributes: {
        isLastQuestion,
        isAnswer,
      },
      children: node.children?.map((child, index) => 
        processNode(
          child,
          isLastQuestion || (node.children && index === node.children.length - 1),
          isLastQuestion && index === 0
        )
      ) || []
    };
  };

  return (
    <MindMapContext.Provider value={{ mindMapData, setMindMapData, loading, setLoading }}>
      {children}
    </MindMapContext.Provider>
  );
}

export function useMindMapData() {
  const context = useContext(MindMapContext);
  if (!context) {
    throw new Error('useMindMapData must be used within a MindMapProvider');
  }
  return context;
} 