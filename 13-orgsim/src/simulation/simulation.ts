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
      if (flowEntry && flowEntry.nextDiscipline) {
        const nextDiscipline = flowEntry.nextDiscipline;

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

  private _getWorkTicks(personDiscipline: string, workUnitType: string): number {

    const ticksForDiscipline = this.config!.personWorkTicks[personDiscipline];
    if (ticksForDiscipline && typeof ticksForDiscipline[workUnitType] === 'number') {
        return ticksForDiscipline[workUnitType] + Math.floor(Math.random() * 10);
    }
    
    this.logEvent(`Work Ticks: Critical - No specific or default work ticks for ${personDiscipline}/${workUnitType}. Using hardcoded 1000.`);
    return 1000; // Final hardcoded fallback
  }

  private _assignWorkUnitToPerson(person: Person, workUnit: WorkUnit, assignmentType: 'direct' | 'global' | 'backlog'): void {
    person.workRemainingTicks = this._getWorkTicks(person.discipline, workUnit.type);

    workUnit.currentOwnerId = person.id;
    workUnit.currentTeamOwnerId = person.teamId;

    const team = this.state.teams.find(t => t.id === person.teamId);
    const teamName = team ? team.name : "Unknown Team";

    let logMessageActionPart = "";
    let backlogActionDescription = "";

    switch (assignmentType) {
        case 'direct':
            logMessageActionPart = `assigned`;
            backlogActionDescription = `Assigned to ${person.name} (${person.discipline})`;
            break;
        case 'global':
            logMessageActionPart = `assigned (global pool)`;
            backlogActionDescription = `Assigned (global pool) to ${person.name} (${person.discipline})`;
            break;
        case 'backlog':
            logMessageActionPart = `picked from backlog`;
            backlogActionDescription = `Assigned from backlog to ${person.name} (${person.discipline})`;
            break;
    }

    this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) ${logMessageActionPart} to ${person.name} in ${teamName}. Ticks: ${person.workRemainingTicks}`);
  }
  
  // Placeholder for tick
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
        const previousType = workUnit.type;
        workUnit.type = nextStep.nextType;
        this.logEvent(`Work unit ${workUnit.id} transitioned from ${previousType} to ${workUnit.type}. Target: ${nextStep.nextDiscipline}. Completed by ${person.name}.`);

        let taskPlaced = false;
        const originalTeamId = person.teamId;
        const originalTeam = this.state.teams.find(t => t.id === originalTeamId);

        if (originalTeam && originalTeam.members.some(m => m.discipline === nextStep.nextDiscipline)) {
            // Case 1: Original team CAN handle the next step.
            const availablePersonInOrigin = originalTeam.members.find(
                m => m.discipline === nextStep.nextDiscipline && !this.state.workUnits.some(wu => wu.currentOwnerId === m.id)
            );
            if (availablePersonInOrigin) {
                this._assignWorkUnitToPerson(availablePersonInOrigin, workUnit, 'direct');
                taskPlaced = true;
            } else {
                // Place in original team's backlog
                workUnit.currentTeamOwnerId = originalTeam.id;
                this.logEvent(`Work Unit ${workUnit.id} (${workUnit.type}) stays in ${originalTeam.name}'s backlog (awaiting ${nextStep.nextDiscipline}).`);
                taskPlaced = true;
            }
        } else {
            // Case 2: Original team CANNOT handle the next step (or originalTeam not found).
            // Search other teams for a person.
            let assignedToPersonInOtherTeam = false;
            for (const team of this.state.teams) {
                if (team.id === originalTeamId) continue; // Skip original team

                const targetPersonGlobal = team.members.find(
                    member => member.discipline === nextStep.nextDiscipline && !this.state.workUnits.some(wu => wu.currentOwnerId === member.id)
                );
                if (targetPersonGlobal) {
                    this._assignWorkUnitToPerson(targetPersonGlobal, workUnit, 'global');
                    assignedToPersonInOtherTeam = true;
                    taskPlaced = true;
                    break;
                }
            }

            if (!assignedToPersonInOtherTeam) {
                // No free person in other teams, search for backlog in other teams.
                const targetTeamForGlobalBacklog = this.state.teams.find(
                    t => t.id !== originalTeamId && t.members.some(m => m.discipline === nextStep.nextDiscipline)
                );
                if (targetTeamForGlobalBacklog) {
                    workUnit.currentTeamOwnerId = targetTeamForGlobalBacklog.id;
                    this.logEvent(`Work Unit ${workUnit.id} (${workUnit.type}) to ${targetTeamForGlobalBacklog.name}'s backlog (global search, no free ${nextStep.nextDiscipline}).`);
                    taskPlaced = true;
                }
            }
        }

        if (!taskPlaced) {
            // If still not placed (e.g., no team anywhere has the discipline).
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) could not be assigned or backlogged. No team has ${nextStep.nextDiscipline}. Marked as unassigned.`);
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
        if (teamWithBacklog && this.config?.workFlow[workUnit.type]) {
            const nextDisciplineForBacklogItem = this.config.workFlow[workUnit.type]?.nextDiscipline;
            if (!nextDisciplineForBacklogItem) {
                 this.logEvent(`Warning: Work unit ${workUnit.id} in backlog of ${teamWithBacklog.name} has type ${workUnit.type} which has no defined next target discipline in workflow for backlog processing.`);
                 return; // Skip if no clear target discipline for current type to progress
            }

          const availablePersonInTeam = teamWithBacklog.members.find(
            member => member.discipline === nextDisciplineForBacklogItem && !this.state.workUnits.some(wu => wu.currentOwnerId === member.id)
          );

          if (availablePersonInTeam) {
            this._assignWorkUnitToPerson(availablePersonInTeam, workUnit, 'backlog');
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