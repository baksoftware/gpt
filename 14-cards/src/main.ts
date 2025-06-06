import './style.css'
import { Application, Assets, Sprite, Container, FederatedPointerEvent, Text, Graphics } from 'pixi.js'
import { GameEngine, GameState, Card as GameCard, CardSetData } from './gameEngine'
import { HumanPlayer } from './players/HumanPlayer'

const cardSet = 'berlin1920';

// Card set data loaded from JSON
let cardSetData: CardSetData | null = null

// Create the application
const app = new Application()

// Game engine and players
let gameEngine: GameEngine
let humanPlayer1: HumanPlayer
let humanPlayer2: HumanPlayer

// Notification system
interface GameNotification {
  id: string
  text: string
  x: number
  y: number
  color: number
  duration: number
  startTime: number
  textSprite: Text
}

let notifications: GameNotification[] = []
let notificationContainer: Container | null = null

// Type definitions for visual cards
interface VisualCard extends Sprite {
  originalX: number
  originalY: number
  originalRotation: number
  originalScale: number
  cardIndex: number
  isPlayed: boolean
  arenaPosition: number | null
  dragOffset?: { x: number; y: number }
  gameCardId?: string // Link to game engine card
  playerId?: string // Which player owns this card
  cardData?: GameCard // Store full card data
  statsText?: Text // Text showing attack/health
  isSelected?: boolean // For attack targeting
}

// Initialize the application
async function init(): Promise<void> {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x2c3e50,
    background: 0xeeeeee,
    resolution: window.devicePixelRatio * 1.5,
    autoDensity: true,
    antialias: true,
  })

  // Add the canvas to the DOM
  const gameContainer = document.querySelector('#game-container') as HTMLElement
  if (gameContainer) {
    gameContainer.appendChild(app.canvas)
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    // Recreate scene with new dimensions
    app.stage.removeChildren()
    createGameScene()
  })

  // Add fullscreen functionality
  setupFullscreen()

  // Load card set data first
  await loadCardSetData()

  // Load assets dynamically from cardSet folder
  const assets = await buildAssetList()

  // Load all assets
  await Assets.load(assets)

  // Initialize game engine
  initializeGameEngine()

  // Create the game scene
  createGameScene()
}

function initializeGameEngine(): void {
  gameEngine = new GameEngine()

  // Set the loaded card set data
  if (cardSetData) {
    gameEngine.setCardSetData(cardSetData)
  }

  humanPlayer1 = new HumanPlayer('human1', 'Player 1')
  humanPlayer2 = new HumanPlayer('human2', 'Player 2')

  // Listen to game state changes
  gameEngine.addEventListener((gameState: GameState) => {
    updateVisualization(gameState)
  })

  // Initialize the game
  gameEngine.initializeGame(humanPlayer1, humanPlayer2)

  // Start the game loop
  gameLoop()
}

async function gameLoop(): Promise<void> {
  // Start animation ticker
  app.ticker.add(updateAnimations)

  while (gameEngine.getGameState().gameStatus === 'playing') {
    await gameEngine.processCurrentPlayerTurn()

    // Small delay between turns for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Stop animation ticker when game ends
  app.ticker.remove(updateAnimations)
}

function setupFullscreen(): void {
  // Add fullscreen toggle on F key press or double-click
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen()
    }
    if (e.key === 'Escape') {
      exitFullscreen()
    }
  })

  // Double-click to toggle fullscreen
  document.addEventListener('dblclick', () => {
    toggleFullscreen()
  })

  console.log('🎮 Fullscreen Controls:')
  console.log('  • Press F key to toggle fullscreen')
  console.log('  • Double-click anywhere to toggle fullscreen')
  console.log('  • Press Escape to exit fullscreen')
  console.log('  • On macOS: Cmd+Shift+F in browser also works')
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Fullscreen not supported or blocked:', err)
    })
  } else {
    // Exit fullscreen
    document.exitFullscreen()
  }
}

function exitFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  }
}

let dragTarget: VisualCard | null = null
let selectedCard: VisualCard | null = null // For attack targeting
let player1HandContainer: Container | null = null
let player2HandContainer: Container | null = null
let player1ArenaContainer: Container | null = null
let player2ArenaContainer: Container | null = null
let uiContainer: Container | null = null
let gameScale: number = 1 // Global scale factor based on arena fitting
let cardScale: number = 1 // Card scale factor based purely on screen height

