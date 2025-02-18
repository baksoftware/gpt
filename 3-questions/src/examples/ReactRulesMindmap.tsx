import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode, MindMapLink } from '../types/mindmap';
import { llmService } from '../services/llmService';

interface ReactRulesMindmapProps {
  dataUrl?: string;
  width: number;
  height: number;
  data?: MindMapNode;
}

export default function ReactRulesMindmap({ data, width, height }: ReactRulesMindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mindMapData, setMindMapData] = useState<MindMapNode | null>(null);
  const [loading ] = useState(false);
  const [lastClickedNodeId, setLastClickedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setMindMapData(data);
    }
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !mindMapData) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Convert hierarchical data to nodes and links
    const nodes: MindMapNode[] = [];
    const links: MindMapLink[] = [];

    function flattenNodes(node: MindMapNode) {
      nodes.push(node);
      if (node.children) {
        node.children.forEach(child => {
          links.push({ source: node, target: child });
          flattenNodes(child);
        });
      }
    }

    flattenNodes(mindMapData);

    // Create a force simulation
    const simulation = d3.forceSimulation<MindMapNode>(nodes)
      .force("link", d3.forceLink<MindMapNode, MindMapLink>(links)
        .id(d => d.id)
        .distance(link => {
          if (!lastClickedNodeId) return 100;
          
          // Calculate distance from last clicked node
          const getDistanceFromNode = (nodeId: string, targetId: string, depth = 0): number | null => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return null;
            if (node.id === targetId) return depth;
            
            if (node.children) {
              for (const child of node.children) {
                const childDistance = getDistanceFromNode(child.id, targetId, depth + 1);
                if (childDistance !== null) return childDistance;
              }
            }
            return null;
          };

          const source = link.source as MindMapNode;
          const target = link.target as MindMapNode;
          
          // Get minimum distance from last clicked node to either source or target
          const sourceDistance = getDistanceFromNode(lastClickedNodeId, source.id) ?? Infinity;
          const targetDistance = getDistanceFromNode(lastClickedNodeId, target.id) ?? Infinity;
          const minDistance = Math.min(sourceDistance, targetDistance);
          
          // Scale link distance based on distance from last clicked node
          return Math.max(40, 100 - (minDistance * 15));
        })
        .strength(1))
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // Color scale for groups
    const getNodeColor = (node: MindMapNode) => {
      if (node.id === 'root') return '#808080'; // gray for root node
      if (node.isNew) return '#FFA500';  // orange for newly added nodes
      return '#4169E1';  // royal blue for other nodes
    };

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Create nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .call((selection) => {
        const dragBehavior = d3.drag<SVGGElement, MindMapNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
        
        (selection as d3.Selection<SVGGElement, MindMapNode, SVGGElement, unknown>)
          .call(dragBehavior);
      })
      .on('click', (_event: MouseEvent, d: MindMapNode) => {
        handleNodeClick(d);
      });

    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.children ? 8 : 6)
      .attr("fill", d => {
        // If this is a root node or has no parent reference, use default color
        if (d.id === 'root') {
          return getNodeColor(d);
        }
        // Otherwise use the first/other child coloring logic
        const parentNode = nodes.find(n => n.children?.includes(d));
        if (parentNode) {
          const siblings = parentNode.children || [];
          return siblings.indexOf(d) === 0 ? '#ff6b6b' : '#ffd93d';
        }
        return getNodeColor(d);
      });

    // Add labels to nodes
    node.append("text")
      .each(function(d) {
        const text = d3.select(this);
        const words = d.name.split(/\s+/);
        const maxLineLength = 50;
        
        // First calculate lines
        const lines: string[] = [];
        let currentLine: string[] = [];
        
        words.forEach(word => {
          const testLine = [...currentLine, word];
          if (testLine.join(" ").length <= maxLineLength) {
            currentLine.push(word);
          } else {
            if (currentLine.length > 0) {
              lines.push(currentLine.join(" "));
            }
            currentLine = [word];
          }
        });
        
        // Push remaining line if any
        if (currentLine.length > 0) {
          lines.push(currentLine.join(" "));
        }

        // Now draw the lines
        const lineHeight = 1.1; // ems
        lines.forEach((line, i) => {
          text.append("tspan")
            .attr("x", 12)
            .attr("dy",`${lineHeight}em`)
            .attr("y", `${i}em`)
            .text(line);
        });

        // Center the text block vertically based on number of lines
        //const totalLines = lines.length;
        //text.selectAll("tspan")
        //  .attr("y", -((totalLines - 1) * lineHeight * 0.5) + "em");

      })
      .style("font-size", "12px")
      .style("font-family", "Arial");

    // Add title on hover
    node.append("title")
      .text(d => d.name);

    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as MindMapNode).x!)
        .attr("y1", d => (d.source as MindMapNode).y!)
        .attr("x2", d => (d.target as MindMapNode).x!)
        .attr("y2", d => (d.target as MindMapNode).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, MindMapNode, MindMapNode>, d: MindMapNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, MindMapNode, MindMapNode>, d: MindMapNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, MindMapNode, MindMapNode>, d: MindMapNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [mindMapData, width, height, lastClickedNodeId]);

  const handleNodeClick = async (node: MindMapNode) => {
    try {
      setLastClickedNodeId(node.id);
      if (!node.children || node.children.length === 0) {
        const response = await llmService.generateSubnodes(node.name);
        
        // Create new nodes from the response with isNew flag
        const newChildren = response.subnodes.map((text, index) => ({
          id: `${node.id}-${index}`,
          name: text,
          text: text,
          children: [],
          isNew: true
        }));

        // Update the mindmap data
        setMindMapData((prev) => {
          if (!prev) return prev;

          // Helper function to reset isNew flag on all nodes
          const resetIsNewFlag = (node: MindMapNode): MindMapNode => ({
            ...node,
            isNew: false,
            children: node.children?.map(resetIsNewFlag)
          });

          const updateNodeChildren = (n: MindMapNode): MindMapNode => {
            if (n.id === node.id) {
              return {
                ...n,
                children: newChildren
              };
            }
            if (n.children) {
              return {
                ...n,
                children: n.children.map(updateNodeChildren)
              };
            }
            return n;
          };

          // First reset all isNew flags, then update with new children
          const resetData = resetIsNewFlag(prev);
          return updateNodeChildren(resetData);
        });
      }
    } catch (error) {
      console.error('Error generating subnodes:', error);
    }
  };

  if (loading) {
    return <div>Loading mindmap data...</div>;
  }

  if (!mindMapData) {
    return <div>No data available</div>;
  }

  return (
    <div className="mindmap-container">
      <svg 
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff'
        }}
      />
      <style>{`
        .mindmap-container {
          display: flex;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: #f5f5f5;
          overflow: hidden;
        }
        .node:hover circle {
          fill-opacity: 0.8;
        }
        .node text {
          transition: font-weight 0.3s;
        }
        .node:hover text {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
} 