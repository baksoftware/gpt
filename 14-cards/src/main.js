import './style.css'
import { Application, Assets, Sprite, Container, Graphics } from 'pixi.js'

// Create the application
const app = new Application()

// Initialize the application
async function init() {
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x2c3e50,
    antialias: true,
    resizeTo: window
  })

  // Add the canvas to the DOM
  document.querySelector('#game-container').appendChild(app.canvas)

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

  // Create the game scene
  createGameScene()
}

function setupFullscreen() {
  // Add fullscreen toggle on F key press or double-click
  document.addEventListener('keydown', (e) => {
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

function toggleFullscreen() {
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

function exitFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  }
}

let dragTarget = null
let dragData = null
let arenaCards = [] // Track cards in arena
let arenaContainer = null

function createGameScene() {
  // Create arena background that fills the entire screen
  const arena = Sprite.from('arena')
  arena.anchor.set(0.5)
  arena.position.set(app.screen.width / 2, app.screen.height / 2)
  
  // Scale arena to cover entire screen while maintaining aspect ratio
  const scaleX = app.screen.width / arena.texture.width
  const scaleY = app.screen.height / arena.texture.height
  const scale = Math.max(scaleX, scaleY) // Use larger scale to ensure full coverage
  arena.scale.set(scale)
  
  app.stage.addChild(arena)

  // Create arena card container
  arenaContainer = new Container()
  app.stage.addChild(arenaContainer)

  // Create card container for hand
  const cardContainer = new Container()
  app.stage.addChild(cardContainer)

  // Create cards in a hand formation
  const cardNames = ['card1', 'card2', 'card3', 'card4', 'card5', 'card1', 'card2']
  const cards = []

  cardNames.forEach((cardName, index) => {
    const card = Sprite.from(cardName)
    card.anchor.set(0.5)
    
    // Position cards in a fan layout at the bottom (even smaller cards)
    const cardSpacing = 80
    const startX = (app.screen.width / 2) - ((cardNames.length - 1) * cardSpacing / 2)
    
    card.position.set(startX + index * cardSpacing, app.screen.height - 100)
    card.scale.set(0.15) // Made cards even smaller
    
    // Store original position and rotation
    card.originalX = card.position.x
    card.originalY = card.position.y
    card.originalRotation = (index - 2) * 0.06 // Smaller rotation for smaller cards
    card.originalScale = 0.15
    card.cardIndex = index
    card.isPlayed = false
    card.arenaPosition = null // Track position in arena
    
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

  // // Add title text
  // const title = new Graphics()
  //   .roundRect(50, 30, 300, 60, 10)
  //   .fill(0x34495e)
  //   .stroke({ color: 0xecf0f1, width: 2 })
  
  // app.stage.addChild(title)
  
  // // Add instructions
  // const instructions = new Graphics()
  //   .roundRect(50, app.screen.height - 60, 500, 40, 8)
  //   .fill(0x34495e)
  //   .stroke({ color: 0xecf0f1, width: 2 })
  
  // app.stage.addChild(instructions)
}

function onCardHover(event) {
  if (!dragTarget && !event.currentTarget.isPlayed) {
    const card = event.currentTarget
    
    // Bring card to front
    card.parent.setChildIndex(card, card.parent.children.length - 1)
    
    card.scale.set(0.25)
    card.position.y = card.originalY - 80
    card.rotation = 0
  }
}

function onCardOut(event) {
  if (!dragTarget && !event.currentTarget.isPlayed) {
    event.currentTarget.scale.set(event.currentTarget.originalScale)
    event.currentTarget.position.y = event.currentTarget.originalY
    event.currentTarget.rotation = event.currentTarget.originalRotation
  }
}

function onCardDragStart(event) {
  if (event.currentTarget.isPlayed) return
  
  dragTarget = event.currentTarget
  dragData = event.data
  
  // Store the initial mouse position relative to the card
  const globalPos = event.data.global
  dragTarget.dragOffset = {
    x: globalPos.x - dragTarget.position.x,
    y: globalPos.y - dragTarget.position.y
  }
  
  // Bring card to front and make it larger while dragging
  dragTarget.parent.setChildIndex(dragTarget, dragTarget.parent.children.length - 1)
  dragTarget.scale.set(0.18)
  dragTarget.rotation = 0
  dragTarget.alpha = 0.8
  
  console.log(`Started dragging card ${dragTarget.cardIndex + 1}`)
}

function onDragMove(event) {
  if (dragTarget) {
    const globalPos = event.data.global
    dragTarget.position.x = globalPos.x - dragTarget.dragOffset.x
    dragTarget.position.y = globalPos.y - dragTarget.dragOffset.y
  }
}

function onDragEnd(event) {
  if (dragTarget) {
    const card = dragTarget
    
    // Check if card is dropped above the hand area (anywhere above y = screen height - 200)
    if (card.position.y < app.screen.height - 200) {
      // Card dropped in play area - play it
      playCardInArena(card)
    } else {
      // Card dropped in hand area - return to hand
      returnCardToHand(card)
    }
    
    dragTarget = null
    dragData = null
  }
}

function playCardInArena(card) {
  console.log(`Card ${card.cardIndex + 1} played in arena!`)
  
  // Check if arena is full (6 cards max)
  if (arenaCards.length >= 6) {
    console.log('Arena is full! Returning card to hand.')
    returnCardToHand(card)
    return
  }
  
  card.isPlayed = true
  card.alpha = 1
  
   
  const occupiedPositions = arenaCards.map(c => c.arenaPosition).filter(pos => pos !== null);

  let found = false;
  [2,3,1,4,0,5].forEach((position, index) => {
    if (!found && !occupiedPositions.includes(position)) {
      card.arenaPosition = position
      found = true;
    }
  })

  arenaCards.push(card)
     
  console.log(`Card ${card.cardIndex + 1} assigned to arena position ${card.arenaPosition}`)
  
  // Move card to arena container
  card.parent.removeChild(card)
  arenaContainer.addChild(card)
  
  // Add click handler for removing card from arena
  card.removeAllListeners() // Clear previous event listeners
  card.eventMode = 'static'
  card.cursor = 'pointer'
  card.on('pointerdown', () => removeCardFromArena(card))
  
  // Calculate target position in the row (6 fixed spaces, no overlap)
  const cardSpacing = 180 // Increased spacing to prevent overlap
  const rowWidth = 5 * cardSpacing // 6 cards = 5 spaces between them
  const startX = (app.screen.width / 2) - (rowWidth / 2)
  const targetX = startX + (card.arenaPosition * cardSpacing)
  const targetY = app.screen.height / 2 - 50 // Above center of arena
  
  const animate = () => {
    const dx = targetX - card.position.x
    const dy = targetY - card.position.y
    const dScale = 0.15 - card.scale.x // Target scale for arena cards
    
    card.position.x += dx * 0.12
    card.position.y += dy * 0.12
    card.scale.x += dScale * 0.12
    card.scale.y += dScale * 0.12
    
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(dScale) > 0.01) {
      requestAnimationFrame(animate)
    } else {
      card.position.x = targetX
      card.position.y = targetY
      card.scale.set(0.15)
      
      // Cards stay in arena permanently - no auto return
    }
  }
  
  animate()
}

function removeCardFromArena(card) {
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
  const animate = () => {
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

function returnCardToHand(card) {
  card.alpha = 1
  
  const animate = () => {
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
