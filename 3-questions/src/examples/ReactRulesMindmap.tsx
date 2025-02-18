import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MindMapNode, MindMapLink } from '../types/mindmap';
import { useMindMapData } from '../hooks/useMindMapData';

interface ReactRulesMindmapProps {
  dataUrl: string;
  width?: number;
  height?: number;
}

const ReactRulesMindmap: React.FC<ReactRulesMindmapProps> = ({
  dataUrl,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data, loading, error } = useMindMapData(dataUrl);

  useEffect(() => {
    if (!svgRef.current || !data) return;

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

    flattenNodes(data);

    // Create a force simulation
    const simulation = d3.forceSimulation<MindMapNode>(nodes)
      .force("link", d3.forceLink<MindMapNode, MindMapLink>(links)
        .id(d => d.id)
        .distance(100)
        .strength(1))
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // Color scale for groups
    const color = d3.scaleOrdinal(d3.schemeCategory10);

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
        
        // Explicitly type the selection for the drag behavior
        (selection as d3.Selection<SVGGElement, MindMapNode, SVGGElement, unknown>)
          .call(dragBehavior);
      });

    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.children ? 8 : 6)
      .attr("fill", d => color(d.group?.toString() || "0"));

    // Add labels to nodes
    node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(d => d.name)
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
  }, [data, width, height]);

  if (loading) {
    return <div>Loading mindmap data...</div>;
  }

  if (error) {
    return <div>Error loading mindmap: {error.message}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="mindmap-container">
      <svg 
        ref={svgRef}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff'
        }}
      />
      <style>{`
        .mindmap-container {
          display: flex;
          justify-content: center;
          padding: 20px;
          background-color: #f5f5f5;
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
};

export default ReactRulesMindmap; 