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
          currentWorkUnitId: null,
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
        payload: wuConfig.payload,
        currentOwnerId: null,
        currentTeamOwnerId: null,
        history: [{
            personId: null,
            teamId: 'unassigned_initial', // Default, will be updated
            completedAtTick: 0,
            action: `Created with type ${wuConfig.type}`
        }],
      };

      const flowEntry = this.config?.workFlow[workUnit.type];
      if (flowEntry && flowEntry.targetDiscipline) {
        const targetDiscipline = flowEntry.targetDiscipline;

         
        // If no free person, try to place in backlog of a suitable team
        const suitableBacklogTeam = this.state.teams.find(t => t.members.some(m => m.discipline === targetDiscipline));
        if (suitableBacklogTeam) {
        workUnit.currentTeamOwnerId = suitableBacklogTeam.id;
        workUnit.history[0].teamId = suitableBacklogTeam.id; // Update history
        this.logEvent(`Initial Work Unit ${workUnit.id} (${workUnit.type}) placed in backlog of ${suitableBacklogTeam.name}. No available ${targetDiscipline}.`);
        workUnit.history.push({
            personId: null, teamId: suitableBacklogTeam.id, completedAtTick: 0,
            action: `Initial: To backlog, awaiting ${targetDiscipline}`
        });
        } else {
        this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) could not be assigned. No free ${targetDiscipline} and no team has this discipline for backlog.`);
        workUnit.history[0].action += ` - Unassignable (no ${targetDiscipline} available/no suitable team backlog)`;
        }

      } else {
        this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) has no defined targetDiscipline in workFlow or workFlow entry is missing. Cannot be initially assigned by flow.`);
        workUnit.history[0].action += ` - Unassignable (no workflow for type ${workUnit.type})`;
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
    if (!this.config || !this.config.personWorkTicks) {
        this.logEvent(`Config Error: personWorkTicks not found. Using default 10 for ${workUnitType} by ${personDiscipline}.`);
        return 10;
    }
    const ticksForDiscipline = this.config.personWorkTicks[personDiscipline];
    if (ticksForDiscipline && typeof ticksForDiscipline[workUnitType] === 'number') {
        return ticksForDiscipline[workUnitType];
    }
    
    // Fallback to a configured default for 'software developer' / 'task'
    const defaultDeveloperTaskTicks = this.config.personWorkTicks['software developer']?.['task'];
    if (typeof defaultDeveloperTaskTicks === 'number') {
        this.logEvent(`Work Ticks: No specific value for ${personDiscipline}/${workUnitType}. Using default 'software developer'/'task' ticks: ${defaultDeveloperTaskTicks}.`);
        return defaultDeveloperTaskTicks;
    }

    this.logEvent(`Work Ticks: Critical - No specific or default work ticks for ${personDiscipline}/${workUnitType}. Using hardcoded 10.`);
    return 10; // Final hardcoded fallback
  }

  private _assignWorkUnitToPerson(person: Person, workUnit: WorkUnit, assignmentType: 'direct' | 'global' | 'backlog'): void {
    person.currentWorkUnitId = workUnit.id;
    person.workRemainingTicks = this._getWorkTicks(person.discipline, workUnit.type);

    workUnit.currentOwnerId = person.id;
    workUnit.currentTeamOwnerId = person.teamId;

    const team = this.state.teams.find(t => t.id === person.teamId);
    const teamName = team ? team.name : "Unknown Team";

    let logMessageActionPart = "";
    let historyActionDescription = "";

    switch (assignmentType) {
        case 'direct':
            logMessageActionPart = `assigned`;
            historyActionDescription = `Assigned to ${person.name} (${person.discipline})`;
            break;
        case 'global':
            logMessageActionPart = `assigned (global pool)`;
            historyActionDescription = `Assigned (global pool) to ${person.name} (${person.discipline})`;
            break;
        case 'backlog':
            logMessageActionPart = `picked from backlog`;
            historyActionDescription = `Assigned from backlog to ${person.name} (${person.discipline})`;
            break;
    }

    this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) ${logMessageActionPart} to ${person.name} in ${teamName}. Ticks: ${person.workRemainingTicks}`);
    
    workUnit.history.push({
        personId: person.id,
        teamId: person.teamId,
        completedAtTick: this.state.currentTimeTick,
        action: historyActionDescription
    });
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
            if (person.currentWorkUnitId && person.workRemainingTicks > 0) {
                person.workRemainingTicks--;
                if (person.workRemainingTicks === 0) {
                    const completedWorkUnit = this.state.workUnits.find(wu => wu.id === person.currentWorkUnitId);
                    if (completedWorkUnit) {
                        this.logEvent(`${person.name} from ${team.name} completed work on ${completedWorkUnit.id} (${completedWorkUnit.type}).`);
                        completedWorkUnit.history.push({
                            personId: person.id,
                            teamId: person.teamId,
                            completedAtTick: this.state.currentTimeTick,
                            action: `Completed ${completedWorkUnit.type}`
                        });
                        completedTasksThisTick.push({ person, workUnit: completedWorkUnit });
                    } else {
                        this.logEvent(`Error: ${person.name} finished work, but work unit ${person.currentWorkUnitId} not found.`);
                        person.currentWorkUnitId = null; // Clear invalid task
                    }
                }
            }
        });
    });

    // 2. Process completed tasks: Transition work units and free up people
    completedTasksThisTick.forEach(({ person, workUnit }) => {
      const currentWorkUnitType = workUnit.type;
      const nextStep = this.config!.workFlow[currentWorkUnitType];

      person.currentWorkUnitId = null; // Person is now free
      workUnit.currentOwnerId = null;
      workUnit.currentTeamOwnerId = null; // Clear team ownership, will be reassigned or put in backlog

      if (nextStep) {
        workUnit.type = nextStep.nextType;
        this.logEvent(`Work unit ${workUnit.id} transitioned from ${currentWorkUnitType} to ${workUnit.type}. Target: ${nextStep.targetDiscipline}`);
        workUnit.history.push({
          personId: person.id, // Person who completed previous step
          teamId: person.teamId,
          completedAtTick: this.state.currentTimeTick,
          action: `Transitioned to ${workUnit.type}, targeting ${nextStep.targetDiscipline}`
        });

        let taskPlaced = false;
        const originalTeamId = person.teamId;
        const originalTeam = this.state.teams.find(t => t.id === originalTeamId);

        if (originalTeam && originalTeam.members.some(m => m.discipline === nextStep.targetDiscipline)) {
            // Case 1: Original team CAN handle the next step.
            const availablePersonInOrigin = originalTeam.members.find(
                m => m.discipline === nextStep.targetDiscipline && !m.currentWorkUnitId
            );
            if (availablePersonInOrigin) {
                this._assignWorkUnitToPerson(availablePersonInOrigin, workUnit, 'direct');
                taskPlaced = true;
            } else {
                // Place in original team's backlog
                workUnit.currentTeamOwnerId = originalTeam.id;
                this.logEvent(`Work Unit ${workUnit.id} (${workUnit.type}) stays in ${originalTeam.name}'s backlog (awaiting ${nextStep.targetDiscipline}).`);
                workUnit.history.push({
                    personId: null,
                    teamId: originalTeam.id,
                    completedAtTick: this.state.currentTimeTick,
                    action: `To backlog in ${originalTeam.name} (no free ${nextStep.targetDiscipline})`
                });
                taskPlaced = true;
            }
        } else {
            // Case 2: Original team CANNOT handle the next step (or originalTeam not found).
            // Search other teams for a person.
            let assignedToPersonInOtherTeam = false;
            for (const team of this.state.teams) {
                if (team.id === originalTeamId) continue; // Skip original team

                const targetPersonGlobal = team.members.find(member => member.discipline === nextStep.targetDiscipline && !member.currentWorkUnitId);
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
                    t => t.id !== originalTeamId && t.members.some(m => m.discipline === nextStep.targetDiscipline)
                );
                if (targetTeamForGlobalBacklog) {
                    workUnit.currentTeamOwnerId = targetTeamForGlobalBacklog.id;
                    this.logEvent(`Work Unit ${workUnit.id} (${workUnit.type}) to ${targetTeamForGlobalBacklog.name}'s backlog (global search, no free ${nextStep.targetDiscipline}).`);
                    workUnit.history.push({
                        personId: null,
                        teamId: targetTeamForGlobalBacklog.id,
                        completedAtTick: this.state.currentTimeTick,
                        action: `To backlog in ${targetTeamForGlobalBacklog.name} (global search)`
                    });
                    taskPlaced = true;
                }
            }
        }

        if (!taskPlaced) {
            // If still not placed (e.g., no team anywhere has the discipline).
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) could not be assigned or backlogged. No team has ${nextStep.targetDiscipline}.`);
            workUnit.history.push({
              personId: null,
              teamId: 'none', // Or a specific unassigned ID
              completedAtTick: this.state.currentTimeTick,
              action: `Transition failed: No team for ${nextStep.targetDiscipline}`
            });
          }
      } else {
        this.logEvent(`Work unit ${workUnit.id} (${currentWorkUnitType}) completed. No further workflow defined.`);
        workUnit.history.push({
            personId: person.id, teamId: person.teamId, completedAtTick: this.state.currentTimeTick,
            action: `Workflow ended or undefined`
        });
        // WU is now considered done or stuck, owner is already null
      }
    });

    // 3. Attempt to assign work from backlogs
    this.state.workUnits.forEach(workUnit => {
      if (workUnit.currentTeamOwnerId && !workUnit.currentOwnerId) {
        // This work unit is in a team's backlog
        const teamWithBacklog = this.state.teams.find(t => t.id === workUnit.currentTeamOwnerId);
        if (teamWithBacklog && this.config?.workFlow[workUnit.type]) {
            const targetDisciplineForBacklogItem = this.config.workFlow[workUnit.type]?.targetDiscipline;
            if (!targetDisciplineForBacklogItem) {
                 this.logEvent(`Warning: Work unit ${workUnit.id} in backlog of ${teamWithBacklog.name} has type ${workUnit.type} which has no defined next target discipline in workflow for backlog processing.`);
                 return; // Skip if no clear target discipline for current type to progress
            }

          const availablePersonInTeam = teamWithBacklog.members.find(
            member => member.discipline === targetDisciplineForBacklogItem && !member.currentWorkUnitId
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