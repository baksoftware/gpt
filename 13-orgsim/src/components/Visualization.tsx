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
  'Customer': 0xFFE5B4, // Light Amber
  'Designer': 0xFFB6C1, // Light Pink
  'PM': 0xB0E2FF, // Light Blue
  'SwDev': 0xE0FFE0, // Light Green
  'Tester': 0xAFEEEE // Light Turquoise
};

const workUnitTypeColors: Record<string, number> = {
  'need': 0xFFDAB9, // Light Coral
  'design': 0xFFF8DC, // Light Gold
  'task': 0xF0FFF0, // Light Green Yellow
  'code': 0xBFEFFF, // Light Blue
  'release': 0xE6E6FA, // Light Purple
  'done': 0xADD8E6 // Light Blue
};

const TEAM_RADIUS = 100;
const PERSON_RADIUS = 20;
const WORK_UNIT_RADIUS = 16;
const PADDING = 30; // Padding between teams
const PERSON_DISTANCE_FROM_RIM  = 25;
const ANIMATION_DURATION = 50;
const TICK_INTERVAL = 50;

const DONE_PILE_COLOR = 0x808080; // Grey for the "done" pile
const DONE_PILE_RADIUS = WORK_UNIT_RADIUS * 1.5; // Slightly larger for the pile

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
  const stageWidth = 1200;
  const stageHeight = 800;

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

  const getTeamPosition = (teamIndex: number, currentStageWidth: number) => {
    const teamsPerRow = Math.floor(currentStageWidth / (TEAM_RADIUS * 2 + PADDING));
    const row = Math.floor(teamIndex / teamsPerRow);
    const col = teamIndex % teamsPerRow;
    const x = col * (TEAM_RADIUS * 2 + PADDING) + TEAM_RADIUS + PADDING;
    const y = row * (TEAM_RADIUS * 2 + PADDING) + TEAM_RADIUS + PADDING;
    return { x, y };
  };
  
  const getPersonPositionInTeam = (personIndex: number, totalPersons: number, teamRadius: number) => {
    if (totalPersons === 0) return { x: 0, y: 0 };
    const angleStep = (2 * Math.PI) / totalPersons;
    const angle = personIndex * angleStep;
    const orbitRadius = teamRadius - PERSON_DISTANCE_FROM_RIM; 
    return {
      x: orbitRadius * Math.cos(angle),
      y: orbitRadius * Math.sin(angle),
    };
  };

  const getWorkUnitPosition = useCallback((
    wu: WorkUnit, 
    teams: Team[], 
    people: Person[],
    currentStageWidth: number,
    currentStageHeight: number,
    forHeightCalculation: boolean = false
    ): { x: number; y: number } => {
    
    if (wu.type === 'done' && !forHeightCalculation) {
      return { x: PADDING + DONE_PILE_RADIUS, y: PADDING + DONE_PILE_RADIUS };
    }

    let x = PADDING;
    let y = currentStageHeight - PADDING - WORK_UNIT_RADIUS; // Default for unassigned

    if (wu.currentOwnerId) {
      const owner = people.find(p => p.id === wu.currentOwnerId);
      const ownerTeam = owner ? teams.find(t => t.id === owner.teamId) : undefined;
      if (owner && ownerTeam) {
        const teamIndex = teams.findIndex(t => t.id === ownerTeam.id);
        if (teamIndex === -1) { 
          console.warn(`Owner team ${ownerTeam.id} not found in teams list for WU ${wu.id}`);
          return {x,y}; 
        }
        const teamPos = getTeamPosition(teamIndex, currentStageWidth);
        const personIndex = ownerTeam.members.findIndex(m => m.id === owner.id);
        if (personIndex === -1) { 
          console.warn(`Owner ${owner.id} not found in team members for WU ${wu.id}`);
          return {x,y}; 
        }
        const personPosInTeam = getPersonPositionInTeam(personIndex, ownerTeam.members.length, TEAM_RADIUS);
        x = teamPos.x + personPosInTeam.x + PERSON_RADIUS + WORK_UNIT_RADIUS/2;
        y = teamPos.y + personPosInTeam.y + PERSON_RADIUS + WORK_UNIT_RADIUS/2;
      }
    } else if (wu.currentTeamOwnerId) {
      const teamIndex = teams.findIndex(t => t.id === wu.currentTeamOwnerId);
      if (teamIndex !== -1) {
        const teamPos = getTeamPosition(teamIndex, currentStageWidth);
        x = teamPos.x;
        y = teamPos.y + TEAM_RADIUS + WORK_UNIT_RADIUS + 5;
      } else {
         console.warn(`Backlog team ${wu.currentTeamOwnerId} not found for WU ${wu.id}`);
      }
    }
    return { x, y };
  }, []);


  return (
    <div>
      <div>
      <button onClick={handleStartSimulation} disabled={isLoading || !simApi}>
        {isLoading ? 'Initializing Simulation...' : 'Load/Reset Simulation'}
      </button>
      {simState && (
        <button onClick={handleToggleRunPause} disabled={isLoading || !simApi}>
          {isRunning ? 'Pause Simulation' : 'Run Simulation'}
        </button>
      )}</div>
      <Application width={stageWidth} height={stageHeight}  resolution={window.devicePixelRatio} autoDensity={true} background={0xeeeeee}>
        {simState && (
          <>
            {/* Render Teams */}
            {simState.teams.map((team, teamIndex) => {
              const teamPos = getTeamPosition(teamIndex, stageWidth);
              return (
                <pixiContainer key={team.id} x={teamPos.x} y={teamPos.y}>
                  <pixiGraphics
                    draw={(g: PIXI.Graphics) => {
                      g.clear();
                      g.setStrokeStyle({ width: 1, color: 0x333333 });
                      g.fill(team.isCustomerTeam ? 0xdddddd : 0xcccccc);
                      g.circle(0, 0, TEAM_RADIUS);
                      g.fill()
                    }}
                  />
                  <pixiText
                    text={team.name}
                    anchor={0.5}                    
                    x={0}
                    y={-TEAM_RADIUS-7}
                    style={new PIXI.TextStyle({ fontSize: 10, fill: 0x000000 })}
                  />
                  {team.members.map((person, personIndex) => {
                    const personPosInTeam = getPersonPositionInTeam(personIndex, team.members.length, TEAM_RADIUS);
                    return (
                      <pixiContainer key={person.id} x={personPosInTeam.x} y={personPosInTeam.y}>
                        <pixiGraphics
                          draw={(g: PIXI.Graphics) => {
                            g.clear();
                            g.fill(disciplineColors[person.discipline] || 0xff00ff);
                            g.circle(0, 0, PERSON_RADIUS);
                            g.fill()
                          }}
                        />
                         <pixiText
                            text={person.discipline}
                            anchor={0.5}
                            x={0}
                            y={0}
                            style={new PIXI.TextStyle({ fontSize: 8, fill: 0x000000 })}
                        />
                         <pixiText
                            text={person.workRemainingTicks.toString()}
                            anchor={0.5}
                            x={0}
                            y={10}
                            style={new PIXI.TextStyle({ fontSize: 8, fill: 0x000000 })}
                        />
                      </pixiContainer>
                    );
                  })}
                </pixiContainer>
              );
            })}
            
            {(() => {
              const doneWorkUnits = simState.workUnits.filter(wu => wu.type === 'done');
              const activeWorkUnits = simState.workUnits.filter(wu => wu.type !== 'done');
              const allPeople = simState.teams.flatMap(t => t.members);

              return (
                <>
                  {activeWorkUnits.map(wu => {
                    const wuPos = getWorkUnitPosition(wu, simState.teams, allPeople, stageWidth, stageHeight);

                    return (
                      <AnimatedPixiContainer key={wu.id} x={wuPos.x} y={wuPos.y} idForAnimation={wu.id}>
                        <pixiGraphics
                          draw={(g: PIXI.Graphics) => {
                            g.clear();
                            g.circle(0, 0, WORK_UNIT_RADIUS);
                            g.fill(workUnitTypeColors[wu.type] || 0x00ff00);                            
                          }}
                        />
                          <pixiText 
                            text={wu.type}
                            anchor={0.5}
                            x={0}
                            y={0} 
                            style={new PIXI.TextStyle({ fontSize: 7, fill: 0x333333 })}
                          />
                      </AnimatedPixiContainer>
                    );
                  })}

                  {doneWorkUnits.length > 0 && (
                    <pixiContainer x={PADDING + DONE_PILE_RADIUS} y={PADDING + DONE_PILE_RADIUS}>
                      <pixiGraphics
                        draw={(g: PIXI.Graphics) => {
                          g.clear();
                          g.fill(DONE_PILE_COLOR);
                          g.circle(0, 0, DONE_PILE_RADIUS);
                          g.fill()
                        }}
                      />
                      <pixiText
                        text={doneWorkUnits.length.toString()}
                        anchor={0.5}
                        x={0}
                        y={0}
                        style={new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: 'bold' })}
                      />
                    </pixiContainer>
                  )}
                </>
              );
            })()}
          </>
        )}
      </Application>
    </div>
  );
};

export default Visualization; 