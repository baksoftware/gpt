# Hearthstone-Like Card Game Architecture

## Overview

This project implements a **Hearthstone-inspired card game** with a clean
separation between game logic and visualization. The architecture consists of
three main layers:

1. **Game Engine & Logic** (`src/gameEngine.ts`)
2. **Player Implementations** (`src/players/`)
3. **Visualization Layer** (`src/main.ts`)

## 🎮 Game Features

### Card System

- **Card Stats**: Each card has `level`, `attack`, and `health` values
- **Random Generation**: Cards are generated with randomized stats based on
  level (1-5)
- **Visual Display**: Cards show attack/health numbers and level indicators
- **Combat Damage**: Cards lose health when attacked and are destroyed at 0
  health

### Turn-Based Gameplay

- **Turn Indicators**: Clear "YOUR TURN" / "OPPONENT'S TURN" messages
- **One Card Per Turn**: Players can play exactly one card per turn
- **Auto Card Draw**: Players automatically draw a new card at end of turn
- **Manual End Turn**: Green "End Turn" button to advance the game

### Combat System

- **Attack Mechanics**: Click your arena card, then click enemy card to attack
- **Mutual Combat**: Both cards deal damage to each other simultaneously
- **Card Destruction**: Cards with 0 or less health are removed from the arena
- **Visual Selection**: Selected attackers show with highlighting effects

## Core Components

### Game Engine (`GameEngine` class)

The simulation engine that handles all game logic and data storage:

- **Turn Management**: Tracks current player, turn counter, and turn phases
- **Game State**: Maintains immutable game state with player hands and separate
  arenas
- **Action Processing**: Validates and executes player actions (play, attack,
  end turn)
- **Combat Resolution**: Handles card-vs-card combat with damage calculation
- **Win Conditions**: Checks for game end when opponent has no cards
- **Event System**: Notifies players and UI of state changes

### Enhanced Card Interface

```typescript
interface Card {
  id: string;
  name: string;
  type: string;
  level: number; // 1-5, affects card generation
  attack: number; // Damage dealt in combat
  health: number; // Current health
  maxHealth: number; // Original health value
  specialAbilities?: string[];
}
```

### Game Actions

Players can perform these actions:

- **playCard**: Move a card from hand to your arena (once per turn)
- **attackCard**: Attack opponent's card with your arena card
- **endTurn**: End current player's turn and draw a card
- **drawCard**: Manually draw a card (automatic at turn end)

### Player Implementations

#### HumanPlayer (`src/players/HumanPlayer.ts`)

- **UI Interactions**: Drag & drop cards, click to select and attack
- **Promise-based System**: Bridges UI events to game engine
- **Turn Timeout**: 60 seconds for complex decision making
- **Action Methods**: `playCard()`, `attackCard()`, `endTurn()`

#### AIPlayer (`src/players/AIPlayer.ts`)

- **Three Difficulty Levels**: Easy, Medium, Hard
- **Combat AI**: Analyzes favorable trades and strategic attacks
- **Card Evaluation**: Considers attack, health, and level when playing
- **Strategic Positioning**: Smart placement and targeting decisions

**AI Behaviors by Difficulty:**

- **Easy**: Random card play and attacks
- **Medium**: Prefers strong cards, attacks weak enemies
- **Hard**: Looks for favorable trades, strategic card selection

## Game Flow

### Turn Structure

1. **Turn Start**: Player receives turn indicator
2. **Play Phase**:
   - Drag card from hand to center arena to play (optional)
   - Click arena card → click enemy card to attack (optional)
3. **End Phase**: Click "End Turn" or wait for timeout
4. **Card Draw**: Automatically draw new card
5. **Switch Players**: Turn passes to opponent

### Arena Layout

- **Human Arena**: Bottom half of screen (your cards)
- **AI Arena**: Top half of screen (opponent cards)
- **Hand Display**: Human cards at bottom, AI cards at top (face-down)
- **Center Drop Zone**: Drag cards here to play them

## Visualization Layer

The visualization is completely separate from game logic:

### Visual Elements

