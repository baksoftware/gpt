import { Player, GameState, GameAction, PlayerState } from '../gameEngine'

export class AIPlayer implements Player {
  id: string
  name: string
  isHuman = false
  
  private difficulty: 'easy' | 'medium' | 'hard'
  private thinkingTime: number

  constructor(id: string, name: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.id = id
    this.name = name
    this.difficulty = difficulty
    
    // AI thinking time based on difficulty
    this.thinkingTime = {
      easy: 1000,
      medium: 1500,
      hard: 2000
    }[difficulty]
  }

  // Called when it's the AI's turn to make a decision
  async makeMove(gameState: GameState): Promise<GameAction | null> {
    console.log(`🤖 ${this.name} is thinking...`)
    
    // Simulate thinking time
    await this.sleep(this.thinkingTime)

    const myPlayerState = this.getMyPlayerState(gameState)
    if (!myPlayerState) return null

    // AI decision making logic
    const action = this.decideAction(gameState, myPlayerState)
    
    if (action) {
      console.log(`🤖 ${this.name} decides to:`, action.type, action.cardId || '')
    }
    
    return action
  }

  // AI decision making logic
  private decideAction(gameState: GameState, myPlayerState: PlayerState): GameAction | null {
    // Strategy 1: Try to play a card if arena isn't full
    if (myPlayerState.arenaCards.length < myPlayerState.maxArenaSize && myPlayerState.hand.length > 0) {
      const cardToPlay = this.selectCardToPlay(myPlayerState)
      if (cardToPlay) {
        const position = this.selectPlayPosition(myPlayerState)
        return {
          type: 'playCard',
          playerId: this.id,
          cardId: cardToPlay.id,
          position
        }
      }
    }

    // Strategy 2: Sometimes remove an arena card (10% chance)
    if (myPlayerState.arenaCards.length > 0 && Math.random() < 0.1) {
      const cardToRemove = this.selectCardToRemove(myPlayerState)
      if (cardToRemove) {
        return {
          type: 'removeCard',
          playerId: this.id,
          cardId: cardToRemove.id
        }
      }
    }

    // Strategy 3: End turn if no other action is beneficial
    return {
      type: 'endTurn',
      playerId: this.id
    }
  }

  // Select which card to play from hand
  private selectCardToPlay(myPlayerState: PlayerState) {
    if (myPlayerState.hand.length === 0) return null

    switch (this.difficulty) {
      case 'easy':
        // Play random card
        return myPlayerState.hand[Math.floor(Math.random() * myPlayerState.hand.length)]
      
      case 'medium':
        // Prefer to play cards from the beginning or end of hand
        const edgeIndices = [0, myPlayerState.hand.length - 1]
        const index = edgeIndices[Math.floor(Math.random() * edgeIndices.length)]
        return myPlayerState.hand[index]
      
      case 'hard':
        // More strategic: prefer certain card types or positions
        // For now, play the first card (can be enhanced with more strategy)
        return myPlayerState.hand[0]
      
      default:
        return myPlayerState.hand[0]
    }
  }

  // Select position to play card (0-5 for arena positions)
  private selectPlayPosition(myPlayerState: PlayerState): number {
    const currentArenaSize = myPlayerState.arenaCards.length
    
    switch (this.difficulty) {
      case 'easy':
        // Random position
        return Math.floor(Math.random() * (currentArenaSize + 1))
      
      case 'medium':
        // Prefer center positions (Hearthstone-style)
        const centerPositions = [2, 3, 1, 4, 0, 5]
        for (const pos of centerPositions) {
          if (pos <= currentArenaSize) {
            return pos
          }
        }
        return currentArenaSize
      
      case 'hard':
        // Strategic positioning (can be enhanced)
        return Math.floor(currentArenaSize / 2) // Try to place in middle
      
      default:
        return currentArenaSize // Add to end
    }
  }

  // Select which arena card to remove
  private selectCardToRemove(myPlayerState: PlayerState) {
    if (myPlayerState.arenaCards.length === 0) return null

    switch (this.difficulty) {
      case 'easy':
        // Remove random card
        return myPlayerState.arenaCards[Math.floor(Math.random() * myPlayerState.arenaCards.length)]
      
      case 'medium':
      case 'hard':
        // Remove oldest card (first in arena)
        return myPlayerState.arenaCards[0]
      
      default:
        return myPlayerState.arenaCards[0]
    }
  }

  // Get AI's player state from game state
  private getMyPlayerState(gameState: GameState): PlayerState | null {
    return gameState.players.find(p => p.id === this.id) || null
  }

  // Utility method for async delay
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Called when game state changes
  onGameStateChanged(gameState: GameState): void {
    // AI can analyze the game state here for learning/strategy
    console.log(`🤖 ${this.name} observes game state change`)
  }

  // Called when the game ends
  onGameEnded(gameState: GameState, isWinner: boolean): void {
    if (isWinner) {
      console.log(`🤖🎉 ${this.name} wins!`)
    } else {
      console.log(`🤖😔 ${this.name} loses.`)
    }
  }

  // Get AI difficulty
  getDifficulty(): string {
    return this.difficulty
  }

  // Set AI difficulty
  setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.difficulty = difficulty
    this.thinkingTime = {
      easy: 1000,
      medium: 1500,
      hard: 2000
    }[difficulty]
  }
} 