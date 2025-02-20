import ReactFlow, { 
  Node, 
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useEffect } from 'react';
import { useMindMapData } from '../../contexts/MindMapContext';
import { MindMapNode } from '../../types/mindmap';

const nodeWidth = 172;
const nodeHeight = 36;

const createNodesAndEdges = (data: MindMapNode, parentPos = { x: 0, y: 0 }) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Create root node
  const rootNode: Node = {
    id: data.id,
    position: parentPos,
    data: { label: data.name },
    type: 'default',
    style: {
      background: '#fff',
      border: '1px solid #777',
      borderRadius: '4px',
      padding: '10px',
      width: nodeWidth,
      height: nodeHeight,
    },
  };
  nodes.push(rootNode);

  // Create child nodes and edges
  if (data.children) {
    const childSpacing = 100;
    const totalHeight = data.children.length * childSpacing;
    let currentY = parentPos.y - totalHeight / 2;

    data.children.forEach((child, index) => {
      const childX = parentPos.x + 250;
      const childY = currentY + (index * childSpacing);

      const childNodes = createNodesAndEdges(child, { x: childX, y: childY });
      nodes.push(...childNodes.nodes);
      edges.push(...childNodes.edges);

      edges.push({
        id: `${data.id}-${child.id}`,
        source: data.id,
        target: child.id,
        type: 'smoothstep',
        style: { stroke: '#777' },
      });

      currentY += childSpacing;
    });
  }

  return { nodes, edges };
};

export function MindMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { mindMapData } = useMindMapData();

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(mindMapData);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [mindMapData, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
} 