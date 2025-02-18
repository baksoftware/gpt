export interface MindMapNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  children?: MindMapNode[];
  group?: number;
}

export interface MindMapLink extends d3.SimulationLinkDatum<MindMapNode> {
  source: MindMapNode;
  target: MindMapNode;
} 