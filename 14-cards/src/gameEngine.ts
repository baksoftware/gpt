// Core game interfaces and types
export interface Card {
  id: string
  name: string
  type: string
}

export interface PlayerState {
  id: string
  name: string
  hand: Card[]
  arenaCards: Card[]
  maxArenaSize: number
}

export interface GameState {
  players: [PlayerState, PlayerState]
  currentPlayerIndex: number
  turn: number
  gameStatus: 'waiting' | 'playing' | 'ended'
  winner?: string
}

export interface GameAction {
  type: 'playCard' | 'removeCard' | 'endTurn'
  playerId: string
  cardId?: string
  position?: number
}

export interface Player {
  id: string
  name: string
  isHuman: boolean
  
  // Called when it's the player's turn to make a decision
  makeMove(gameState: GameState): Promise<GameAction | null>
  
  // Called when game state changes (for UI updates, AI learning, etc.)
  onGameStateChanged(gameState: GameState): void
  
  // Called when the game ends
  onGameEnded(gameState: GameState, isWinner: boolean): void
}

export class GameEngine {
  private gameState: GameState
  private players: Map<string, Player>
  private eventListeners: ((gameState: GameState) => void)[]

  constructor() {
    this.players = new Map()
    this.eventListeners = []
    this.gameState = this.createInitialGameState()
  }

  // Initialize the game with two players
  initializeGame(playerA: Player, playerB: Player): void {
    this.players.set(playerA.id, playerA)
    this.players.set(playerB.id, playerB)
    
    this.gameState = {
      players: [
        this.createPlayerState(playerA),
        this.createPlayerState(playerB)
      ],
      currentPlayerIndex: 0,
      turn: 1,
      gameStatus: 'playing'
    }

    // Deal initial cards
    this.dealInitialCards()
    this.notifyStateChanged()
  }

  // Execute a game action
  executeAction(action: GameAction): boolean {
    const player = this.players.get(action.playerId)
    if (!player) return false

    const playerState = this.getPlayerState(action.playerId)
    if (!playerState) return false

    let success = false

    switch (action.type) {
      case 'playCard':
        success = this.playCard(action.playerId, action.cardId!, action.position)
        break
      case 'removeCard':
        success = this.removeCard(action.playerId, action.cardId!)
        break
      case 'endTurn':
        success = this.endTurn(action.playerId)
        break
    }

    if (success) {
      this.checkGameEnd()
      this.notifyStateChanged()
    }

    return success
  }

  // Play a card from hand to arena
  private playCard(playerId: string, cardId: string, position?: number): boolean {
    const playerState = this.getPlayerState(playerId)
    if (!playerState) return false

    // Check if it's the player's turn
    if (this.gameState.players[this.gameState.currentPlayerIndex].id !== playerId) {
      return false
    }

    // Check if arena is full
    if (playerState.arenaCards.length >= playerState.maxArenaSize) {
      return false
    }

    // Find card in hand
    const cardIndex = playerState.hand.findIndex(card => card.id === cardId)
    if (cardIndex === -1) return false

    // Remove card from hand and add to arena
    const card = playerState.hand.splice(cardIndex, 1)[0]
    
    // Insert at specific position if provided, otherwise add to end
    if (position !== undefined && position >= 0 && position <= playerState.arenaCards.length) {
      playerState.arenaCards.splice(position, 0, card)
    } else {
      playerState.arenaCards.push(card)
    }

    return true
  }

  // Remove a card from arena
  private removeCard(playerId: string, cardId: string): boolean {
    const playerState = this.getPlayerState(playerId)
    if (!playerState) return false

    // Check if it's the player's turn
    if (this.gameState.players[this.gameState.currentPlayerIndex].id !== playerId) {
      return false
    }

    // Find and remove card from arena
    const cardIndex = playerState.arenaCards.findIndex(card => card.id === cardId)
    if (cardIndex === -1) return false

    playerState.arenaCards.splice(cardIndex, 1)
    return true
  }

  // End current player's turn
  private endTurn(playerId: string): boolean {
    if (this.gameState.players[this.gameState.currentPlayerIndex].id !== playerId) {
      return false
    }

    // Switch to next player
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % 2
    
    // Increment turn counter when it comes back to player 0
    if (this.gameState.currentPlayerIndex === 0) {
      this.gameState.turn++
    }

    return true
  }

  // Get current game state (read-only copy)
  getGameState(): GameState {
    return JSON.parse(JSON.stringify(this.gameState))
  }

  // Get current player
  getCurrentPlayer(): Player | undefined {
    const currentPlayerState = this.gameState.players[this.gameState.currentPlayerIndex]
    return this.players.get(currentPlayerState.id)
  }

  // Add event listener for game state changes
  addEventListener(listener: (gameState: GameState) => void): void {
    this.eventListeners.push(listener)
  }

  // Process the current player's turn
  async processCurrentPlayerTurn(): Promise<void> {
    if (this.gameState.gameStatus !== 'playing') return

    const currentPlayer = this.getCurrentPlayer()
    if (!currentPlayer) return

    try {
      const action = await currentPlayer.makeMove(this.getGameState())
      if (action) {
        this.executeAction(action)
      }
    } catch (error) {
      console.error('Error processing player turn:', error)
    }
  }

  // Helper methods
  private createInitialGameState(): GameState {
    return {
      players: [
        { id: '', name: '', hand: [], arenaCards: [], maxArenaSize: 6 },
        { id: '', name: '', hand: [], arenaCards: [], maxArenaSize: 6 }
      ],
      currentPlayerIndex: 0,
      turn: 1,
      gameStatus: 'waiting'
    }
  }

  private createPlayerState(player: Player): PlayerState {
    return {
      id: player.id,
      name: player.name,
      hand: [],
      arenaCards: [],
      maxArenaSize: 6
    }
  }

  private dealInitialCards(): void {
    const cardTypes = ['card1', 'card2', 'card3', 'card4', 'card5']
    
    // Deal 7 cards to each player
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 7; j++) {
        const cardType = cardTypes[j % cardTypes.length]
        const card: Card = {
          id: `${this.gameState.players[i].id}_${cardType}_${j}`,
          name: cardType,
          type: cardType
        }
        this.gameState.players[i].hand.push(card)
      }
    }
  }

  private getPlayerState(playerId: string): PlayerState | undefined {
    return this.gameState.players.find(p => p.id === playerId)
  }

  private checkGameEnd(): void {
    // Simple win condition: first player to play all cards wins
    for (const playerState of this.gameState.players) {
      if (playerState.hand.length === 0) {
        this.gameState.gameStatus = 'ended'
        this.gameState.winner = playerState.id
        
        // Notify players of game end
        for (const [playerId, player] of this.players) {
          player.onGameEnded(this.getGameState(), playerId === playerState.id)
        }
        break
      }
    }
  }

  private notifyStateChanged(): void {
    const gameState = this.getGameState()
    
    // Notify all players
    for (const player of this.players.values()) {
      player.onGameStateChanged(gameState)
    }
    
    // Notify external listeners
    for (const listener of this.eventListeners) {
      listener(gameState)
    }
  }
} 