import { createContext, useContext, useState, useCallback } from 'react';
import { MindMapNode } from '../types/mindmap';

interface MindMapContextType {
  mindMapData: MindMapNode;
  setMindMapData: (data: MindMapNode) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const MindMapContext = createContext<MindMapContextType | undefined>(undefined);

export const MindMapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mindMapData, setMindMapData] = useState<MindMapNode>({
    id: 'root',
    name: 'Start here',
    children: []
  });
  const [loading, setLoading] = useState(false);

  const processNode = (node: MindMapNode, isLastQuestion = false, isAnswer = false): MindMapNode => {
    return {
      id: node.id,
      name: node.name,
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

  useCallback((nodeId: string, newData: Partial<MindMapNode>) => {
    setMindMapData(prev => ({
      ...prev,
      children: prev.children?.map(node => 
        node.id === nodeId ? { ...node, ...newData } : node
      )
    }));
  }, []);

  return (
    <MindMapContext.Provider value={{ mindMapData, setMindMapData, loading, setLoading }}>
      {children}
    </MindMapContext.Provider>
  );
};

export function useMindMapData() {
  const context = useContext(MindMapContext);
  if (!context) {
    throw new Error('useMindMapData must be used within a MindMapProvider');
  }
  return context;
} 