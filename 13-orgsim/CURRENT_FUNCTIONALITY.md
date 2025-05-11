# Current Project Functionality Overview

This document outlines the features implemented in the organizational simulation project as of the current state.

## I. Simulation Engine (`src/simulation/`)

The core simulation logic is written in TypeScript and is designed to be decoupled from the visualization.

### 1. Configuration & Initialization
- **JSON Configuration**: The simulation loads its entire setup from a `simulationConfig.json` file located in `public/data/`.
  - **Configurable Elements**:
    - `teams`: Defines team structures (ID, name, customer team flag).
    - `people`: Defines individuals with ID, name, `discipline` (e.g., 'software developer', 'designer'), and their `initialTeamName`.
    - `initialWorkUnits`: Specifies the starting work items, each with an ID, `type` (e.g., 'need', 'design').
    - `personWorkTicks`: A nested object defining how many time ticks (hours) each `discipline` takes to complete each `WorkUnitType`.
    - `workFlow`: Defines the sequence of work. For each `WorkUnitType`, it specifies the `nextType` it transitions to and the `targetDiscipline` required for that next step.
- **State Management**:
  - The simulation maintains an internal `SimulationState` which includes:
    - A list of all `teams` and their `members`.
    - A list of all `workUnits`.
    - The `currentTimeTick`.
    - An `eventLog` tracking significant occurrences.
  - A `getState()` method provides a deep copy of the current state for external use (e.g., by the visualization).
- **Dynamic Initial Assignment**:
  - When initialized, the simulation assigns `initialWorkUnits` based on the `workFlow` configuration.
  - It looks for the `targetDiscipline` required for the work unit's initial type and assigns it to the first available (not currently working) person of that discipline across any team.
  - If no individual is free, the work unit is placed into the backlog of the first team found that contains members of the required discipline.
  - Logs are generated for assignments or if a work unit cannot be initially placed.

### 2. Simulation Tick Cycle
- **Discrete Time Ticks**: The simulation proceeds in discrete time steps (ticks), where each tick typically represents one hour.
- **Work Processing**:
  - For each person currently assigned a `WorkUnit`, their `workRemainingTicks` for that unit is decremented.
- **Work Completion & Transition**:
  - When a person's `workRemainingTicks` for a unit reaches zero:
    1.  The person is marked as free.
    2.  The `WorkUnit`'s type is updated to its `nextType` as defined in the `workFlow`.
    3.  The simulation attempts to assign this transitioned `WorkUnit` to an available person of the `nextStep.targetDiscipline` (globally across all teams).
    4.  The `workRemainingTicks` for the newly assigned person are set based on their discipline and the new work unit type (from `personWorkTicks` in config).
- **Backlog Management**:
  - If a transitioned `WorkUnit` cannot be immediately assigned to a free person of the required discipline, it's placed into a suitable team's backlog (a team that has members of the target discipline).
  - In each tick, after processing direct completions/transitions, the simulation attempts to assign `WorkUnits` from team backlogs to available members of that team who match the required discipline for the work unit's current type.
- **Event Logging**: Detailed logs for events like initialization, tick start/end, work unit assignment, completion, transition, and backlog movements are recorded.

### 3. API & Structure
- **`SimulationAPI` Interface**: Defines the contract for interacting with the simulation (`initialize`, `tick`, `getState`, `loadConfigAndInitialize`).
- **Singleton Pattern**: The `OrgSimulation` class uses a singleton pattern (`getInstance()`) to ensure a single instance manages the simulation state.

## II. Visualization (`src/components/Visualization.tsx`)

The visualization is a React component that uses PixiJS (via `react-pixi-fiber` or a similar React-Pixi binding) to render the simulation state.

### 1. UI Controls
- **Load/Reset Simulation Button**: Fetches data from `public/data/simulationConfig.json` and initializes/re-initializes the simulation through the `SimulationAPI`. Clears any ongoing PixiJS rendering.
- **Run/Pause Simulation Button**: Toggles the automatic advancement of simulation ticks.
  - When running, `simApi.tick()` is called every 1 second, and the display updates.

### 2. Textual State Display
- **Current Tick**: Shows the current simulation time.
- **Entity Counts**: Displays the number of teams and work units.
- **Work Unit Status**: Provides a list of all work units, showing:
  - ID and Type.
  - Current Location (e.g., "Assigned to [Person Name] ([Discipline]) on Team [Team Name]" or "Backlog of Team [Team Name]").
- **Event Log**: A scrollable view of the `eventLog` from the `SimulationState`.

### 3. PixiJS Canvas Rendering
- **Pixi Stage**: A PixiJS stage hosts the rendering.
- **Elements**:
  - **Teams**: Rendered as circles. Customer teams might have a distinct appearance.
  - **People**: Rendered as smaller circles, positioned within their team circle. Colors could be based on their `discipline`.
  - **Work Units**: Rendered as small circles. Colors could be based on their `type`.
  - Labels might display names/IDs.
- **Layout**:
  - Basic positioning logic to place people within their teams and arrange teams on the stage.
  - Work units are positioned based on their current assignment (e.g., near a person or in a team's backlog area).
- **Dynamic Updates**: The PixiJS stage updates reactively whenever the `simState` from the simulation engine changes (i.e., after each tick when running, or after load/reset). 