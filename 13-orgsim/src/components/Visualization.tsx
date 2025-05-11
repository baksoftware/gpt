import React, { useState, useEffect, useCallback, useRef } from 'react';
import OrgSimulation from '../simulation/simulation';
import type { SimulationState, SimulationAPI, Person, Team, WorkUnit, Discipline, WorkUnitType } from '../simulation/types';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: string; // 'team', 'person', 'workunit'
  radius: number;
  color: string;
  name?: string; // For labels
  originalData: Team | Person | WorkUnit;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string; // ID of source node
  target: string; // ID of target node
  type: string; // 'member_of_team', 'works_on', 'backlog_in_team'
}

const disciplineColors: Record<Discipline, string> = {
  'customer_representative': '#FFBF00', // Amber
  'designer': '#DE3163', // Cerise
  'product manager': '#6495ED', // Cornflower Blue
  'software developer': '#9FE2BF', // Seafoam Green
  'tester': '#40E0D0' // Turquoise
};

const workUnitTypeColors: Record<WorkUnitType, string> = {
  'need': '#FF7F50', // Coral
  'design': '#FFD700', // Gold
  'task': '#ADFF2F', // Green Yellow
  'code': '#1E90FF', // Dodger Blue
  'release': '#BA55D3' // Medium Orchid
};

