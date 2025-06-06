import { setRandSeed, getRand } from "./getRand"

// Core game interfaces and types
export interface Card {
  id: string
  name: string
  level: number
  attack: number
  health: number
  maxHealth: number
  specialAbilities?: string[]
}

// Card set data interface
export interface CardSetData {
  cards: Array<{
    id: number
    title: string
    description: string
    level: number
    health: number
    attack: number
    specialEffects: string[]
    imageFileName: string
  }>
}

export interface PlayerState {
  id: string
  name: string
  hand: Card[]
  arenaCards: Card[]
  maxArenaSize: number
  hasPlayedCard: boolean // Track if player has played a card this turn
  hasDrawnCard: boolean // Track if player has drawn a card this turn
}

export interface GameState {
  players: [PlayerState, PlayerState]
  currentPlayerIndex: number
  turn: number
  gameStatus: 'waiting' | 'playing' | 'ended'
  winner?: string
  turnPhase: 'play' | 'combat' | 'end' // Track turn phases
}

export interface GameAction {
  type: 'playCard' | 'removeCard' | 'endTurn' | 'attackCard'
  playerId: string
  cardId?: string
  targetCardId?: string
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
  private players: Map<string, Player> = new Map()
  private eventListeners: Array<(gameState: GameState) => void> = []
  private cardSetData: CardSetData

  constructor() {
    this.gameState = this.createInitialGameState()
    this.cardSetData = { cards: [] }
  }

