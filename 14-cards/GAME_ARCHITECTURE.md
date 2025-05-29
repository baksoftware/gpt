# Game Architecture Documentation

## Overview

This project implements a card game with a clean separation between game logic
and visualization. The architecture consists of three main layers:

1. **Game Engine & Logic** (`src/gameEngine.ts`)
2. **Player Implementations** (`src/players/`)
3. **Visualization Layer** (`src/main.ts`)

## Core Components

### Game Engine (`GameEngine` class)

The simulation engine that handles all game logic and data storage:

- **Turn Management**: Tracks current player and turn counter
- **Game State**: Maintains immutable game state with player hands and arena
- **Action Processing**: Validates and executes player actions
- **Win Conditions**: Checks for game end conditions
- **Event System**: Notifies players and UI of state changes

### Player Interface

All players (human and AI) implement the same `Player` interface:

```typescript
interface Player {
    id: string;
    name: string;
    isHuman: boolean;

    makeMove(gameState: GameState): Promise<GameAction | null>;
    onGameStateChanged(gameState: GameState): void;
    onGameEnded(gameState: GameState, isWinner: boolean): void;
}
```

### Game Actions

Players can perform these actions:

- **playCard**: Move a card from hand to arena
- **removeCard**: Remove a card from arena
- **endTurn**: End current player's turn

### Player Implementations

#### HumanPlayer (`src/players/HumanPlayer.ts`)

- Waits for UI interactions (drag & drop, clicks)
- Uses promise-based system to bridge UI events to game engine
- Includes turn timeout (30 seconds)
- Provides methods for UI to submit actions

#### AIPlayer (`src/players/AIPlayer.ts`)

- Three difficulty levels: easy, medium, hard
- Simulated thinking time based on difficulty
- Basic strategy system:
  - Prioritizes playing cards over removing them
  - Different positioning strategies per difficulty
  - Center-outward placement (medium/hard)

## Game Flow

1. **Initialization**: Game engine creates players and initial game state
2. **Game Loop**:
   - Get current player
   - Call `player.makeMove(gameState)`
   - Process returned action
   - Update game state
   - Notify all players of changes
   - Check win conditions
   - Continue to next player

3. **UI Updates**: Visualization layer listens to game state changes and updates
   display

## Visualization Layer

The visualization is completely separate from game logic:

- **Human Cards**: Bottom row, face-up, interactive (drag & drop)
- **AI Cards**: Top row, face-down, non-interactive
- **Arena**: Center area where played cards appear
- **Drag & Drop**: Human player can drag cards to arena
- **Click to Remove**: Players can click arena cards to remove them

## Key Design Principles

1. **Separation of Concerns**: Game logic is independent of visualization
2. **Player Agnostic**: Engine treats all players equally
3. **Immutable State**: Game state is read-only, changes via actions only
4. **Event-Driven**: UI reacts to game state changes, not direct manipulation
5. **Async Actions**: All player moves are asynchronous to support both human
   input and AI thinking

## Extending the Game

To add new features:

- **New Actions**: Add to `GameAction` interface and implement in engine
- **New Player Types**: Implement `Player` interface
- **Game Rules**: Modify validation logic in `GameEngine`
- **UI Features**: Update visualization layer while keeping game logic separate

## Current Game Rules

- Each player starts with 7 cards
- Maximum 6 cards in arena per player
- First player to empty their hand wins
- Players alternate turns
- Arena cards can be removed by clicking (on player's turn)
