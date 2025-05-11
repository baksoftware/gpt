import type {
  SimulationAPI,
  SimulationConfig,
  SimulationState,
  Team,
  Person,
  WorkUnit,
  Discipline,
  WorkUnitType,
  PersonConfigItem
} from './types';

let simulationInstance: OrgSimulation | null = null;

class OrgSimulation implements SimulationAPI {
  private state: SimulationState = {
    teams: [],
    workUnits: [],
    currentTimeTick: 0,
    eventLog: [],
  };

  private config: SimulationConfig | null = null;

  constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): OrgSimulation {
    if (!simulationInstance) {
      simulationInstance = new OrgSimulation();
    }
    return simulationInstance;
  }

  async loadConfigAndInitialize(configPath: string): Promise<void> {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      const configData = await response.json() as SimulationConfig;
      this.initialize(configData);
      this.logEvent("Simulation initialized with config from: " + configPath);
    } catch (error) {
      console.error("Error loading or initializing simulation:", error);
      this.logEvent("Error loading or initializing simulation: " + (error as Error).message);
      // Optionally, re-throw or handle more gracefully
      throw error;
    }
  }

  initialize(config: SimulationConfig): void {
    this.config = config;
    this.state.currentTimeTick = 0;
    this.state.eventLog = ["Simulation initialized."];
    
    // 1. Initialize Teams and People
    const teamsMap = new Map<string, Team>();
    this.state.teams = config.teams.map(teamConfig => {
      const team: Team = {
        ...teamConfig,
        members: [],
      };
      teamsMap.set(teamConfig.name, team); // Use name for mapping during person assignment
      return team;
    });

    config.people.forEach((personConfig: PersonConfigItem) => {
      const team = teamsMap.get(personConfig.initialTeamName);
      if (team) {
        const person: Person = {
          id: personConfig.id,
          name: personConfig.name,
          discipline: personConfig.discipline,
          teamId: team.id,
          currentWorkUnitId: null,
          workRemainingTicks: 0,
        };
        team.members.push(person);
      } else {
        this.logEvent(`Warning: Team "${personConfig.initialTeamName}" not found for person "${personConfig.name}".`);
      }
    });

    // 2. Initialize Work Units
    this.state.workUnits = config.initialWorkUnits.map((wuConfig, index) => {
      const workUnit: WorkUnit = {
        id: wuConfig.id || `wu_${Date.now()}_${index}`,
        type: wuConfig.type,
        payload: wuConfig.payload,
        currentOwnerId: null,
        currentTeamOwnerId: null,
        history: [{
            personId: null,
            teamId: '', // Will be set below
            completedAtTick: 0,
            action: `Created with type ${wuConfig.type}`
        }],
      };

      // Assign initial 'need' work units to a customer representative
      if (workUnit.type === 'need') {
        const customerTeam = this.state.teams.find(t => t.isCustomerTeam);
        if (customerTeam) {
          workUnit.currentTeamOwnerId = customerTeam.id;
          workUnit.history[0].teamId = customerTeam.id;
          const customerRep = customerTeam.members.find(m => m.discipline === 'customer_representative' && !m.currentWorkUnitId);
          if (customerRep) {
            workUnit.currentOwnerId = customerRep.id;
            customerRep.currentWorkUnitId = workUnit.id;
            // Set workRemainingTicks for the customer rep based on config
            const workTicks = this.config?.personWorkTicks?.[customerRep.discipline]?.[workUnit.type];
            customerRep.workRemainingTicks = typeof workTicks === 'number' ? workTicks : 0; // Default to 0 if not defined

            workUnit.history.push({
              personId: customerRep.id,
              teamId: customerTeam.id,
              completedAtTick: 0,
              action: `Assigned to ${customerRep.name} (${customerRep.discipline})`
            });
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) assigned to ${customerRep.name} in ${customerTeam.name}.`);
          } else {
            this.logEvent(`Warning: No available customer representative in ${customerTeam.name} for initial work unit ${workUnit.id}. It remains in team backlog.`);
          }
        } else {
           this.logEvent(`Warning: No customer team found for initial 'need' work unit ${workUnit.id}.`);
        }
      }
      return workUnit;
    });

    this.logEvent("Teams, people, and initial work units processed.");
  }

  private logEvent(message: string): void {
    console.log(`[SIM_LOG T-${this.state.currentTimeTick}] ${message}`);
    this.state.eventLog.push(`[T-${this.state.currentTimeTick}] ${message}`);
  }
  
  // Placeholder for tick
  tick(): void {
    if (!this.config) {
        this.logEvent("Simulation not initialized. Cannot tick.");
        return;
    }
    this.state.currentTimeTick++;
    this.logEvent(`Tick ${this.state.currentTimeTick}`);

    // Detailed tick logic will go here:
    // 1. People work on their current tasks
    // 2. Completed work units are transitioned
    // 3. New work units are assigned

    // This is a very simplified placeholder:
    this.state.teams.forEach(team => {
        team.members.forEach(person => {
            if (person.currentWorkUnitId && person.workRemainingTicks > 0) {
                person.workRemainingTicks--;
                if (person.workRemainingTicks === 0) {
                    this.logEvent(`${person.name} completed work on ${person.currentWorkUnitId}.`);
                    // TODO: Implement work unit transition logic here based on this.config.workFlow
                    const completedWorkUnit = this.state.workUnits.find(wu => wu.id === person.currentWorkUnitId);
                    if(completedWorkUnit) {
                        // Mark as completed by this person
                        completedWorkUnit.history.push({
                            personId: person.id,
                            teamId: person.teamId,
                            completedAtTick: this.state.currentTimeTick,
                            action: `Completed ${completedWorkUnit.type}`
                        });
                        this.logEvent(`Work unit ${completedWorkUnit.id} type ${completedWorkUnit.type} completed by ${person.name}.`);
                        
                        // TODO: Transition to next state
                        // For now, just clear the person's task
                        person.currentWorkUnitId = null; 
                        completedWorkUnit.currentOwnerId = null; 
                        // The work unit would then be picked up by the next person in the flow or put in a backlog
                    }
                }
            }
        });
    });


    // TODO: Implement full tick logic as per user requirements
    // - work goes from customer to designer, from designer to pm, etc.
    // - at each tick in the simulation the visualisation is updated (this will be handled by the calling code)
  }

  getState(): SimulationState {
    // Return a deep copy to prevent direct modification of internal state
    return JSON.parse(JSON.stringify(this.state));
  }
}

export default OrgSimulation; 