import * as d3 from 'd3';

export interface MindMapNode extends d3.SimulationNodeDatum {
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

export interface MindMapLink extends d3.SimulationLinkDatum<MindMapNode> {
  source: MindMapNode;
  target: MindMapNode;
} 