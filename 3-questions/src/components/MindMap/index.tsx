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
import { useEffect, useCallback } from 'react';
import { useMindMapData } from '../../contexts/MindMapContext';
import { MindMapNode } from '../../types/mindmap';
import { LLMService } from '../../services/llmService';

//const nodeWidth = 172;
const nodeHeight = 36;

// Function to calculate text width
const getTextWidth = (text: string) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 172; // fallback width
  context.font = '14px Inter, system-ui, Avenir, Helvetica, Arial, sans-serif';
  return Math.max(172, context.measureText(text).width + 40); // min width 172px, padding 20px each side
};

const createNodesAndEdges = (data: MindMapNode, parentPos = { x: 0, y: 0 }) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Create root node with dynamic width
  const nodeWidth = getTextWidth(data.name);
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
      const childX = parentPos.x + 300; // Increased spacing
      const childY = currentY + (index * childSpacing);
     // const childWidth = getTextWidth(child.name);

      const childNodes = createNodesAndEdges(child, { x: childX, y: childY });
      nodes.push(...childNodes.nodes);
      edges.push(...childNodes.edges);

      edges.push({
        id: `${data.id}-${child.id}`,
        source: data.id,
        target: child.id,
        type: 'default', // Changed to default for straight lines
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
  const { mindMapData, setMindMapData } = useMindMapData();
  const llmService = new LLMService();

  const handleNodeClick = useCallback(async (_event: React.MouseEvent, node: Node) => {
    try {
      const response = await llmService.generateSubnodes(node.data.label);
      
      // Update the mindmap data with new children for the clicked node
      const updateNodeWithChildren = (currentNode: MindMapNode): MindMapNode => {
        if (currentNode.id === node.id) {
          const newChildren = response.subnodes.map((text, index) => ({
            id: `${node.id}-${index}`,
            name: text,
            text: text,
            children: []
          }));
          return { ...currentNode, children: newChildren };
        }
        if (currentNode.children) {
          return {
            ...currentNode,
            children: currentNode.children.map(child => updateNodeWithChildren(child))
          };
        }
        return currentNode;
      };

      setMindMapData(updateNodeWithChildren(mindMapData));
    } catch (error) {
      console.error('Error generating subnodes:', error);
    }
  }, [mindMapData, setMindMapData, llmService]);

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
        onNodeClick={handleNodeClick}
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