  // Set card set data
  setCardSetData(cardSetData: CardSetData): void {
    this.cardSetData = cardSetData
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
      gameStatus: 'playing',
      turnPhase: 'play'
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
      case 'attackCard':
        success = this.attackCard(action.playerId, action.cardId!, action.targetCardId!)
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

    // Check if player has already played a card this turn
    if (playerState.hasPlayedCard) {
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

    // Mark that player has played a card this turn
    playerState.hasPlayedCard = true

    return true
  }

  // Attack an opponent's card
  private attackCard(playerId: string, attackerCardId: string, targetCardId: string): boolean {
    const playerState = this.getPlayerState(playerId)
    if (!playerState) return false

    // Check if it's the player's turn
    if (this.gameState.players[this.gameState.currentPlayerIndex].id !== playerId) {
      return false
    }

    // Find attacker card in player's arena
    const attackerCard = playerState.arenaCards.find(card => card.id === attackerCardId)
    if (!attackerCard) return false

    // Find target card in opponent's arena
    const opponentState = this.gameState.players.find(p => p.id !== playerId)
    if (!opponentState) return false

    const targetCard = opponentState.arenaCards.find(card => card.id === targetCardId)
    if (!targetCard) return false

    // Perform combat
    this.performCombat(attackerCard, targetCard, playerState, opponentState)

    return true
  }

  // Perform combat between two cards
  private performCombat(attacker: Card, defender: Card, attackerPlayerState: PlayerState, defenderPlayerState: PlayerState): void {
    console.log(`Combat: ${attacker.name} (${attacker.attack}/${attacker.health}) attacks ${defender.name} (${defender.attack}/${defender.health})`)

    // Deal damage
    defender.health -= attacker.attack
    attacker.health -= defender.attack

    console.log(`After combat: ${attacker.name} (${attacker.health}), ${defender.name} (${defender.health})`)

    // Remove dead cards
    if (attacker.health <= 0) {
      const attackerIndex = attackerPlayerState.arenaCards.indexOf(attacker)
      if (attackerIndex > -1) {
        attackerPlayerState.arenaCards.splice(attackerIndex, 1)
        console.log(`${attacker.name} destroyed!`)
      }
    }

    if (defender.health <= 0) {
      const defenderIndex = defenderPlayerState.arenaCards.indexOf(defender)
      if (defenderIndex > -1) {
        defenderPlayerState.arenaCards.splice(defenderIndex, 1)
        console.log(`${defender.name} destroyed!`)
      }
    }
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

    const currentPlayerState = this.gameState.players[this.gameState.currentPlayerIndex]

    // Always draw a card at end of turn
    const newCard = this.generateRandomCard(playerId)
    currentPlayerState.hand.push(newCard)
    console.log(`${currentPlayerState.name} draws ${newCard.name} at end of turn`)

    // Reset turn flags
    currentPlayerState.hasPlayedCard = false
    currentPlayerState.hasDrawnCard = false

    // Switch to next player
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % 2

    // Increment turn counter when it comes back to player 0
    if (this.gameState.currentPlayerIndex === 0) {
      this.gameState.turn++
    }

    // Reset turn phase to play
    this.gameState.turnPhase = 'play'

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
        { id: '', name: '', hand: [], arenaCards: [], maxArenaSize: 6, hasPlayedCard: false, hasDrawnCard: false },
        { id: '', name: '', hand: [], arenaCards: [], maxArenaSize: 6, hasPlayedCard: false, hasDrawnCard: false }
      ],
      currentPlayerIndex: 0,
      turn: 1,
      gameStatus: 'waiting',
      turnPhase: 'play'
    }
  }

  private createPlayerState(player: Player): PlayerState {
    return {
      id: player.id,
      name: player.name,
      hand: [],
      arenaCards: [],
      maxArenaSize: 6,
      hasPlayedCard: false,
      hasDrawnCard: false
    }
  }

  private dealInitialCards(): void {
    // Deal 4 cards to each player initially
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        const card = this.generateRandomCard(this.gameState.players[i].id)
        this.gameState.players[i].hand.push(card)
      }
    }
  }

  private generateRandomCard(playerId: string): Card {
    const rand = getRand()

    // Use loaded card set data if available
    if (this.cardSetData && this.cardSetData.cards.length > 0) {
      // Select a random card from the cardSet
      const cardTemplate = this.cardSetData.cards[Math.floor(rand() * this.cardSetData.cards.length)]

      // Add some randomization to the stats (±1 to keep it interesting)
      const statVariation = Math.floor(rand() * 3) - 1 // -1, 0, or +1
      const attack = Math.max(1, cardTemplate.attack + statVariation)
      const health = Math.max(1, cardTemplate.health + statVariation)

      const cardId = `${playerId}_${cardTemplate.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.floor(rand() * 1000)}`

      return {
        id: cardId,
        name: cardTemplate.title.toLowerCase().replace(/\s+/g, '_'),
        level: cardTemplate.level,
        attack: attack,
        health: health,
        maxHealth: health,
        specialAbilities: cardTemplate.specialEffects || []
      }
    } else {
      // Fallback cards if cardSet data not available
      const fallbackCards = [
        { name: 'warrior', level: 3, attack: 4, health: 5, abilities: ['Charge'] },
        { name: 'mage', level: 2, attack: 3, health: 3, abilities: ['Spell Power'] },
        { name: 'rogue', level: 2, attack: 5, health: 2, abilities: ['Stealth'] },
        { name: 'paladin', level: 4, attack: 3, health: 6, abilities: ['Divine Shield'] },
        { name: 'archer', level: 1, attack: 2, health: 2, abilities: ['Range'] }
      ]

      const cardTemplate = fallbackCards[Math.floor(rand() * fallbackCards.length)]
      const cardId = `${playerId}_${cardTemplate.name}_${Date.now()}_${Math.floor(rand() * 1000)}`

      return {
        id: cardId,
        name: cardTemplate.name,
        level: cardTemplate.level,
        attack: cardTemplate.attack,
        health: cardTemplate.health,
        maxHealth: cardTemplate.health,
        specialAbilities: cardTemplate.abilities
      }
    }
  }

  private getPlayerState(playerId: string): PlayerState | undefined {
    return this.gameState.players.find(p => p.id === playerId)
  }

  private checkGameEnd(): void {
    // Win condition: opponent has no cards in arena and hand
    for (const playerState of this.gameState.players) {
      const opponentState = this.gameState.players.find(p => p.id !== playerState.id)
      if (opponentState && opponentState.hand.length === 0 && opponentState.arenaCards.length === 0) {
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