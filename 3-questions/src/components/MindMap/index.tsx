import { 
  Node, 
  Edge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useEffect, useCallback } from 'react';
import { useMindMapData } from '../../contexts/MindMapContext';
import { MindMapNode } from '../../types/mindmap';
import { LLMService } from '../../services/llmService';
import { Tree, RawNodeDatum } from 'react-d3-tree';

//const nodeWidth = 172;
const nodeHeight = 100;

// Function to calculate text width
const getTextWidth = (text: string) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 72; // fallback width
  context.font = '10px Arial  ';
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
      padding: '0px',
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

interface MindMapProps {
  data: MindMapNode;
}

interface CustomNodeDatum {
  name: string;
  attributes?: {
    isLastQuestion?: boolean;
    isAnswer?: boolean;
  };
  children?: CustomNodeDatum[];
}

interface RenderCustomNodeElementFnParams {
  nodeDatum: CustomNodeDatum;
  toggleNode: () => void;
}

const MindMap: React.FC<MindMapProps> = ({ data }) => {
  const [_nodes, setNodes, _onNodesChange] = useNodesState([]);
  const [_edges, setEdges, _onEdgesChange] = useEdgesState([]);
  const { mindMapData, setMindMapData } = useMindMapData();
  const llmService = new LLMService();

  const handleNodeClick = useCallback(async (nodeDatum: CustomNodeDatum) => {
    try {
      const response = await llmService.generateSubnodes(nodeDatum.name);
      
      // Update the mindmap data with new children for the clicked node
      const updateNodeWithChildren = (currentNode: MindMapNode): MindMapNode => {
        if (currentNode.name === nodeDatum.name) {
          const newChildren = response.subnodes.map((text, index) => ({
            id: `${currentNode.id}-${index}`,
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

  const nodeWidth = 300;  // Increased from whatever it was before
  
  const renderRectSvgNode = ({ nodeDatum, toggleNode }: RenderCustomNodeElementFnParams) => {
    const isLastQuestion = nodeDatum.attributes?.isLastQuestion;
    const isAnswer = nodeDatum.attributes?.isAnswer;
    
    // Determine background color based on node type
    let bgColor = '#e6f3ff'; // Default light blue
    if (isLastQuestion) {
      if (isAnswer) {
        bgColor = '#ffe6e6'; // Light red for answer
      } else {
        bgColor = '#ffe6cc'; // Light orange for follow-up questions
      }
    }

    // Split text into multiple lines if longer than 50 characters
    const words = nodeDatum.name.split(' ');
    let lines: string[] = [''];
    let currentLine = 0;

    words.forEach((word: string) => {
      if ((lines[currentLine] + ' ' + word).length <= 50) {
        lines[currentLine] = lines[currentLine] ? lines[currentLine] + ' ' + word : word;
      } else {
        currentLine++;
        lines[currentLine] = word;
      }
    });

    const lineHeight = 20;
    const rectHeight = (lines.length * lineHeight) + 20; // 20px padding

    return (
      <g>
        <rect
          width={nodeWidth}
          height={rectHeight}
          x={-nodeWidth / 2}
          y={-rectHeight / 2}
          fill={bgColor}
          rx={5}
          ry={5}
          stroke="#000"
          strokeWidth={1}  // Ensure consistent stroke width
          onClick={() => {
            toggleNode();
            handleNodeClick(nodeDatum);
          }}
          style={{ cursor: 'pointer' }}
        />
        {lines.map((line, i) => (
          <text
            key={i}
            x="0"
            y={-rectHeight / 2 + 20 + (i * lineHeight)}
            textAnchor="middle"
            style={{
              fontSize: '14px',
              fontFamily: 'Arial',
              cursor: 'pointer',
              fontWeight: 'normal',  // Ensure consistent font weight
            }}
            onClick={() => {
              toggleNode();
              handleNodeClick(nodeDatum);
            }}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  // Convert MindMapNode to RawNodeDatum
  const convertToRawNodeDatum = (node: MindMapNode): RawNodeDatum => {
    return {
      name: node.name,
      attributes: {
        isLastQuestion: node.attributes?.isLastQuestion || false,
        isAnswer: node.attributes?.isAnswer || false
      },
      children: node.children?.map(convertToRawNodeDatum) || []
    };
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Tree
        data={convertToRawNodeDatum(data)}
        orientation="vertical"
        renderCustomNodeElement={renderRectSvgNode}
        separation={{ siblings: 2, nonSiblings: 2 }}
        translate={{ x: window.innerWidth / 2, y: 100 }}
        nodeSize={{ x: 250, y: 150 }}
      />
    </div>
  );
};

export default MindMap; 