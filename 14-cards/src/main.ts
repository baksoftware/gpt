import './style.css'
import { Application, Assets, Sprite, Container, FederatedPointerEvent, Text, Graphics } from 'pixi.js'
import { GameEngine, GameState, Card as GameCard } from './gameEngine'
import { HumanPlayer } from './players/HumanPlayer'
import { AIPlayer } from './players/AIPlayer'

// Create the application
const app = new Application()

// Game engine and players
let gameEngine: GameEngine
let humanPlayer: HumanPlayer
let aiPlayer: AIPlayer

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
    antialias: true,
    resizeTo: window,
    resolution: window.devicePixelRatio
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

  // Load assets
  const assets = [
    { alias: 'arena', src: '/arena-1.png' },
    { alias: 'card1', src: '/card-1.png' },
    { alias: 'card2', src: '/card-2.png' },
    { alias: 'card3', src: '/card-3.png' },
    { alias: 'card4', src: '/card-4.png' },
    { alias: 'card5', src: '/card-5.png' }
  ]

  // Load all assets
  await Assets.load(assets.map(asset => ({ alias: asset.alias, src: asset.src })))

  // Initialize game engine
  initializeGameEngine()

  // Create the game scene
  createGameScene()
}

function initializeGameEngine(): void {
  gameEngine = new GameEngine()
  humanPlayer = new HumanPlayer('human', 'Player')
  aiPlayer = new AIPlayer('ai', 'AI Opponent', 'medium')

  // Listen to game state changes
  gameEngine.addEventListener((gameState: GameState) => {
    updateVisualization(gameState)
  })

  // Initialize the game
  gameEngine.initializeGame(humanPlayer, aiPlayer)

  // Start the game loop
  gameLoop()
}

async function gameLoop(): Promise<void> {
  while (gameEngine.getGameState().gameStatus === 'playing') {
    await gameEngine.processCurrentPlayerTurn()

    // Small delay between turns for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  }
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
let arenaCards: VisualCard[] = [] // Track cards in arena
let arenaContainer: Container | null = null
let humanHandContainer: Container | null = null
let aiHandContainer: Container | null = null
let humanArenaContainer: Container | null = null
let aiArenaContainer: Container | null = null
let uiContainer: Container | null = null
let gameScale: number = 1 // Global scale factor based on arena fitting

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

  app.stage.addChild(arena)

  // Create UI container for buttons and text
  uiContainer = new Container()
  app.stage.addChild(uiContainer)

  // Create AI arena container (top half)
  aiArenaContainer = new Container()
  app.stage.addChild(aiArenaContainer)

  // Create human arena container (bottom half)
  humanArenaContainer = new Container()
  app.stage.addChild(humanArenaContainer)

  // Create AI hand container (top)
  aiHandContainer = new Container()
  app.stage.addChild(aiHandContainer)

  // Create human hand container (bottom)
  humanHandContainer = new Container()
  app.stage.addChild(humanHandContainer)

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
    if (humanPlayer.isWaitingForInput()) {
      humanPlayer.endTurn()
    }
  })

  uiContainer.addChild(endTurnButton)
}

function updateVisualization(gameState: GameState): void {
  if (!humanHandContainer || !aiHandContainer || !humanArenaContainer || !aiArenaContainer || !uiContainer) return

  // Clear existing cards
  humanHandContainer.removeChildren()
  aiHandContainer.removeChildren()
  humanArenaContainer.removeChildren()
  aiArenaContainer.removeChildren()

  // Update turn indicator
  updateTurnIndicator(gameState)

  const humanPlayerState = gameState.players.find(p => p.id === 'human')
  const aiPlayerState = gameState.players.find(p => p.id === 'ai')

  if (humanPlayerState) {
    createPlayerHand(humanPlayerState, humanHandContainer, 'human', false)
    createPlayerArena(humanPlayerState, humanArenaContainer, 'human', false)
  }

  if (aiPlayerState) {
    createPlayerHand(aiPlayerState, aiHandContainer, 'ai', true)
    createPlayerArena(aiPlayerState, aiArenaContainer, 'ai', true)
  }
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
  const isPlayerTurn = currentPlayer.id === 'human'

  const turnText = new Text({
    text: isPlayerTurn ? 'YOUR TURN' : 'OPPONENT\'S TURN',
    style: {
      fontSize: gameScale * 24,
      fill: isPlayerTurn ? 0x4CAF50 : 0xF44336,
      fontFamily: 'Arial',
      fontWeight: 'bold'
    }
  })
  turnText.name = 'turnIndicator'
  turnText.anchor.set(0.5)
  turnText.position.set(app.screen.width / 2, gameScale * 50)

  uiContainer.addChild(turnText)
}

