import React, { useState, useEffect, useCallback, useRef } from 'react';
import OrgSimulation from '../simulation/simulation';
import { TickState, type SimulationState, type SimulationAPI, type Person, type Team, type WorkUnit } from '../simulation/types';
import { Application, extend, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { Container, Graphics, Text as PixiText } from 'pixi.js';

// Extend @pixi/react with the PixiJS components we want to use
extend({ Container, Graphics, Text: PixiText });

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

// Keep existing color definitions (ensure they are numbers for PixiJS)
const disciplineColors: Record<string, number> = {
  'customer_representative': 0xFFBF00, // Amber
  'designer': 0xDE3163, // Cerise
  'product manager': 0x6495ED, // Cornflower Blue
  'software developer': 0x9FE2BF, // Seafoam Green
  'tester': 0x40E0D0 // Turquoise
};

const workUnitTypeColors: Record<string, number> = {
  'need': 0xFF7F50, // Coral
  'design': 0xFFD700, // Gold
  'task': 0xADFF2F, // Green Yellow
  'code': 0x1E90FF, // Dodger Blue
  'release': 0xBA55D3, // Medium Orchid
  'done': 0x000000 // Black
};

const TEAM_RADIUS = 100;
const PERSON_RADIUS = 20;
const WORK_UNIT_RADIUS = 16;
const PADDING = 30; // Padding between teams
const PERSON_DISTANCE_FROM_RIM  = 25;
const ANIMATION_DURATION = 50;
const TICK_INTERVAL = 50;

// New AnimatedPixiContainer component
interface AnimatedPixiContainerProps {
  x: number;
  y: number;
  children: React.ReactNode;
  idForAnimation: string; // To help manage animation state across re-renders
}

const AnimatedPixiContainer: React.FC<AnimatedPixiContainerProps> = ({ x: targetX, y: targetY, children, idForAnimation }) => {
  const [currentX, setCurrentX] = useState(targetX);
  const [currentY, setCurrentY] = useState(targetY);
  const animationState = useRef({
    startTime: 0,
    startX: targetX,
    startY: targetY,
    endX: targetX,
    endY: targetY,
    isAnimating: false,
  });

  useEffect(() => {
    // If target changes and we are not already animating to this exact target, start a new animation
    if ((targetX !== animationState.current.endX || targetY !== animationState.current.endY) || !animationState.current.isAnimating) {
      animationState.current = {
        startTime: performance.now(),
        startX: currentX, // Animate from current rendered position
        startY: currentY,
        endX: targetX,
        endY: targetY,
        isAnimating: true,
      };
    }
    // This effect should re-run if targetX/Y changes, to trigger new animations.
    // Also, when idForAnimation changes (e.g. new element), reset position immediately.
    // However, for existing elements, we want to animate from their current spot.
  }, [targetX, targetY, idForAnimation, currentX, currentY]); // currentX/Y added to ensure animation starts from visual pos

  useTick(() => {
    if (!animationState.current.isAnimating)
      return;

    const now = performance.now();
    const elapsed = now - animationState.current.startTime;
    let progress = Math.min(elapsed / ANIMATION_DURATION, 1);

    // Simple ease-out cubic easing
    progress = 1 - Math.pow(1 - progress, 3);

    const newX = animationState.current.startX + (animationState.current.endX - animationState.current.startX) * progress;
    const newY = animationState.current.startY + (animationState.current.endY - animationState.current.startY) * progress;

    setCurrentX(newX);
    setCurrentY(newY);

    if (progress >= 1) {
      animationState.current.isAnimating = false;
      setCurrentX(animationState.current.endX); // Ensure it lands exactly on target
      setCurrentY(animationState.current.endY);
    }
  }); // Using options object for enabling/disabling tick

  return <pixiContainer x={currentX} y={currentY}>{children}</pixiContainer>;
};

const Visualization: React.FC = () => {
  const [simApi, setSimApi] = useState<SimulationAPI | null>(null);
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  // Component dimensions - can be made dynamic
  const stageWidth = 700;
  const stageHeight = 900;

  useEffect(() => {
    setSimApi(OrgSimulation.getInstance());
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
    if (isRunning && simApi) {
      intervalRef.current = window.setInterval(() => {
        const tickState = simApi.tick();
        console.log(`Tick state: ${tickState}`);
        setSimState(simApi.getState());
        if (tickState === TickState.COMPLETED) {
          setIsRunning(false);
        }
      }, TICK_INTERVAL);
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
  }, [isRunning, simApi]);

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

    const getWorkUnitLocation = (wu: WorkUnit): string => {
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
  
  // Simple layout function for teams
  const getTeamPosition = (teamIndex: number) => {
    const teamsPerRow = Math.floor(stageWidth / (TEAM_RADIUS * 2 + PADDING));
    const row = Math.floor(teamIndex / teamsPerRow);
    const col = teamIndex % teamsPerRow;
    const x = col * (TEAM_RADIUS * 2 + PADDING) + TEAM_RADIUS + PADDING;
    const y = row * (TEAM_RADIUS * 2 + PADDING) + TEAM_RADIUS + PADDING;
    return { x, y };
  };

  // Simple layout for people within a team (arrange in a circle)
  const getPersonPositionInTeam = (personIndex: number, totalPersons: number, teamRadius: number) => {
    if (totalPersons === 0) return { x: 0, y: 0 };
    const angleStep = (2 * Math.PI) / totalPersons;
    const angle = personIndex * angleStep;
    const orbitRadius = teamRadius - PERSON_DISTANCE_FROM_RIM; // Place them within the team circle
    return {
      x: orbitRadius * Math.cos(angle),
      y: orbitRadius * Math.sin(angle),
    };
  };
  
  // Calculate positions for work units (simplified)
  const getWorkUnitPosition = (wu: WorkUnit, teams: Team[], people: Person[]) => {
    // Default position, maybe top-left or a dedicated "unassigned" area
    let x = PADDING;
    let y = stageHeight - PADDING - WORK_UNIT_RADIUS;

    if (wu.currentOwnerId) {
      const owner = people.find(p => p.id === wu.currentOwnerId);
      // Ensure owner and owner.teamId are valid before proceeding
      const ownerTeam = owner ? teams.find(t => t.id === owner.teamId) : undefined;
      if (owner && ownerTeam) {
        const teamIndex = teams.findIndex(t => t.id === ownerTeam.id);
          if (teamIndex === -1) { // Safety check if team not found by index
            console.warn(`Owner team ${ownerTeam.id} not found in teams list for WU ${wu.id}`);
            return {x,y}; // return default position
          }
        const teamPos = getTeamPosition(teamIndex);
        const personIndex = ownerTeam.members.findIndex(m => m.id === owner.id);
         if (personIndex === -1) { // Safety check
            console.warn(`Owner ${owner.id} not found in team members for WU ${wu.id}`);
            return {x,y}; // return default position
          }
        const personPosInTeam = getPersonPositionInTeam(
          personIndex,
          ownerTeam.members.length,
          TEAM_RADIUS
        );
        // Position near the person: person's absolute position + an offset
        x = teamPos.x + personPosInTeam.x + PERSON_RADIUS + WORK_UNIT_RADIUS + 5;
        y = teamPos.y + personPosInTeam.y;
      }
    } else if (wu.currentTeamOwnerId) {
      const teamIndex = teams.findIndex(t => t.id === wu.currentTeamOwnerId);
      if (teamIndex !== -1) {
        const teamPos = getTeamPosition(teamIndex);
        // Position in a "backlog" area of the team, e.g., below the team circle
        x = teamPos.x;
        y = teamPos.y + TEAM_RADIUS + WORK_UNIT_RADIUS + 5;
      } else {
         console.warn(`Backlog team ${wu.currentTeamOwnerId} not found for WU ${wu.id}`);
      }
    }
    return { x, y };
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
      <Application width={stageWidth} height={stageHeight} background={0xeeeeee}>
        {simState && (
          <>
            {/* Render Teams */}
            {simState.teams.map((team, teamIndex) => {
              const { x: teamX, y: teamY } = getTeamPosition(teamIndex);
              return (
                <pixiContainer key={team.id} x={teamX} y={teamY}>
                  <pixiGraphics
                    draw={(g: PIXI.Graphics) => {
                      g.clear();
                      g.lineStyle(1, 0x333333);
                      g.beginFill(team.isCustomerTeam ? 0xdddddd : 0xcccccc);
                      g.drawCircle(0, 0, TEAM_RADIUS);
                      g.endFill();
                    }}
                  />
                  <pixiText
                    text={team.name}
                    anchor={0.5}
                    x={0}
                    y={0}
                    style={new PIXI.TextStyle({ fontSize: 10, fill: 0x000000 })}
                  />
                  {/* Render People in Team */}
                  {team.members.map((person, personIndex) => {
                    const { x: personX, y: personY } = getPersonPositionInTeam(
                      personIndex,
                      team.members.length,
                      TEAM_RADIUS
                    );
                    return (
                      <pixiContainer key={person.id} x={personX} y={personY}>
                        <pixiGraphics
                          draw={(g: PIXI.Graphics) => {
                            g.clear();
                            g.beginFill(disciplineColors[person.discipline] || 0xff00ff);
                            g.drawCircle(0, 0, PERSON_RADIUS);
                            g.endFill();
                          }}
                        />
                         <pixiText
                            text={person.name.substring(0,3)} // Short name
                            anchor={0.5}
                            x={0}
                            y={0}
                            style={new PIXI.TextStyle({ fontSize: 8, fill: 0x000000 })}
                        />
                      </pixiContainer>
                    );
                  })}
                </pixiContainer>
              );
            })}
            
            {/* Render Work Units */}
            {simState.workUnits.map(wu => {
              const allPeople = simState.teams.flatMap(t => t.members);
              const { x: wuX, y: wuY } = getWorkUnitPosition(wu, simState.teams, allPeople);
              return (
                // Use AnimatedPixiContainer for work units
                <AnimatedPixiContainer key={wu.id} x={wuX} y={wuY} idForAnimation={wu.id}>
                  <pixiGraphics
                    draw={(g: PIXI.Graphics) => {
                      g.clear();
                      g.beginFill(workUnitTypeColors[wu.type] || 0x00ff00);
                      g.drawCircle(0, 0, WORK_UNIT_RADIUS);
                      g.endFill();
                    }}
                  />
                   <pixiText
                      text={wu.id.substring(0,4)} // Short ID
                      anchor={0.5}
                      x={0}
                      y={WORK_UNIT_RADIUS + 5}
                      style={new PIXI.TextStyle({ fontSize: 7, fill: 0x333333 })}
                    />
                </AnimatedPixiContainer>
              );
            })}
          </>
        )}
      </Application>
      <hr />
      {renderSimulationDetails()}
    </div>
  );
};

export default Visualization; 