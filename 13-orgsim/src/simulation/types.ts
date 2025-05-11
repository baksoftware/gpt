// Simulation types will be defined here


export interface Person {
  id: string;
  name: string;
  discipline: string;
  teamId: string;
  currentWorkUnitId: string | null;
  workRemainingTicks: number;
}

export interface Team {
  id: string;
  name: string;
  isCustomerTeam?: boolean; // To identify the customer "team"
  members: Person[];
}

export interface WorkUnit {
  id: string;
  type: string;
  currentOwnerId: string | null; // Person currently working on it or team backlog if no specific person
  currentTeamOwnerId: string | null; // Team currently responsible, especially if it's in a backlog
  backlog: {
    personId: string | null; // Null if it was a team-level action or initial state
    teamId: string;
    completedAtTick: number;
    action: string; // e.g., "completed_design", "assigned_to_developer"
  }[];
}

export type PersonConfigItem = Omit<Person, 'currentWorkUnitId' | 'workRemainingTicks' | 'teamId'> & { initialTeamName: string };

export interface SimulationConfig {
  teams: Omit<Team, 'members'>[]; // Initial team structure without people
  people: PersonConfigItem[];
  initialWorkUnits: Omit<WorkUnit, 'backlog' | 'currentOwnerId' | 'currentTeamOwnerId'>[];
  personWorkTicks: {
    [key in string]?: { // Optional because customer_representative might not 'work' on items
      [key in string]?: number; // Ticks per work unit type for a discipline
    }
  };
  workFlow: {
    [key in string]?: { nextType: string, targetDiscipline: string };
  }
}

export interface SimulationState {
  teams: Team[];
  workUnits: WorkUnit[];
  currentTimeTick: number;
  eventLog: string[]; // To log major events in the simulation
}

export enum TickState {
  RUNNING,
  PAUSED,
  COMPLETED
}

// API Interface for the simulation
export interface SimulationAPI {
  initialize: (config: SimulationConfig) => void;
  tick: () => TickState;
  getState: () => SimulationState;
  loadConfigAndInitialize: (configPath: string) => Promise<void>;
} 