- **Card Stats Display**: Attack/health numbers on each card
- **Level Indicators**: Gold level number on card corners
- **Turn Indicators**: Large colored text showing whose turn it is
- **End Turn Button**: Green button in bottom-right corner
- **Selection Highlighting**: Selected cards show visual feedback

## Animation and Notification System

### Floating Text Notifications

The game features a comprehensive notification system that provides real-time
feedback for all game events:

- **Card Play Notifications**: Shows card name and type when played
  - Heroes: "Arcane Wizard Enters Battle!" (gold text)
  - Creatures: "Creature Played!" (green text)
- **Damage Indicators**: Red floating numbers showing damage dealt (`-3`, `-5`,
  etc.)
- **Destruction Messages**: Red text announcing card destruction
- **Turn Announcements**: Center screen notifications for turn changes
- **Ability Tooltips**: Gold text showing hero special abilities on hover

### Card Animations

- **Combat Animation**: Attacking cards briefly move toward their target
- **Destruction Effects**: Destroyed cards scale down, fade out, and spin
- **Play Animations**: Cards show immediate visual feedback when played
- **Hover Effects**: Cards lift and scale when hovered, with ability tooltips

### Technical Implementation

The animation system uses:

- **Pixi.js Ticker**: 60fps animation loop for smooth effects
- **Floating Text**: Automatically managed notification lifecycle
- **State Comparison**: Detects game events by comparing previous/current states
- **Visual Feedback**: Immediate response to user actions

All animations are:

- **Performance Optimized**: Efficient cleanup of expired notifications
- **Responsive**: Scale with screen resolution and game scale
- **Non-blocking**: Don't interfere with gameplay mechanics
- **Informative**: Clear communication of game events

### Interactions

- **Drag & Drop**: Human player drags cards from hand to arena
- **Click to Attack**: Click your card, then enemy card to combat
- **Hover Effects**: Cards lift and scale when hovered
- **Visual Feedback**: Animations for all interactions

## Key Design Principles

1. **Separation of Concerns**: Game logic independent of visualization
2. **Player Agnostic**: Engine treats human and AI players equally
3. **Immutable State**: Game state is read-only, changes via actions only
4. **Event-Driven**: UI reacts to game state changes, not direct manipulation
5. **Async Actions**: All player moves are asynchronous for smooth gameplay

## Current Game Rules

### Basic Rules

- Each player starts with 4 random cards
- Maximum 6 cards in arena per player
- Players alternate turns
- One card play per turn maximum
- Automatic card draw at turn end

### Combat Rules

- Cards attack with their attack value
- Both cards take damage simultaneously
- Cards are destroyed when health ≤ 0
- No direct player damage (cards only fight cards)

### Win Condition

- **Victory**: Opponent has no cards in hand AND no cards in arena
- Game continues until one player is completely eliminated

## Card Generation

Cards are randomly generated with:

- **Level**: 1-5 (determines stat ranges)
- **Attack**: Level + 0-5 random bonus
- **Health**: Level + 0-5 random bonus
- **Type**: Random selection from available card images

## Extending the Game

To add new features:

- **New Actions**: Add to `GameAction` interface and implement in engine
- **Special Abilities**: Extend card interface and combat system
- **Player Health**: Add health points and direct attacks
- **Mana System**: Add resource management mechanics
- **Deck Building**: Pre-constructed decks instead of random generation
- **Advanced AI**: Machine learning or more sophisticated strategies

## Technical Implementation

### File Structure

```
src/
├── gameEngine.ts       # Core game logic and state management
├── main.ts            # Pixi.js visualization and UI
├── getRand.ts         # Seeded random number generator
└── players/
    ├── HumanPlayer.ts # Human player implementation
    ├── AIPlayer.ts    # AI player with difficulty levels
    └── index.ts       # Player exports
```

### Dependencies

- **Pixi.js**: Hardware-accelerated 2D graphics
- **TypeScript**: Type-safe development
- **Vite**: Fast development and building

This architecture provides a solid foundation for a strategic card game with
room for extensive gameplay enhancements!
