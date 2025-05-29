import './style.css'
import { Application, Assets, Sprite, Container, FederatedPointerEvent } from 'pixi.js'

// Create the application
const app = new Application()

// Type definitions
interface GameCard extends Sprite {
  originalX: number
  originalY: number
  originalRotation: number
  originalScale: number
  cardIndex: number
  isPlayed: boolean
  arenaPosition: number | null
  dragOffset?: { x: number; y: number }
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
    // Clear arena cards array when resizing to avoid conflicts
    arenaCards = []
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

  // Create the game scene
  createGameScene()
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

let dragTarget: GameCard | null = null
let arenaCards: GameCard[] = [] // Track cards in arena
let arenaContainer: Container | null = null
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

  // Create arena card container
  arenaContainer = new Container()
  app.stage.addChild(arenaContainer)

  // Create card container for hand
  const cardContainer = new Container()
  app.stage.addChild(cardContainer)

  // Calculate card scale based on game scale (not arena scale)
  const baseCardScale = gameScale * 0.15 // Cards are 15% of game scale
  const cardScale = Math.max(0.05, Math.min(0.3, baseCardScale)) // Clamp for safety

  // Calculate spacing based on game scale
  const cardSpacing = gameScale * 100 // Fixed spacing relative to game scale

  // Create cards in a hand formation
  const cardNames: string[] = ['card1', 'card2', 'card3', 'card4', 'card5', 'card1', 'card2']
  const cards: GameCard[] = []

  cardNames.forEach((cardName: string, index: number) => {
    const card = Sprite.from(cardName) as GameCard
    card.anchor.set(0.5)
    
    // Position cards relative to screen size but scaled with game scale
    const startX = (app.screen.width / 2) - ((cardNames.length - 1) * cardSpacing / 2)
    const handY = app.screen.height - (gameScale * 120) // Bottom margin relative to game scale
    
    card.position.set(startX + index * cardSpacing, handY)
    card.scale.set(cardScale)
    
    // Store original position and rotation
    card.originalX = card.position.x
    card.originalY = card.position.y
    card.originalRotation = (index - 2) * 0.06
    card.originalScale = cardScale
    card.cardIndex = index
    card.isPlayed = false
    card.arenaPosition = null
    
    // Add slight rotation for fan effect
    card.rotation = card.originalRotation
    
    // Make cards interactive
    card.eventMode = 'static'
    card.cursor = 'pointer'
    
    // Add hover effects
    card.on('pointerover', onCardHover)
    card.on('pointerout', onCardOut)
    card.on('pointerdown', onCardDragStart)
    
    cardContainer.addChild(card)
    cards.push(card)
  })

  // Add global pointer events for dragging
  app.stage.eventMode = 'static'
  app.stage.on('pointermove', onDragMove)
  app.stage.on('pointerup', onDragEnd)
  app.stage.on('pointerupoutside', onDragEnd)
}

function onCardHover(event: FederatedPointerEvent): void {
  const card = event.currentTarget as GameCard
  if (!dragTarget && !card.isPlayed) {
    // Bring card to front
    card.parent.setChildIndex(card, card.parent.children.length - 1)
    
    // Scale up proportionally based on game scale
    const hoverScale = card.originalScale * 1.5
    card.scale.set(hoverScale)
    card.position.y = card.originalY - (gameScale * 80) // Lift relative to arena scale
    card.rotation = 0
  }
}

function onCardOut(event: FederatedPointerEvent): void {
  const card = event.currentTarget as GameCard
  if (!dragTarget && !card.isPlayed) {
    card.scale.set(card.originalScale)
    card.position.y = card.originalY
    card.rotation = card.originalRotation
  }
}

function onCardDragStart(event: FederatedPointerEvent): void {
  const card = event.currentTarget as GameCard
  if (card.isPlayed) return
  
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
    
    // Check if card is dropped in the arena area (above the hand area)
    const handAreaTop = app.screen.height - (gameScale * 200) // Hand area threshold
    if (card.position.y < handAreaTop) {
      // Card dropped in play area - play it
      playCardInArena(card)
    } else {
      // Card dropped in hand area - return to hand
      returnCardToHand(card)
    }
    
    dragTarget = null
  }
}

function playCardInArena(card: GameCard): void {
  console.log(`Card ${card.cardIndex + 1} played in arena!`)
  
  // Check if arena is full (6 cards max)
  if (arenaCards.length >= 6) {
    console.log('Arena is full! Returning card to hand.')
    returnCardToHand(card)
    return
  }
  
  card.isPlayed = true
  card.alpha = 1
  
  const occupiedPositions: number[] = arenaCards.map(c => c.arenaPosition).filter((pos): pos is number => pos !== null)

  let found = false
  const priorityOrder: number[] = [2, 3, 1, 4, 0, 5]
  priorityOrder.forEach((position: number) => {
    if (!found && !occupiedPositions.includes(position)) {
      card.arenaPosition = position
      found = true
    }
  })

  arenaCards.push(card)
     
  console.log(`Card ${card.cardIndex + 1} assigned to arena position ${card.arenaPosition}`)
  
  // Move card to arena container
  card.parent.removeChild(card)
  if (arenaContainer) {
    arenaContainer.addChild(card)
  }
  
  // Add click handler for removing card from arena
  card.removeAllListeners() // Clear previous event listeners
  card.eventMode = 'static'
  card.cursor = 'pointer'
  card.on('pointerdown', () => removeCardFromArena(card))
  
  // Calculate target position in the row with arena-relative spacing
  const cardSpacing = gameScale * 180 // Spacing relative to arena scale
  const rowWidth = 5 * cardSpacing // 6 cards = 5 spaces between them
  const startX = (app.screen.width / 2) - (rowWidth / 2)
  const targetX = startX + (card.arenaPosition! * cardSpacing)
  const targetY = app.screen.height / 2 - (gameScale * 60) // Above arena center
  
  // Arena cards scale relative to game scale
  const finalArenaScale = gameScale * 0.12 // 12% of arena scale
  
  const animate = (): void => {
    const dx = targetX - card.position.x
    const dy = targetY - card.position.y
    const dScale = finalArenaScale - card.scale.x
    
    card.position.x += dx * 0.12
    card.position.y += dy * 0.12
    card.scale.x += dScale * 0.12
    card.scale.y += dScale * 0.12
    
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(dScale) > 0.01) {
      requestAnimationFrame(animate)
    } else {
      card.position.x = targetX
      card.position.y = targetY
      card.scale.set(finalArenaScale)
      
      // Cards stay in arena permanently - no auto return
    }
  }
  
  animate()
}

function removeCardFromArena(card: GameCard): void {
  console.log(`Removing card ${card.cardIndex + 1} from arena`)
  
  // Remove click handler to prevent multiple clicks
  card.removeAllListeners()
  card.eventMode = 'none'
  
  // Remove from arena tracking
  const index = arenaCards.indexOf(card)
  if (index > -1) {
    arenaCards.splice(index, 1)
  }
  
  // Animate card upward and out of screen
  const animate = (): void => {
    card.position.y -= 15 // Move up quickly
    card.alpha -= 0.03 // Fade out
    card.scale.x += 0.01 // Slight scale increase
    card.scale.y += 0.01
    
    if (card.position.y > -200 && card.alpha > 0) {
      requestAnimationFrame(animate)
    } else {
      // Remove card completely
      card.parent.removeChild(card)
      card.destroy()
    }
  }
  
  animate()
}

function returnCardToHand(card: GameCard): void {
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