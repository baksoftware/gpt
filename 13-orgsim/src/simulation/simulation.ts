import {
  TickState,
  type SimulationAPI,
  type SimulationConfig,
  type SimulationState,
  type Team,
  type Person,
  type WorkUnit,
  type PersonConfigItem
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

  private _workTypeDisciplineMap: { [key: string]: string } = {};

  private _getDiscipline(workUnitType: string): string {
    return this._workTypeDisciplineMap[workUnitType];
  }

  private initializeWorkTypeDisciplineMap(): void {
    this._workTypeDisciplineMap = {};
    Object.keys(this.config!.personWorkTicks).forEach((discipline) => {
      Object.keys(this.config!.personWorkTicks[discipline]).forEach(workUnitType => {
        this._workTypeDisciplineMap[workUnitType] = discipline;
      });
    });
    
    // Logging to verify the mapping is correct
    console.log('Work type to discipline mapping:', this._workTypeDisciplineMap);
  }

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
    
    this.initializeWorkTypeDisciplineMap();
    
    const teamsMap = new Map<string, Team>();
    this.state.teams = config.teams.map(teamConfig => {
      const team: Team = {
        ...teamConfig,
        members: [],
      };
      teamsMap.set(teamConfig.name, team);
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
          workRemainingTicks: 0,
        };
        team.members.push(person);
      } else {
        this.logEvent(`Warning: Team "${personConfig.initialTeamName}" not found for person "${personConfig.name}".`);
      }
    });

    this.state.workUnits = config.initialWorkUnits.map((wuConfig, index) => {
      const workUnit: WorkUnit = {
        id: wuConfig.id || `wu_${Date.now()}_${index}`,
        type: wuConfig.type,
        currentOwnerId: null,
        currentTeamOwnerId: null,
      };
      this.logEvent(`Work Unit ${workUnit.id} created with type ${wuConfig.type}.`);

      const flowEntry = this.config?.workFlow[workUnit.type];
      if (flowEntry && flowEntry.nextType) {
        const nextWorkType = flowEntry.nextType;
        const nextDiscipline = this._getDiscipline(nextWorkType);

        const suitableBacklogTeam = this.state.teams.find(t => t.members.some(m => m.discipline === nextDiscipline));
        if (suitableBacklogTeam) {
          workUnit.currentTeamOwnerId = suitableBacklogTeam.id;
          this.logEvent(`Initial Work Unit ${workUnit.id} (${workUnit.type}) placed in backlog of ${suitableBacklogTeam.name} (awaiting ${nextDiscipline}).`);
        } else {
          this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) could not be assigned. No team has ${nextDiscipline} for backlog. Marked as unassignable.`);
        }

      } else {
        this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) has no defined nextDiscipline in workFlow or workFlow entry is missing. Cannot be initially assigned by flow. Marked as unassignable.`);
      }
      return workUnit;
    });

    
    console.log(this.state);

    this.logEvent("Teams, people, and initial work units processed.");
  }

  private logEvent(message: string): void {
    // console.log(`[SIM_LOG T-${this.state.currentTimeTick}] ${message}`);
    this.state.eventLog.push(`[T-${this.state.currentTimeTick}] ${message}`);
  }
  
  private _getWorkTicks(discipline: string, workUnitType: string): number {

    const ticksForDiscipline = this.config!.personWorkTicks[discipline];
    if (ticksForDiscipline && typeof ticksForDiscipline[workUnitType] === 'number') {
        return ticksForDiscipline[workUnitType] + Math.floor(Math.random() * 10);
    }
    throw new Error(`Work Ticks: Critical - No specific or default work ticks for ${discipline}/${workUnitType}.`);
  }
  
  tick(): TickState {
    if (!this.config) {
        this.logEvent("Simulation not initialized. Cannot tick.");
        return TickState.PAUSED;
    }
    this.state.currentTimeTick++;
    this.logEvent(`Tick ${this.state.currentTimeTick} begins`);

    const completedTasksThisTick: { person: Person, workUnit: WorkUnit }[] = [];

    // 1. People work on their current tasks & identify completions
    this.state.teams.forEach(team => {
        team.members.forEach(person => {
            // Find if this person is working on any task
            const currentWorkUnitOfPerson = this.state.workUnits.find(wu => wu.currentOwnerId === person.id);

            if (currentWorkUnitOfPerson && person.workRemainingTicks > 0) {
                person.workRemainingTicks--;
                if (person.workRemainingTicks === 0) {
                    this.logEvent(`${person.name} from ${team.name} completed work on ${currentWorkUnitOfPerson.id} (${currentWorkUnitOfPerson.type}).`);
                    completedTasksThisTick.push({ person, workUnit: currentWorkUnitOfPerson });
                }
            }
        });
    });

    // 2. Process completed tasks: Transition work units and free up people
    completedTasksThisTick.forEach(({ person, workUnit }) => {
      const currentWorkUnitType = workUnit.type;
      const nextStep = this.config!.workFlow[currentWorkUnitType];

      workUnit.currentOwnerId = null;
      workUnit.currentTeamOwnerId = null;

      if (nextStep) {
        workUnit.type = nextStep.nextType;
        const nextDiscipline = this._getDiscipline(workUnit.type);

        const originalTeamId = person.teamId;
        const originalTeam = this.state.teams.find(t => t.id === originalTeamId);

        if (originalTeam && originalTeam.members.some(m => m.discipline === nextDiscipline)) {
            // Case 1: Original team CAN handle the next step.
            const availablePersonInOrigin = originalTeam.members.find(
                m => m.discipline === nextDiscipline && 
                !this.state.workUnits.some(wu => wu.currentOwnerId === m.id)
            );
            if (availablePersonInOrigin) {
                availablePersonInOrigin.workRemainingTicks = this._getWorkTicks(availablePersonInOrigin.discipline, workUnit.type);
                workUnit.currentTeamOwnerId = originalTeam.id;
                workUnit.currentOwnerId = availablePersonInOrigin.id;
            } else {
                // Place in original team's backlog
                workUnit.currentTeamOwnerId = originalTeam.id;
            }
        } else {
            // Case 2: Original team CANNOT handle the next step (or originalTeam not found).
            // Search other teams which will be able to handle it at any point, and put it on their backlog.
            // Disregarding  how much work they have already.
            let putOnAnotherTeamBacklog = false;
            for (const team of this.state.teams) {
                if (team.id === originalTeamId) continue; // Skip original team

                if (team.members.some(member => member.discipline === nextDiscipline))
                {
                    workUnit.currentTeamOwnerId = team.id;
                    workUnit.currentOwnerId = null;
                    putOnAnotherTeamBacklog = true;
                    break;
                }
            }

            if (!putOnAnotherTeamBacklog) {
                throw new Error(`Work Unit ${workUnit.id} (${workUnit.type}) could not be assigned. No team has ${nextDiscipline}.`);
            }
        }
      } else {
        this.logEvent(`Work unit ${workUnit.id} (${currentWorkUnitType}) completed by ${person.name}. No further workflow defined.`);
      }
    });

    // 3. Attempt to assign work from backlogs
    this.state.workUnits.forEach(workUnit => {
      if (workUnit.currentTeamOwnerId && !workUnit.currentOwnerId) {

        // This work unit is in a team's backlog
        const teamWithBacklog = this.state.teams.find(t => t.id === workUnit.currentTeamOwnerId);
        if (teamWithBacklog) {

          const discipline = this._getDiscipline(workUnit.type);
          let found = false;

          for (const member of teamWithBacklog.members) {
            if (member.discipline === discipline && !this.state.workUnits.some(wu => wu.currentOwnerId === member.id)) {
                member.workRemainingTicks = this._getWorkTicks(member.discipline, workUnit.type);
                workUnit.currentOwnerId = member.id;
                workUnit.currentTeamOwnerId = member.teamId;
                found = true;
                break;
            }
          }
        }
      }
    });

    // 4. Check if all work units are done
    const allWorkUnitsDone = this.state.workUnits.every(wu => wu.type === 'done');
    if (allWorkUnitsDone) {
      this.logEvent("All work units are done. Simulation complete.");
      return TickState.COMPLETED;
    }

    this.logEvent(`Tick ${this.state.currentTimeTick} ends`);
    return TickState.RUNNING;
  }

  getState(): SimulationState {
    // Return a deep copy to prevent direct modification of internal state
    return JSON.parse(JSON.stringify(this.state));
  }
}

export default OrgSimulation; 