function createGameScene(): void {
  // Create arena background that fills the entire screen
  const arena = Sprite.from('arena')
  arena.anchor.set(0.5)
  arena.position.set(app.screen.width / 2, app.screen.height / 2)

  // Calculate scale to fill entire screen (crop if needed to maintain aspect ratio)
  const scaleX = app.screen.width / arena.texture.width
  const scaleY = app.screen.height / arena.texture.height
  const arenaScale = Math.max(scaleX, scaleY) // Use larger scale to ensure full coverage

  arena.scale.set(arenaScale)

  // Store the global game scale for all other elements (use smaller scale for UI consistency)
  gameScale = Math.min(scaleX, scaleY)

  // Create card scale based purely on screen height for consistent card sizing
  cardScale = app.screen.height / 1080 // Normalize to 1080p height as reference

  app.stage.addChild(arena)

  // Create UI container for buttons and text
  uiContainer = new Container()
  app.stage.addChild(uiContainer)

  // Create notification container for floating text
  notificationContainer = new Container()
  app.stage.addChild(notificationContainer)

  // Create Player2 arena container (top half)
  player2ArenaContainer = new Container()
  app.stage.addChild(player2ArenaContainer)

  // Create Player1 arena container (bottom half)
  player1ArenaContainer = new Container()
  app.stage.addChild(player1ArenaContainer)

  // Create Player1 hand container (top)
  player1HandContainer = new Container()
  app.stage.addChild(player1HandContainer)

  // Create Player2 hand container (bottom)
  player2HandContainer = new Container()
  app.stage.addChild(player2HandContainer)

  // Create UI elements
  createUI()

  // Add global pointer events for dragging
  app.stage.eventMode = 'static'
  app.stage.on('pointermove', onDragMove)
  app.stage.on('pointerup', onDragEnd)
  app.stage.on('pointerupoutside', onDragEnd)

  // Update visualization with current game state
  const gameState = gameEngine.getGameState()
  updateVisualization(gameState)
}

function createUI(): void {
  if (!uiContainer) return

  // Create End Turn button
  const endTurnButton = new Graphics()
  endTurnButton.rect(0, 0, gameScale * 120, gameScale * 40)
  endTurnButton.fill(0x4CAF50)
  endTurnButton.position.set(app.screen.width - gameScale * 140, app.screen.height - gameScale * 60)

  const endTurnText = new Text({
    text: 'End Turn',
    style: {
      fontSize: gameScale * 16,
      fill: 0xFFFFFF,
      fontFamily: 'Arial'
    }
  })
  endTurnText.anchor.set(0.5)
  endTurnText.position.set(gameScale * 60, gameScale * 20)
  endTurnButton.addChild(endTurnText)

  endTurnButton.eventMode = 'static'
  endTurnButton.cursor = 'pointer'
  endTurnButton.on('pointerdown', () => {
    const currentGameState = gameEngine.getGameState()
    const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex]

    if (currentPlayer.id === 'human1' && humanPlayer1.isWaitingForInput()) {
      humanPlayer1.endTurn()
    } else if (currentPlayer.id === 'human2' && humanPlayer2.isWaitingForInput()) {
      humanPlayer2.endTurn()
    }
  })

  uiContainer.addChild(endTurnButton)
}

