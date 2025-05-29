import { Player, GameState, GameAction, PlayerState, Card } from '../gameEngine'

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
    const opponentState = gameState.players.find(p => p.id !== this.id)
    if (!opponentState) return null

    // Strategy 1: Attack opponent cards if we have cards in arena
    if (myPlayerState.arenaCards.length > 0 && opponentState.arenaCards.length > 0) {
      const attackAction = this.selectAttackAction(myPlayerState, opponentState)
      if (attackAction) {
        return attackAction
      }
    }

    // Strategy 2: Play a card if we haven't played one this turn and have cards
    if (!myPlayerState.hasPlayedCard && myPlayerState.hand.length > 0 &&
      myPlayerState.arenaCards.length < myPlayerState.maxArenaSize) {
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

    // Strategy 3: End turn if no beneficial actions remain
    return {
      type: 'endTurn',
      playerId: this.id
    }
  }

  // Select an attack action
  private selectAttackAction(myPlayerState: PlayerState, opponentState: PlayerState): GameAction | null {
    if (myPlayerState.arenaCards.length === 0 || opponentState.arenaCards.length === 0) {
      return null
    }

    // Find the best attack based on difficulty
    let bestAttacker: Card | null = null
    let bestTarget: Card | null = null

    switch (this.difficulty) {
      case 'easy':
        // Random attack
        bestAttacker = myPlayerState.arenaCards[Math.floor(Math.random() * myPlayerState.arenaCards.length)]
        bestTarget = opponentState.arenaCards[Math.floor(Math.random() * opponentState.arenaCards.length)]
        break

      case 'medium':
        // Attack weakest enemy with strongest unit
        bestAttacker = myPlayerState.arenaCards.reduce((strongest, card) =>
          card.attack > strongest.attack ? card : strongest)
        bestTarget = opponentState.arenaCards.reduce((weakest, card) =>
          card.health < weakest.health ? card : weakest)
        break

      case 'hard':
        // Strategic: Look for favorable trades
        for (const attacker of myPlayerState.arenaCards) {
          for (const target of opponentState.arenaCards) {
            // Prefer trades where we destroy their card but survive
            if (attacker.attack >= target.health && attacker.health > target.attack) {
              bestAttacker = attacker
              bestTarget = target
              break
            }
          }
          if (bestAttacker && bestTarget) break
        }

        // If no favorable trade, attack weakest with strongest
        if (!bestAttacker || !bestTarget) {
          bestAttacker = myPlayerState.arenaCards.reduce((strongest, card) =>
            card.attack > strongest.attack ? card : strongest)
          bestTarget = opponentState.arenaCards.reduce((weakest, card) =>
            card.health < weakest.health ? card : weakest)
        }
        break
    }

    if (bestAttacker && bestTarget) {
      return {
        type: 'attackCard',
        playerId: this.id,
        cardId: bestAttacker.id,
        targetCardId: bestTarget.id
      }
    }

    return null
  }

  // Select which card to play from hand
  private selectCardToPlay(myPlayerState: PlayerState) {
    if (myPlayerState.hand.length === 0) return null

    switch (this.difficulty) {
      case 'easy':
        // Play random card
        return myPlayerState.hand[Math.floor(Math.random() * myPlayerState.hand.length)]

      case 'medium':
        // Prefer cards with good attack/health ratio
        return myPlayerState.hand.reduce((best, card) => {
          const cardValue = card.attack + card.health
          const bestValue = best.attack + best.health
          return cardValue > bestValue ? card : best
        })

      case 'hard':
        // Strategic: Prefer cards that counter opponent or have good stats
        const opponentState = this.getOpponentPlayerState()
        if (opponentState && opponentState.arenaCards.length > 0) {
          // If opponent has weak cards, play strong attackers
          const opponentMaxHealth = Math.max(...opponentState.arenaCards.map(c => c.health))
          const strongAttackers = myPlayerState.hand.filter(c => c.attack >= opponentMaxHealth)
          if (strongAttackers.length > 0) {
            return strongAttackers.reduce((best, card) =>
              card.attack > best.attack ? card : best)
          }
        }

        // Otherwise play card with best overall stats
        return myPlayerState.hand.reduce((best, card) => {
          const cardValue = card.attack + card.health + card.level
          const bestValue = best.attack + best.health + best.level
          return cardValue > bestValue ? card : best
        })

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
      case 'hard':
        // Place in center for better positioning
        return Math.floor(currentArenaSize / 2)

      default:
        return currentArenaSize // Add to end
    }
  }

  // Get AI's player state from game state
  private getMyPlayerState(gameState: GameState): PlayerState | null {
    return gameState.players.find(p => p.id === this.id) || null
  }

  // Get opponent's player state
  private getOpponentPlayerState(): PlayerState | null {
    // This would need access to game state - simplified for now
    return null
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