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

const MAX_BACKLOG_SIZE = 1;

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

  private _getTeamBacklogCount(teamId: string): number {
    return this.state.workUnits.filter(wu => 
      wu.currentTeamOwnerId === teamId && 
      wu.currentOwnerId === null
    ).length;
  }

  private initializeWorkTypeDisciplineMap(): void {
    this._workTypeDisciplineMap = {};
    Object.keys(this.config!.personWorkTicks).forEach((discipline) => {
      Object.keys(this.config!.personWorkTicks[discipline]).forEach(workUnitType => {
        this._workTypeDisciplineMap[workUnitType] = discipline;
      });
    });    
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

        const suitableTeams = this.state.teams.filter(t => 
          t.members.some(m => m.discipline === nextDiscipline)
        ).sort((a, b) => {
          // Count items already in team's backlog (from previously processed work units)
          const aCount = this.state.workUnits.filter(wu => 
            wu.currentTeamOwnerId === a.id && wu.currentOwnerId === null
          ).length;
          const bCount = this.state.workUnits.filter(wu => 
            wu.currentTeamOwnerId === b.id && wu.currentOwnerId === null
          ).length;
          return aCount - bCount; // Sort by lowest backlog count
        });

        if (suitableTeams.length > 0) {
          const suitableBacklogTeam = suitableTeams[0];
          // Only assign if team has fewer than MAX_BACKLOG_SIZE items in backlog
          const backlogCount = this.state.workUnits.filter(wu => 
            wu.currentTeamOwnerId === suitableBacklogTeam.id && wu.currentOwnerId === null
          ).length;
          
          if (backlogCount < MAX_BACKLOG_SIZE) {
            workUnit.currentTeamOwnerId = suitableBacklogTeam.id;
            this.logEvent(`Initial Work Unit ${workUnit.id} (${workUnit.type}) placed in backlog of ${suitableBacklogTeam.name} (awaiting ${nextDiscipline}).`);
          } else {
            this.logEvent(`Initial Work Unit ${workUnit.id} (${workUnit.type}) not assigned - ${suitableBacklogTeam.name} already has ${MAX_BACKLOG_SIZE} items in backlog.`);
          }
        } else {
          this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) could not be assigned. No team has ${nextDiscipline} for backlog. Marked as unassignable.`);
        }

      } else {
        this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) has no defined nextDiscipline in workFlow or workFlow entry is missing. Cannot be initially assigned by flow. Marked as unassignable.`);
      }
      return workUnit;
    });

    this.logEvent("Teams, people, and initial work units processed.");
  }

  private logEvent(message: string): void {
    // console.log(`[SIM_LOG T-${this.state.currentTimeTick}] ${message}`);
    this.state.eventLog.push(`[T-${this.state.currentTimeTick}] ${message}`);
  }
  
  private _getWorkTicks(discipline: string, workUnitType: string): number {

    const ticksForDiscipline = this.config!.personWorkTicks[discipline];
    if (ticksForDiscipline && typeof ticksForDiscipline[workUnitType] === 'number') {
        return ticksForDiscipline[workUnitType] + Math.floor(Math.random() * 3);
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
      const nextStep = this.config!.workFlow[currentWorkUnitType]!;

      workUnit.currentOwnerId = null;
      workUnit.type = nextStep.nextType;
      workUnit.currentTeamOwnerId = null;

      if (nextStep && nextStep.nextType === 'done') {

        this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) completed by ${person.name}.`);

      } else {
        // Does the current team have people with the right discipline?
        const discipline = this._getDiscipline(workUnit.type);
        const originalTeamId = person.teamId;
        const originalTeam = this.state.teams.find(t => t.id === originalTeamId);

        if (originalTeam && originalTeam.members.some(m => m.discipline === discipline)) {
            // Case 1: Original team CAN handle the next step.
            workUnit.currentTeamOwnerId = originalTeam.id;

        } else {
            // Case 2: Original team CANNOT handle the next step (or originalTeam not found).
            this._findAlternativeTeam(workUnit, discipline, originalTeamId);
        }
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
                this.logEvent(`${member.name} from ${teamWithBacklog.name} started work on ${workUnit.id} (${workUnit.type}).`);
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

    // 5. Check if any work units are unassigned
    const anyWorkUnitsUnassigned = this.state.workUnits.find(wu => wu.currentTeamOwnerId === null && wu.type !== 'done');
    if (anyWorkUnitsUnassigned) {
      console.log("Some work units are unassigned. Simulation not complete.", anyWorkUnitsUnassigned);
      this.logEvent("Some work units are unassigned. Simulation not complete.");
      return TickState.RUNNING;
    }

    this.logEvent(`Tick ${this.state.currentTimeTick} ends`);
    return TickState.RUNNING;
  }

  getState(): SimulationState {
    // Return a deep copy to prevent direct modification of internal state
    return JSON.parse(JSON.stringify(this.state));
  }

  private _findAlternativeTeam(workUnit: WorkUnit, nextDiscipline: string, originalTeamId: string): void {
    // put the item on the backlog of the team which has the correct discipline, and which has the fewest items in backlog

    const eligibleTeams = this.state.teams
      .filter(team => 
        team.id !== originalTeamId && 
        team.members.some(member => member.discipline === nextDiscipline)
      )
      .sort((a, b) => this._getTeamBacklogCount(a.id) - this._getTeamBacklogCount(b.id));

    if (eligibleTeams.length > 0) {
        
      // Choose team with smallest backlog
      const targetTeam = eligibleTeams[0];
      workUnit.currentTeamOwnerId = targetTeam.id;
      this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) placed in ${targetTeam.name}'s backlog.`);

    } else {
      this.logEvent(`Work Unit ${workUnit.id} (${workUnit.type}) could not be assigned. No team has ${nextDiscipline}.`);
      workUnit.currentTeamOwnerId = null;
    }
  }
}

export default OrgSimulation; 