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
        let assignedPerson: Person | undefined;
        let assignedTeam: Team | undefined;

        // Try to find a free person with the target discipline in any team
        for (const team of this.state.teams) {
          assignedPerson = team.members.find(p => p.discipline === targetDiscipline && !p.currentWorkUnitId);
          if (assignedPerson) {
            assignedTeam = team;
            break;
          }
        }

        if (assignedPerson && assignedTeam) {
          assignedPerson.currentWorkUnitId = workUnit.id;
          const workTicksConfig = this.config?.personWorkTicks?.[assignedPerson.discipline]?.[workUnit.type];
          assignedPerson.workRemainingTicks = typeof workTicksConfig === 'number' ? workTicksConfig : 10; // Default ticks

          workUnit.currentOwnerId = assignedPerson.id;
          workUnit.currentTeamOwnerId = assignedTeam.id;
          workUnit.history[0].teamId = assignedTeam.id; // Update history

          this.logEvent(`Initial Work Unit ${workUnit.id} (${workUnit.type}) assigned to ${assignedPerson.name} (${targetDiscipline}) in ${assignedTeam.name}. Ticks: ${assignedPerson.workRemainingTicks}`);
          workUnit.history.push({
            personId: assignedPerson.id,
            teamId: assignedTeam.id,
            completedAtTick: 0,
            action: `Initially assigned to ${assignedPerson.name} (${assignedPerson.discipline})`
          });
        } else {
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
        }
      } else {
        this.logEvent(`Warning: Initial Work Unit ${workUnit.id} (${workUnit.type}) has no defined targetDiscipline in workFlow or workFlow entry is missing. Cannot be initially assigned by flow.`);
        workUnit.history[0].action += ` - Unassignable (no workflow for type ${workUnit.type})`;
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

        // Attempt to assign to a new person
        let assigned = false;
        for (const team of this.state.teams) {
          // Prioritize assigning to the same team if the discipline matches
          const targetPersonInTeam = team.members.find(member => member.discipline === nextStep.targetDiscipline && !member.currentWorkUnitId);
          if (targetPersonInTeam) {
            targetPersonInTeam.currentWorkUnitId = workUnit.id;
            const workTicks = this.config!.personWorkTicks?.[targetPersonInTeam.discipline]?.[workUnit.type];
            targetPersonInTeam.workRemainingTicks = typeof workTicks === 'number' ? workTicks : (this.config!.personWorkTicks?.['software developer']?.['task'] || 10); // Default if not found
            
            workUnit.currentOwnerId = targetPersonInTeam.id;
            workUnit.currentTeamOwnerId = targetPersonInTeam.teamId;
            assigned = true;
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) assigned to ${targetPersonInTeam.name} in ${team.name}. Ticks: ${targetPersonInTeam.workRemainingTicks}`);
            workUnit.history.push({
              personId: targetPersonInTeam.id,
              teamId: targetPersonInTeam.teamId,
              completedAtTick: this.state.currentTimeTick,
              action: `Assigned to ${targetPersonInTeam.name} (${targetPersonInTeam.discipline})`
            });
            break; // Assigned
          }
        }

        if (!assigned) {
          // If no one in the same team, try any team
          for (const team of this.state.teams) {
            if (assigned) break;
            const targetPersonGlobal = team.members.find(member => member.discipline === nextStep.targetDiscipline && !member.currentWorkUnitId);
            if (targetPersonGlobal) {
              targetPersonGlobal.currentWorkUnitId = workUnit.id;
              const workTicks = this.config!.personWorkTicks?.[targetPersonGlobal.discipline]?.[workUnit.type];
              targetPersonGlobal.workRemainingTicks = typeof workTicks === 'number' ? workTicks : (this.config!.personWorkTicks?.['software developer']?.['task'] || 10); // Default
              
              workUnit.currentOwnerId = targetPersonGlobal.id;
              workUnit.currentTeamOwnerId = targetPersonGlobal.teamId;
              assigned = true;
              this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) assigned to ${targetPersonGlobal.name} in ${team.name}. Ticks: ${targetPersonGlobal.workRemainingTicks}`);
              workUnit.history.push({
                personId: targetPersonGlobal.id,
                teamId: targetPersonGlobal.teamId,
                completedAtTick: this.state.currentTimeTick,
                action: `Assigned to ${targetPersonGlobal.name} (${targetPersonGlobal.discipline})`
              });
              break; // Assigned
            }
          }
        }

        if (!assigned) {
          // Place in a backlog of a team that has the target discipline
          const targetTeamForBacklog = this.state.teams.find(t => t.members.some(m => m.discipline === nextStep.targetDiscipline));
          if (targetTeamForBacklog) {
            workUnit.currentTeamOwnerId = targetTeamForBacklog.id;
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) placed in backlog of ${targetTeamForBacklog.name}. No available ${nextStep.targetDiscipline}.`);
            workUnit.history.push({
              personId: null,
              teamId: targetTeamForBacklog.id,
              completedAtTick: this.state.currentTimeTick,
              action: `To backlog, awaiting ${nextStep.targetDiscipline}`
            });
          } else {
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) could not be assigned or backlogged. No team has ${nextStep.targetDiscipline}.`);
             workUnit.history.push({
              personId: null, teamId: 'none', completedAtTick: this.state.currentTimeTick,
              action: `Transition failed: No team for ${nextStep.targetDiscipline}`
            });
          }
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
            availablePersonInTeam.currentWorkUnitId = workUnit.id;
            const workTicks = this.config!.personWorkTicks?.[availablePersonInTeam.discipline]?.[workUnit.type];
            // For backlog items, the type has already transitioned. We need ticks for *this* type.
            availablePersonInTeam.workRemainingTicks = typeof workTicks === 'number' ? workTicks : (this.config!.personWorkTicks?.['software developer']?.['task'] || 10); // Default

            workUnit.currentOwnerId = availablePersonInTeam.id;
            // currentTeamOwnerId is already correct (teamWithBacklog.id)
            this.logEvent(`Work unit ${workUnit.id} (${workUnit.type}) picked from backlog by ${availablePersonInTeam.name} in ${teamWithBacklog.name}. Ticks: ${availablePersonInTeam.workRemainingTicks}`);
            workUnit.history.push({
              personId: availablePersonInTeam.id,
              teamId: availablePersonInTeam.teamId,
              completedAtTick: this.state.currentTimeTick,
              action: `Assigned from backlog to ${availablePersonInTeam.name} (${availablePersonInTeam.discipline})`
            });
          }
        }
      }
    });

    this.logEvent(`Tick ${this.state.currentTimeTick} ends`);
  }

  getState(): SimulationState {
    // Return a deep copy to prevent direct modification of internal state
    return JSON.parse(JSON.stringify(this.state));
  }
}

export default OrgSimulation; 