// Check for game events and trigger animations
function checkForGameEvents(previousState: GameState, currentState: GameState): void {
  // Check for cards played
  for (let i = 0; i < currentState.players.length; i++) {
    const prevPlayer = previousState.players[i]
    const currPlayer = currentState.players[i]

    // Check for new cards in arena (cards played)
    const newArenaCards = currPlayer.arenaCards.filter(card =>
      !prevPlayer.arenaCards.some(prevCard => prevCard.id === card.id)
    )

    for (const newCard of newArenaCards) {
      const cardName = newCard.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

      // Find the visual position for the animation - use 4-zone layout
      const arenaY = i === 0 ? // First player is human1
        app.screen.height * 0.625 :   // Player 1 arena (lower middle quarter)
        app.screen.height * 0.375     // Player 2 arena (upper middle quarter)

      animateCardPlay(cardName, app.screen.width / 2, arenaY)
    }

    // Check for cards that took damage
    for (const currCard of currPlayer.arenaCards) {
      const prevCard = prevPlayer.arenaCards.find(pc => pc.id === currCard.id)
      if (prevCard && prevCard.health > currCard.health) {
        const damage = prevCard.health - currCard.health
        // Find the visual card to show damage
        const container = i === 0 ? player1ArenaContainer : player2ArenaContainer
        if (container) {
          const visualCard = container.children.find(child =>
            (child as VisualCard).gameCardId === currCard.id
          ) as VisualCard

          if (visualCard) {
            createNotification(`-${damage}`, visualCard.position.x, visualCard.position.y - 30, 0xFF4444, 1500)
          }
        }
      }
    }

    // Check for destroyed cards
    const destroyedCards = prevPlayer.arenaCards.filter(prevCard =>
      !currPlayer.arenaCards.some(currCard => currCard.id === prevCard.id)
    )

    for (const destroyedCard of destroyedCards) {
      const cardName = destroyedCard.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

      // Show destruction notification at arena center - use 4-zone layout
      const arenaY = i === 0 ?
        app.screen.height * 0.625 :   // Player 1 arena (lower middle quarter)
        app.screen.height * 0.375     // Player 2 arena (upper middle quarter)

      createNotification(`${cardName} Destroyed!`, app.screen.width / 2, arenaY, 0xFF6B6B, 2000)
    }
  }

  // Check for turn changes
  if (previousState.currentPlayerIndex !== currentState.currentPlayerIndex) {
    const newPlayerName = currentState.players[currentState.currentPlayerIndex].name
    const isPlayer1Turn = currentState.players[currentState.currentPlayerIndex].id === 'human1'
    const turnText = isPlayer1Turn ? 'Your Turn!' : `${newPlayerName}'s Turn!`
    const color = isPlayer1Turn ? 0x4CAF50 : 0xF44336

    createNotification(turnText, app.screen.width / 2, app.screen.height / 2, color, 2000)
  }
}

function updateVisualization(gameState: GameState): void {
  if (!player1HandContainer || !player2HandContainer || !player1ArenaContainer || !player2ArenaContainer || !uiContainer) return

  // Store previous state for comparison
  const previousState = (updateVisualization as any).previousState as GameState | undefined

  // Clear existing cards
  player1HandContainer.removeChildren()
  player2HandContainer.removeChildren()
  player1ArenaContainer.removeChildren()
  player2ArenaContainer.removeChildren()

  // Update turn indicator
  updateTurnIndicator(gameState)

  const player1State = gameState.players.find(p => p.id === 'human1')
  const player2State = gameState.players.find(p => p.id === 'human2')

  if (player1State) {
    createPlayerHand(player1State, player1HandContainer, 'human1', false)
    createPlayerArena(player1State, player1ArenaContainer, 'human1', false)
  }

  if (player2State) {
    createPlayerHand(player2State, player2HandContainer, 'human2', true)
    createPlayerArena(player2State, player2ArenaContainer, 'human2', true)
  }

  // Check for game events and trigger animations
  if (previousState) {
    checkForGameEvents(previousState, gameState)
  }

  // Store current state for next comparison
  ; (updateVisualization as any).previousState = JSON.parse(JSON.stringify(gameState))
}

function updateTurnIndicator(gameState: GameState): void {
  if (!uiContainer) return

  // Remove existing turn indicator
  const existingIndicator = uiContainer.children.find(child => child.name === 'turnIndicator')
  if (existingIndicator) {
    uiContainer.removeChild(existingIndicator)
  }

  // Create new turn indicator
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const playerName = currentPlayer.name.toUpperCase()

  const turnText = new Text({
    text: `${playerName} TURN`,
    style: {
      fontSize: gameScale * 24,
      fill: currentPlayer.id === 'human1' ? 0x4CAF50 : 0x2196F3, // Green for Player 1, Blue for Player 2
      fontFamily: 'Arial',
      fontWeight: 'bold'
    }
  })
  turnText.name = 'turnIndicator'
  turnText.anchor.set(0.5)
  turnText.position.set(app.screen.width / 4, gameScale * 50)

  uiContainer.addChild(turnText)
}

const cardSize = 0.19;