function createPlayerHand(playerState: any, container: Container, playerId: string, isAI: boolean): void {
  const cardScale = gameScale * 0.12
  const cardSpacing = gameScale * 80

  playerState.hand.forEach((gameCard: GameCard, index: number) => {
    const card = createCardSprite(gameCard, isAI) as VisualCard
    card.anchor.set(0.5)

    // Position cards
    const startX = (app.screen.width / 2) - ((playerState.hand.length - 1) * cardSpacing / 2)
    const handY = isAI ?
      gameScale * 100 : // AI cards at top
      app.screen.height - (gameScale * 100) // Human cards at bottom

    card.position.set(startX + index * cardSpacing, handY)
    card.scale.set(cardScale)

    // Store original position and rotation
    card.originalX = card.position.x
    card.originalY = card.position.y
    card.originalRotation = (index - Math.floor(playerState.hand.length / 2)) * 0.04
    card.originalScale = cardScale
    card.cardIndex = index
    card.isPlayed = false
    card.arenaPosition = null
    card.gameCardId = gameCard.id
    card.playerId = playerId
    card.cardData = gameCard

    // Add slight rotation for fan effect
    card.rotation = card.originalRotation

    // Make human cards interactive
    if (!isAI) {
      card.eventMode = 'static'
      card.cursor = 'pointer'

      // Add hover effects
      card.on('pointerover', onCardHover)
      card.on('pointerout', onCardOut)
      card.on('pointerdown', onCardDragStart)
    } else {
      // AI cards are not interactive
      card.eventMode = 'none'
      card.alpha = 0.8 // Make AI cards slightly transparent
    }

    container.addChild(card)
  })
}

function createPlayerArena(playerState: any, container: Container, playerId: string, isAI: boolean): void {
  const cardScale = gameScale * 0.1
  const cardSpacing = gameScale * 120

  playerState.arenaCards.forEach((gameCard: GameCard, index: number) => {
    const card = createCardSprite(gameCard, false) as VisualCard // Arena cards are always face up
    card.anchor.set(0.5)

    // Calculate arena position
    const startX = (app.screen.width / 2) - ((playerState.arenaCards.length - 1) * cardSpacing / 2)
    const arenaY = isAI ?
      app.screen.height / 2 - gameScale * 100 : // AI arena above center
      app.screen.height / 2 + gameScale * 100   // Human arena below center

    card.position.set(startX + index * cardSpacing, arenaY)
    card.scale.set(cardScale)
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
  const cardSprite = (isHidden ?
    Sprite.from('card1') :
    Sprite.from(gameCard.name)) as VisualCard

  if (!isHidden) {
    // Add stats text for visible cards
    const statsText = new Text({
      text: `${gameCard.attack}/${gameCard.health}`,
      style: {
        fontSize: gameScale * 12,
        fill: 0xFFFFFF,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 }
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
        fontSize: gameScale * 10,
        fill: 0xFFD700,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 }
      }
    })
    levelText.anchor.set(0.5)
    levelText.position.set(-cardSprite.width * 0.3, -cardSprite.height * 0.35) // Top left
    cardSprite.addChild(levelText)
  }

  return cardSprite
}

function onArenaCardClick(event: FederatedPointerEvent, card: VisualCard): void {
  event.stopPropagation()

  if (!humanPlayer.isWaitingForInput()) return

  const currentGameState = gameEngine.getGameState()
  const isPlayerTurn = currentGameState.players[currentGameState.currentPlayerIndex].id === 'human'

  if (!isPlayerTurn) return

  if (selectedCard && selectedCard !== card) {
    // Attack if we have a selected card and clicking on enemy card
    if (selectedCard.playerId === 'human' && card.playerId === 'ai') {
      humanPlayer.attackCard(selectedCard.gameCardId!, card.gameCardId!)
      clearSelection()
    } else if (selectedCard.playerId === 'human' && card.playerId === 'human') {
      // Select different own card
      clearSelection()
      selectCard(card)
    }
  } else if (card.playerId === 'human') {
    // Select own card for attacking
    selectCard(card)
  } else if (card.playerId === 'ai') {
    // Remove enemy card (if we implement this mechanic)
    // For now, do nothing
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
      const baseScale = selectedCard.parent === humanArenaContainer || selectedCard.parent === aiArenaContainer ?
        gameScale * 0.1 : gameScale * 0.12
      selectedCard.scale.set(baseScale)
    }
    selectedCard = null
  }
}

function onCardHover(event: FederatedPointerEvent): void {
  const card = event.currentTarget as VisualCard
  if (!dragTarget && !card.isPlayed && card.playerId === 'human') {
    // Bring card to front
    card.parent.setChildIndex(card, card.parent.children.length - 1)

    // Scale up proportionally based on game scale
    const hoverScale = card.originalScale * 1.3
    card.scale.set(hoverScale)
    card.position.y = card.originalY - (gameScale * 60) // Lift relative to arena scale
    card.rotation = 0
  }
}

function onCardOut(event: FederatedPointerEvent): void {
  const card = event.currentTarget as VisualCard
  if (!dragTarget && !card.isPlayed && card.playerId === 'human') {
    card.scale.set(card.originalScale)
    card.position.y = card.originalY
    card.rotation = card.originalRotation
  }
}

function onCardDragStart(event: FederatedPointerEvent): void {
  const card = event.currentTarget as VisualCard
  if (card.isPlayed || card.playerId !== 'human') return

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
  if (dragTarget && dragTarget.playerId === 'human') {
    const card = dragTarget

    // Check if card is dropped in the arena area (center area)
    const centerY = app.screen.height / 2
    const arenaThreshold = gameScale * 150

    if (card.position.y > centerY - arenaThreshold && card.position.y < centerY + arenaThreshold) {
      // Card dropped in play area - play it via game engine
      if (humanPlayer.isWaitingForInput() && card.gameCardId) {
        humanPlayer.playCard(card.gameCardId)
      }
    } else {
      // Card dropped outside arena - return to hand
      returnCardToHand(card)
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

// Start the application
init() 