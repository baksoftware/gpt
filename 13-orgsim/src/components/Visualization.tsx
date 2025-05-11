import React, { useState, useEffect, useCallback, useRef } from 'react';
import OrgSimulation from '../simulation/simulation';
import type { SimulationState, SimulationAPI } from '../simulation/types';

const Visualization: React.FC = () => {
  const [simApi, setSimApi] = useState<SimulationAPI | null>(null);
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setSimApi(OrgSimulation.getInstance());
    // Clear interval on unmount
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
    setIsRunning(false); // Stop simulation if it was running from a previous load
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
    if (isRunning && simApi && simState) {
      intervalRef.current = window.setInterval(() => {
        simApi.tick();
        setSimState(simApi.getState());
      }, 1000); // 1 second per tick
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // Cleanup function to clear interval when isRunning changes or component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, simApi, simState]); // Rerun effect if isRunning, simApi, or simState changes

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
      {renderSimulationDetails()}
    </div>
  );
};

export default Visualization; 