function createPlayerHand(playerState: any, container: Container, playerId: string, isTopPlayer: boolean): void {
  const handCardScale = cardScale * cardSize  // Base card scale on screen height only
  const cardSpacing = cardScale * 140     // Dramatically increased spacing to eliminate overlap

  playerState.hand.forEach((gameCard: GameCard, index: number) => {
    const card = createCardSprite(gameCard, false) as VisualCard // Both players can see their cards
    card.anchor.set(0.5)

    // Position cards - split screen into 4 vertical zones
    const startX = (app.screen.width / 2) - ((playerState.hand.length - 1) * cardSpacing / 2)
    const handY = isTopPlayer ?
      app.screen.height * 0.125 : // Top quarter (12.5% from top) for Player 2
      app.screen.height * 0.875   // Bottom quarter (87.5% from top) for Player 1

    card.position.set(startX + index * cardSpacing, handY)
    card.scale.set(handCardScale)

    // Store original position and rotation
    card.originalX = card.position.x
    card.originalY = card.position.y
    card.originalRotation = (index - Math.floor(playerState.hand.length / 2)) * 0.04
    card.originalScale = handCardScale
    card.cardIndex = index
    card.isPlayed = false
    card.arenaPosition = null
    card.gameCardId = gameCard.id
    card.playerId = playerId
    card.cardData = gameCard

    // Add slight rotation for fan effect
    card.rotation = card.originalRotation

    // Make both players' cards interactive (they'll only respond during their turn)
    card.eventMode = 'static'
    card.cursor = 'pointer'

    // Add hover effects
    card.on('pointerover', onCardHover)
    card.on('pointerout', onCardOut)
    card.on('pointerdown', onCardDragStart)

    container.addChild(card)
  })
}

function createPlayerArena(playerState: any, container: Container, playerId: string, isTopPlayer: boolean): void {
  const arenaCardScale = cardScale * cardSize  // Base card scale on screen height only
  const cardSpacing = cardScale * 380       // Dramatically increased spacing to eliminate overlap

  playerState.arenaCards.forEach((gameCard: GameCard, index: number) => {
    const card = createCardSprite(gameCard, false) as VisualCard // Arena cards are always face up
    card.anchor.set(0.5)

    // Calculate arena position - split screen into 4 vertical zones
    const startX = (app.screen.width / 2) - ((playerState.arenaCards.length - 1) * cardSpacing / 2)
    const arenaY = isTopPlayer ?
      app.screen.height * 0.375 : // Upper middle quarter (37.5% from top) for Player 2
      app.screen.height * 0.625   // Lower middle quarter (62.5% from top) for Player 1

    card.position.set(startX + index * cardSpacing, arenaY)
    card.scale.set(arenaCardScale)
    card.gameCardId = gameCard.id
    card.playerId = playerId
    card.cardData = gameCard

    // Make arena cards interactive for attacks
    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.on('pointerdown', (event) => onArenaCardClick(event, card))

    container.addChild(card)
  })
}

function createCardSprite(gameCard: GameCard, isHidden: boolean): VisualCard {
  let cardAssetName: string

  if (isHidden) {
    // For hidden cards, use the first available card image as fallback
    if (cardSetData && cardSetData.cards.length > 0) {
      cardAssetName = cardSetData.cards[0].title.toLowerCase().replace(/\s+/g, '_')
    } else {
      // Ultimate fallback - this shouldn't happen but just in case
      cardAssetName = 'hausfrau' // Use a known card
    }
  } else {
    // Check if we have a specific asset for this card from the loaded card set
    if (cardSetData) {
      // Look for the card in the cardSetData
      const cardData = cardSetData.cards.find(card =>
        card.title.toLowerCase().replace(/\s+/g, '_') === gameCard.name
      )

      if (cardData) {
        // Use the asset alias we created (card title in lowercase with underscores)
        cardAssetName = gameCard.name
      } else {
        // Fallback to first available card for unknown cards
        cardAssetName = cardSetData.cards[0].title.toLowerCase().replace(/\s+/g, '_')
      }
    } else {
      // Use a known fallback
      cardAssetName = 'hausfrau'
    }
  }

  const cardSprite = Sprite.from(cardAssetName) as VisualCard

  if (!isHidden) {
    // Add stats text for visible cards
    const statsText = new Text({
      text: `${gameCard.attack}/${gameCard.health}`,
      style: {
        fontSize: cardScale * 18,  // Use height-based cardScale instead of gameScale
        fill: 0xFFFFFF,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 }
      }
    })
    statsText.anchor.set(0.5)
    statsText.position.set(0, cardSprite.height * 0.35) // Bottom of card
    cardSprite.addChild(statsText)
    cardSprite.statsText = statsText

    // Add level indicator
    const levelText = new Text({
      text: `${gameCard.level}`,
      style: {
        fontSize: cardScale * 15,  // Use height-based cardScale instead of gameScale
        fill: 0xFFD700, // Gold color for all cards
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 }
      }
    })
    levelText.anchor.set(0.5)
    levelText.position.set(-cardSprite.width * 0.3, -cardSprite.height * 0.35) // Top left
    cardSprite.addChild(levelText)

    // Add card name
    const nameText = new Text({
      text: gameCard.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      style: {
        fontSize: cardScale * 12,  // Use height-based cardScale instead of gameScale
        fill: 0xFFFFFF,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 }
      }
    })
    nameText.anchor.set(0.5)
    nameText.position.set(0, -cardSprite.height * 0.15) // Middle of card
    cardSprite.addChild(nameText)
  }

  return cardSprite
}

