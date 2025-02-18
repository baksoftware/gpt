import { useState, useEffect } from 'react';
import { MindMapNode } from '../types/mindmap';

export const useMindMapData = (dataUrl: string) => {
  const [data, setData] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(dataUrl)
      .then(response => response.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [dataUrl]);

  return {
    data,
    loading,
    error,
    setMindMapData: setData
  };
}; 