const Visualization: React.FC = () => {
  const [simApi, setSimApi] = useState<SimulationAPI | null>(null);
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  useEffect(() => {
    setSimApi(OrgSimulation.getInstance());
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  const handleStartSimulation = useCallback(async () => {
    if (!simApi) {
      setError("Simulation API not loaded.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (simulationRef.current) {
        simulationRef.current.stop();
        // Optionally clear old nodes/links from SVG if not handled by D3 update pattern
        if(svgRef.current){
            d3.select(svgRef.current).selectAll('*').remove();
        }
    }
    try {
      await simApi.loadConfigAndInitialize('/data/simulationConfig.json');
      setSimState(simApi.getState());
    } catch (err) {
      console.error("Failed to start simulation:", err);
      setError(err instanceof Error ? err.message : "Unknown error starting simulation.");
    } finally {
      setIsLoading(false);
    }
  }, [simApi]);

  const handleToggleRunPause = () => {
    setIsRunning(prev => !prev);
  };

  useEffect(() => {
    if (isRunning && simApi && simState) {
      intervalRef.current = window.setInterval(() => {
        simApi.tick();
        setSimState(simApi.getState());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, simApi, simState]);

  useEffect(() => {
    if (!simState || !svgRef.current) return;

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('border', '1px solid black');

    // 1. Transform data
    const nodes: Node[] = [];
    const links: Link[] = [];

    simState.teams.forEach(team => {
      nodes.push({ id: team.id, group: 'team', radius: team.isCustomerTeam ? 40 : 30, color: team.isCustomerTeam ? '#f0f0f0' : '#cccccc', name: team.name, originalData: team });
      team.members.forEach(person => {
        nodes.push({ id: person.id, group: 'person', radius: 10, color: disciplineColors[person.discipline], name: person.name, originalData: person });
        links.push({ source: person.id, target: team.id, type: 'member_of_team' });
        if (person.currentWorkUnitId) {
          links.push({ source: person.id, target: person.currentWorkUnitId, type: 'works_on' });
        }
      });
    });

    simState.workUnits.forEach(wu => {
      nodes.push({ id: wu.id, group: 'workunit', radius: 8, color: workUnitTypeColors[wu.type], name: wu.id, originalData: wu });
      if (wu.currentTeamOwnerId && !wu.currentOwnerId) { // In backlog
        links.push({ source: wu.id, target: wu.currentTeamOwnerId, type: 'backlog_in_team' });
      }
    });
    
    // Initialize or update simulation
    if (!simulationRef.current) {
        simulationRef.current = d3.forceSimulation<Node, Link>(nodes)
            .force('link', d3.forceLink<Node, Link>(links).id((d: Node) => d.id).distance((d: Link) => {
                if (d.type === 'member_of_team') return 50;
                if (d.type === 'works_on') return 20;
                if (d.type === 'backlog_in_team') return 40;
                return 30;
            }))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius((d: Node) => d.radius + 5));
    } else {
        simulationRef.current.nodes(nodes);
        const linkForce = simulationRef.current.force('link') as d3.ForceLink<Node, Link>; 
        if(linkForce) {
            linkForce.links(links);
        }
        simulationRef.current.alpha(0.3).restart();
    }
    
    // Draw links
    const linkElements = svg.selectAll<SVGLineElement, Link>('.link')
        .data(links, (d: Link) => `${(d.source as Node).id}-${(d.target as Node).id}`);
    
    linkElements.exit().remove();
    
    const linkEnter = linkElements.enter().append('line')
        .attr('class', 'link')
        .style('stroke', (d: Link) => d.type === 'works_on' ? '#2ecc71' : '#999')
        .style('stroke-opacity', 0.6)
        .style('stroke-width', (d: Link) => d.type === 'works_on' ? 2 : 1);

    const allLinks = linkEnter.merge(linkElements);

    // Draw nodes (circles + text)
    const nodeGroups = svg.selectAll<SVGGElement, Node>('.node-group')
        .data(nodes, (d: Node) => d.id);

    nodeGroups.exit().remove();

    const nodeEnter = nodeGroups.enter().append('g')
        .attr('class', 'node-group')
        .call(d3.drag<SVGGElement, Node>()
            .on('start', (event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) => {
                if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) => {
                if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            })
        );

    nodeEnter.append('circle')
        .attr('r', (d: Node) => d.radius)
        .style('fill', (d: Node) => d.color)
        .style('stroke', '#fff')
        .style('stroke-width', 1.5);

    nodeEnter.append('text')
        .text((d: Node) => d.name || '')
        .attr('x', (d: Node) => d.radius + 5)
        .attr('y', 5)
        .style('font-size', '10px')
        .style('fill', '#333');
        
    const allNodes = nodeEnter.merge(nodeGroups);
    allNodes.select('circle')
        .attr('r', (d: Node) => d.radius)
        .style('fill', (d: Node) => d.color);
    allNodes.select('text')
        .text((d: Node) => d.name || '');

    // Simulation tick function
    simulationRef.current.on('tick', () => {
        allLinks
            .attr('x1', (d: Link) => (d.source as Node).x || 0)
            .attr('y1', (d: Link) => (d.source as Node).y || 0)
            .attr('x2', (d: Link) => (d.target as Node).x || 0)
            .attr('y2', (d: Link) => (d.target as Node).y || 0);

        allNodes
            .attr('transform', (d: Node) => `translate(${d.x || 0},${d.y || 0})`);
    });

  }, [simState]); // Rerun D3 rendering when simState changes

  const renderSimulationDetails = () => {
    if (isLoading) {
      return <p>Loading simulation data...</p>;
    }
    if (error) {
      return <p style={{ color: 'red' }}>Error: {error}</p>;
    }
    if (!simState) {
      return <p>Click "Load/Reset Simulation" to load data.</p>;
    }

    const getWorkUnitLocation = (wu: import('../simulation/types').WorkUnit): string => {
      if (wu.currentOwnerId) {
        for (const team of simState.teams) {
          const person = team.members.find(p => p.id === wu.currentOwnerId);
          if (person) {
            return `${person.name} (${person.discipline}) on Team ${team.name}`;
          }
        }
        return `Person ID: ${wu.currentOwnerId} (Team not found)`;
      }
      if (wu.currentTeamOwnerId) {
        const team = simState.teams.find(t => t.id === wu.currentTeamOwnerId);
        return team ? `Backlog of Team ${team.name}` : `Team ID: ${wu.currentTeamOwnerId} (Not found)`;
      }
      return "Unassigned";
    };

    return (
      <div>
        <p>Current Tick: {simState.currentTimeTick}</p>
        <p>Teams: {simState.teams.length}</p>
        <p>Work Units: {simState.workUnits.length}</p>
        
        <h4>Work Unit Status:</h4>
        {simState.workUnits.length > 0 ? (
          <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {simState.workUnits.map(wu => (
              <li key={wu.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '5px'}}>
                <strong>ID:</strong> {wu.id} | <strong>Type:</strong> {wu.type} <br />
                <strong>Location:</strong> {getWorkUnitLocation(wu)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No work units in the simulation.</p>
        )}

        <h4>Event Log:</h4>
        <pre style={{ maxHeight: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', background: '#f9f9f9' }}>
          {simState.eventLog.join('\n')}
        </pre>
      </div>
    );
  };

  return (
    <div>
      <h1>Simulation Visualization</h1>
      <button onClick={handleStartSimulation} disabled={isLoading || !simApi}>
        {isLoading ? 'Initializing Simulation...' : 'Load/Reset Simulation'}
      </button>
      {simState && (
        <button onClick={handleToggleRunPause} disabled={isLoading || !simApi}>
          {isRunning ? 'Pause Simulation' : 'Run Simulation'}
        </button>
      )}
      <hr />
      {/* D3 SVG container */}
      <svg ref={svgRef}></svg>
      <hr />
      {renderSimulationDetails()}
    </div>
  );
};

export default Visualization; 