function onArenaCardClick(event: FederatedPointerEvent, card: VisualCard): void {
  event.stopPropagation()

  const currentGameState = gameEngine.getGameState()
  const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex]
  const currentPlayerId = currentPlayer.id

  // Check if either player is waiting for input
  const isPlayerWaiting = (currentPlayerId === 'human1' && humanPlayer1.isWaitingForInput()) ||
    (currentPlayerId === 'human2' && humanPlayer2.isWaitingForInput())

  if (!isPlayerWaiting) return

  if (selectedCard && selectedCard !== card) {
    // Attack if we have a selected card and clicking on enemy card
    if (selectedCard.playerId === currentPlayerId && card.playerId !== currentPlayerId) {
      if (currentPlayerId === 'human1') {
        humanPlayer1.attackCard(selectedCard.gameCardId!, card.gameCardId!)
      } else if (currentPlayerId === 'human2') {
        humanPlayer2.attackCard(selectedCard.gameCardId!, card.gameCardId!)
      }
      clearSelection()
    } else if (selectedCard.playerId === currentPlayerId && card.playerId === currentPlayerId) {
      // Select different own card
      clearSelection()
      selectCard(card)
    }
  } else if (card.playerId === currentPlayerId) {
    // Select own card for attacking
    selectCard(card)
  }
}

function selectCard(card: VisualCard): void {
  clearSelection()
  selectedCard = card
  card.isSelected = true

  // Visual indication of selection
  card.alpha = 0.8
  card.scale.set(card.scale.x * 1.1, card.scale.y * 1.1)
}

function clearSelection(): void {
  if (selectedCard) {
    selectedCard.isSelected = false
    selectedCard.alpha = 1
    if (selectedCard.cardData) {
      const baseScale = selectedCard.parent === player1ArenaContainer || selectedCard.parent === player2ArenaContainer ?
        cardScale * 0.35 : cardScale * 0.4  // Use height-based cardScale values
      selectedCard.scale.set(baseScale)
    }
    selectedCard = null
  }
}

function onCardHover(event: FederatedPointerEvent): void {
  const card = event.currentTarget as VisualCard
  if (!dragTarget && !card.isPlayed) {
    // Bring card to front
    card.parent.setChildIndex(card, card.parent.children.length - 1)

    // Scale up proportionally based on original scale
    const hoverScale = card.originalScale * 1.3
    card.scale.set(hoverScale)
    card.position.y = card.originalY - (cardScale * 60) // Lift based on height-based scale
    card.rotation = 0

    // Show abilities for all cards
    if (card.cardData && card.cardData.specialAbilities && card.cardData.specialAbilities.length > 0) {
      const abilities = card.cardData.specialAbilities.join(', ')
      createNotification(abilities, card.position.x, card.position.y - 100, 0xFFD700, 3000)
    }
  }
}

function onCardOut(event: FederatedPointerEvent): void {
  const card = event.currentTarget as VisualCard
  if (!dragTarget && !card.isPlayed) {
    card.scale.set(card.originalScale)
    card.position.y = card.originalY
    card.rotation = card.originalRotation
  }
}

