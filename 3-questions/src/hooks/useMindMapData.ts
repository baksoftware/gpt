import { useState } from 'react';
import { MindMapNode } from '../types/mindmap';

export function useMindMapData() {
  const [mindMapData, setMindMapData] = useState<MindMapNode>({
    id: 'root',
    name: 'Start here',
    children: []
  });
  const [loading, setLoading] = useState(false);

  return { mindMapData, setMindMapData, loading, setLoading };
} 