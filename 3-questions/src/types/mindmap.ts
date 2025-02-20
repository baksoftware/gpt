
export interface MindMapNode {
  id: string;
  name: string;  // Required field
  text: string;  // Adding this since we're using it
  children?: MindMapNode[];
  group?: number;
  isNew?: boolean;
  // Add these for D3 force simulation
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}