function onCardDragStart(event: FederatedPointerEvent): void {
  const card = event.currentTarget as VisualCard
  if (card.isPlayed) return

  // Check if it's this player's turn
  const currentGameState = gameEngine.getGameState()
  const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex]

  if (card.playerId !== currentPlayer.id) return

  // Clear any selection when starting to drag
  clearSelection()

  dragTarget = card

  // Store the initial mouse position relative to the card
  const globalPos = event.data.global
  dragTarget.dragOffset = {
    x: globalPos.x - dragTarget.position.x,
    y: globalPos.y - dragTarget.position.y
  }

  // Bring card to front and make it larger while dragging
  dragTarget.parent.setChildIndex(dragTarget, dragTarget.parent.children.length - 1)
  const dragScale = dragTarget.originalScale * 1.2
  dragTarget.scale.set(dragScale)
  dragTarget.rotation = 0
  dragTarget.alpha = 0.8

  console.log(`Started dragging card ${dragTarget.cardIndex + 1}`)
}

function onDragMove(event: FederatedPointerEvent): void {
  if (dragTarget && dragTarget.dragOffset) {
    const globalPos = event.data.global
    dragTarget.position.x = globalPos.x - dragTarget.dragOffset.x
    dragTarget.position.y = globalPos.y - dragTarget.dragOffset.y
  }
}

function onDragEnd(_event: FederatedPointerEvent): void {
  if (dragTarget) {
    const card = dragTarget
    const currentGameState = gameEngine.getGameState()
    const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex]
    const currentPlayerId = currentPlayer.id

    // Check if card belongs to current player
    if (card.playerId === currentPlayerId) {
      // Check if card is dropped in the arena area (middle two quarters of screen)
      const arenaTopBoundary = app.screen.height * 0.25    // Start of upper arena zone (25%)
      const arenaBottomBoundary = app.screen.height * 0.75  // End of lower arena zone (75%)

      if (card.position.y > arenaTopBoundary && card.position.y < arenaBottomBoundary) {
        // Card dropped in play area - play it via game engine
        const isPlayerWaiting = (currentPlayerId === 'human1' && humanPlayer1.isWaitingForInput()) ||
          (currentPlayerId === 'human2' && humanPlayer2.isWaitingForInput())

        if (isPlayerWaiting && card.gameCardId && card.cardData) {
          // Show immediate feedback for card play
          const cardName = card.cardData.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

          animateCardPlay(cardName, app.screen.width / 2, card.position.y)

          if (currentPlayerId === 'human1') {
            humanPlayer1.playCard(card.gameCardId)
          } else if (currentPlayerId === 'human2') {
            humanPlayer2.playCard(card.gameCardId)
          }
        }
      } else {
        // Card dropped outside arena - return to hand
        returnCardToHand(card)
      }
    }

    dragTarget = null
  }
}

function returnCardToHand(card: VisualCard): void {
  card.alpha = 1

  const animate = (): void => {
    const dx = card.originalX - card.position.x
    const dy = card.originalY - card.position.y
    const dScale = card.originalScale - card.scale.x
    const dRotation = card.originalRotation - card.rotation

    card.position.x += dx * 0.15
    card.position.y += dy * 0.15
    card.scale.x += dScale * 0.15
    card.scale.y += dScale * 0.15
    card.rotation += dRotation * 0.15

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(dScale) > 0.01) {
      requestAnimationFrame(animate)
    } else {
      card.position.x = card.originalX
      card.position.y = card.originalY
      card.scale.set(card.originalScale)
      card.rotation = card.originalRotation
    }
  }

  animate()
}

// Animation update function
function updateAnimations(): void {
  const currentTime = Date.now()

  // Update notifications
  for (let i = notifications.length - 1; i >= 0; i--) {
    const notification = notifications[i]
    const elapsed = currentTime - notification.startTime
    const progress = elapsed / notification.duration

    if (progress >= 1) {
      // Remove expired notification
      if (notificationContainer) {
        notificationContainer.removeChild(notification.textSprite)
      }
      notifications.splice(i, 1)
    } else {
      // Animate notification (float up and fade out)
      const floatDistance = gameScale * 100
      notification.textSprite.y = notification.y - (progress * floatDistance)
      notification.textSprite.alpha = 1 - (progress * 0.8) // Fade to 20% opacity

      // Scale effect for impact
      const scale = 1 + (Math.sin(progress * Math.PI) * 0.2)
      notification.textSprite.scale.set(scale)
    }
  }
}

