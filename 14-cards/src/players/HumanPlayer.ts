import { Player, GameState, GameAction } from '../gameEngine'

export class HumanPlayer implements Player {
  id: string
  name: string
  isHuman = true

  private pendingAction: Promise<GameAction | null> | null = null
  private resolveAction: ((action: GameAction | null) => void) | null = null

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  // Called when it's the player's turn to make a decision
  async makeMove(gameState: GameState): Promise<GameAction | null> {
    console.log(`${this.name}'s turn`)

    // Create a promise that will be resolved when the human makes a move via UI
    this.pendingAction = new Promise<GameAction | null>((resolve) => {
      this.resolveAction = resolve

      // Set a timeout for the turn (optional)
      setTimeout(() => {
        if (this.resolveAction) {
          console.log(`${this.name}'s turn timed out`)
          this.resolveAction({ type: 'endTurn', playerId: this.id })
          this.resolveAction = null
        }
      }, 60000) // 60 second timeout for more complex decisions
    })

    return this.pendingAction
  }

  // Called by UI when human player makes a move
  submitAction(action: GameAction | null): void {
    if (this.resolveAction) {
      this.resolveAction(action)
      this.resolveAction = null
      this.pendingAction = null
    }
  }

  // Called when human tries to play a card via UI
  playCard(cardId: string, position?: number): void {
    const action: GameAction = {
      type: 'playCard',
      playerId: this.id,
      cardId,
      position
    }
    this.submitAction(action)
  }

  // Called when human tries to attack with a card via UI
  attackCard(attackerCardId: string, targetCardId: string): void {
    const action: GameAction = {
      type: 'attackCard',
      playerId: this.id,
      cardId: attackerCardId,
      targetCardId: targetCardId
    }
    this.submitAction(action)
  }

  // Called when human tries to remove a card via UI
  removeCard(cardId: string): void {
    const action: GameAction = {
      type: 'removeCard',
      playerId: this.id,
      cardId
    }
    this.submitAction(action)
  }

  // Called when human manually draws a card via UI
  drawCard(): void {
    const action: GameAction = {
      type: 'drawCard',
      playerId: this.id
    }
    this.submitAction(action)
  }

  // Called when human ends their turn via UI
  endTurn(): void {
    const action: GameAction = {
      type: 'endTurn',
      playerId: this.id
    }
    this.submitAction(action)
  }

  // Called when game state changes (for UI updates)
  onGameStateChanged(gameState: GameState): void {
    console.log(`Game state updated for ${this.name}`)
    // This will be handled by the UI layer
  }

  // Called when the game ends
  onGameEnded(gameState: GameState, isWinner: boolean): void {
    if (isWinner) {
      console.log(`🎉 ${this.name} wins!`)
    } else {
      console.log(`😔 ${this.name} loses.`)
    }
  }

  // Check if player is waiting for input
  isWaitingForInput(): boolean {
    return this.pendingAction !== null
  }

  // Cancel pending action (useful for game interruption)
  cancelPendingAction(): void {
    if (this.resolveAction) {
      this.resolveAction(null)
      this.resolveAction = null
      this.pendingAction = null
    }
  }
} 