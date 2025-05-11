// Simulation types will be defined here

export type Discipline = 'software developer' | 'tester' | 'product manager' | 'designer' | 'customer_representative';

export type WorkUnitType = 'need' | 'design' | 'task' | 'code' | 'release';

export interface Person {
  id: string;
  name: string;
  discipline: Discipline;
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
  type: WorkUnitType;
  currentOwnerId: string | null; // Person currently working on it or team backlog if no specific person
  currentTeamOwnerId: string | null; // Team currently responsible, especially if it's in a backlog
  history: {
    personId: string | null; // Null if it was a team-level action or initial state
    teamId: string;
    completedAtTick: number;
    action: string; // e.g., "completed_design", "assigned_to_developer"
  }[];
  payload?: any; // Could hold specific data for the work unit
}

export type PersonConfigItem = Omit<Person, 'currentWorkUnitId' | 'workRemainingTicks' | 'teamId'> & { initialTeamName: string };

export interface SimulationConfig {
  teams: Omit<Team, 'members'>[]; // Initial team structure without people
  people: PersonConfigItem[];
  initialWorkUnits: Omit<WorkUnit, 'history' | 'currentOwnerId' | 'currentTeamOwnerId'>[];
  personWorkTicks: {
    [key in Discipline]?: { // Optional because customer_representative might not 'work' on items
      [key in WorkUnitType]?: number; // Ticks per work unit type for a discipline
    }
  };
  workFlow: {
    [key in WorkUnitType]?: { nextType: WorkUnitType, targetDiscipline: Discipline };
  }
}

export interface SimulationState {
  teams: Team[];
  workUnits: WorkUnit[];
  currentTimeTick: number;
  eventLog: string[]; // To log major events in the simulation
}

// API Interface for the simulation
export interface SimulationAPI {
  initialize: (config: SimulationConfig) => void;
  tick: () => void;
  getState: () => SimulationState;
  loadConfigAndInitialize: (configPath: string) => Promise<void>;
} 