// Create floating notification
function createNotification(text: string, x: number, y: number, color: number = 0xFFFFFF, duration: number = 2000): void {
  if (!notificationContainer) return

  const textSprite = new Text({
    text,
    style: {
      fontSize: gameScale * 16,
      fill: color,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 3 }
    }
  })

  textSprite.anchor.set(0.5)
  textSprite.position.set(x, y)

  const notification: GameNotification = {
    id: `notification_${Date.now()}_${Math.random()}`,
    text,
    x,
    y,
    color,
    duration,
    startTime: Date.now(),
    textSprite
  }

  notifications.push(notification)
  notificationContainer.addChild(textSprite)
}

// Combat animation for cards
function animateCardCombat(attackerCard: VisualCard, defenderCard: VisualCard, attackerDamage: number, defenderDamage: number): void {
  // Attacker animation - quick move toward target
  const originalX = attackerCard.position.x
  const originalY = attackerCard.position.y
  const targetX = defenderCard.position.x
  const targetY = defenderCard.position.y

  // Calculate direction
  const deltaX = (targetX - originalX) * 0.3
  const deltaY = (targetY - originalY) * 0.3

  // Attacker strikes
  const attackDuration = 300
  const startTime = Date.now()

  const animateAttack = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / attackDuration, 1)

    if (progress < 0.5) {
      // Move toward target
      const moveProgress = progress * 2
      attackerCard.position.x = originalX + (deltaX * moveProgress)
      attackerCard.position.y = originalY + (deltaY * moveProgress)
    } else {
      // Return to original position
      const returnProgress = (progress - 0.5) * 2
      attackerCard.position.x = originalX + deltaX - (deltaX * returnProgress)
      attackerCard.position.y = originalY + deltaY - (deltaY * returnProgress)
    }

    if (progress < 1) {
      requestAnimationFrame(animateAttack)
    } else {
      // Ensure card is back at original position
      attackerCard.position.x = originalX
      attackerCard.position.y = originalY
    }
  }

  animateAttack()

  // Show damage notifications
  setTimeout(() => {
    if (defenderDamage > 0) {
      createNotification(`-${defenderDamage}`, defenderCard.position.x, defenderCard.position.y - 30, 0xFF4444, 1500)
    }
    if (attackerDamage > 0) {
      createNotification(`-${attackerDamage}`, attackerCard.position.x, attackerCard.position.y - 30, 0xFF4444, 1500)
    }
  }, 150)
}

// Card destruction animation
function animateCardDestruction(card: VisualCard, cardName: string): void {
  const originalScale = card.scale.x
  const duration = 500
  const startTime = Date.now()

  const animateDestruction = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Scale down and fade out
    const scale = originalScale * (1 - progress)
    card.scale.set(scale)
    card.alpha = 1 - progress
    card.rotation += 0.1 // Spin while disappearing

    if (progress < 1) {
      requestAnimationFrame(animateDestruction)
    }
  }

  animateDestruction()

  // Show destruction notification
  createNotification(`${cardName} Destroyed!`, card.position.x, card.position.y, 0xFF6B6B, 2000)
}

// Card play animation
function animateCardPlay(cardName: string, x: number, y: number): void {
  const color = 0xFFD700
  const text = `${cardName} Played!`
  createNotification(text, x, y, color, 2500)
}

async function loadCardSetData(): Promise<void> {
  try {
    const response = await fetch(`/${cardSet}/gamecards.json`)
    if (!response.ok) {
      throw new Error(`Failed to load gamecards.json: ${response.statusText}`)
    }
    cardSetData = await response.json()
    console.log(`Loaded ${cardSetData?.cards.length} cards from ${cardSet}`)
  } catch (error) {
    console.error('Error loading card set data:', error)
    // Fallback to empty card set
    cardSetData = { cards: [] }
  }
}

async function buildAssetList(): Promise<Array<{ alias: string; src: string }>> {
  const assets = []

  // Add arena
  assets.push({ alias: 'arena', src: `/${cardSet}/arena.png` })

  // Add card assets from the cardSet data
  if (cardSetData) {
    for (const card of cardSetData.cards) {
      // Use the imageFileName directly
      assets.push({
        alias: card.title.toLowerCase().replace(/\s+/g, '_'),
        src: `/${cardSet}/${card.imageFileName}`
      })
    }
  }

  return assets
}

// Start the application
init() 