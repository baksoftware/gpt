import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface MindMapNode {
  id: string;
  name: string;
  children?: MindMapNode[];
}

const mindMapData: MindMapNode = {
  id: "root",
  name: "TypeScript React",
  children: [
    {
      id: "type-safety",
      name: "Type Safety",
      children: [
        { id: "ts1", name: "Proper Interfaces" },
        { id: "ts2", name: "Avoid any" },
        { id: "ts3", name: "Strict Config" }
      ]
    },
    {
      id: "components",
      name: "Components",
      children: [
        { id: "comp1", name: "One per File" },
        { id: "comp2", name: "Functional" },
        { id: "comp3", name: "Small & Focused" }
      ]
    },
    {
      id: "hooks",
      name: "Hooks",
      children: [
        { id: "hook1", name: "Top Level" },
        { id: "hook2", name: "Custom Hooks" },
        { id: "hook3", name: "Dependencies" }
      ]
    }
  ]
};

const ReactRulesMindmap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create the tree layout
    const tree = d3.tree<MindMapNode>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    // Create the hierarchy
    const root = d3.hierarchy(mindMapData);
    
    // Assign positions to nodes
    const nodes = tree(root);

    // Create links
    svg.selectAll(".link")
      .data(nodes.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5)
      .attr("d", d3.linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
        .source((d: any) => d.source)
        .target((d: any) => d.target)
      );

    // Create nodes
    const node = svg.selectAll(".node")
      .data(nodes.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Add circles to nodes
    node.append("circle")
      .attr("r", 6)
      .style("fill", d => d.children ? "#555" : "#999");

    // Add labels to nodes
    node.append("text")
      .attr("dy", ".31em")
      .attr("x", d => d.children ? -10 : 10)
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "Arial");

  }, []);

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
        .link {
          transition: stroke 0.3s;
        }
        .node circle {
          transition: fill 0.3s;
        }
        .node:hover circle {
          fill: #007bff !important;
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