import './style.css'
import { Application, Assets, Sprite, Container, Graphics } from 'pixi.js'

// Create the application
const app = new Application()

// Initialize the application
async function init() {
  await app.init({
    width: 1200,
    height: 800,
    backgroundColor: 0x2c3e50,
    antialias: true
  })

  // Add the canvas to the DOM
  document.querySelector('#game-container').appendChild(app.canvas)

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

function createGameScene() {
  // Create arena background
  const arena = Sprite.from('arena')
  arena.anchor.set(0.5)
  arena.position.set(app.screen.width / 2, app.screen.height / 2)
  arena.scale.set(0.8)
  app.stage.addChild(arena)

  // Create card container
  const cardContainer = new Container()
  app.stage.addChild(cardContainer)

  // Create cards in a hand formation
  const cardNames = ['card1', 'card2', 'card3', 'card4', 'card5']
  const cards = []

  cardNames.forEach((cardName, index) => {
    const card = Sprite.from(cardName)
    card.anchor.set(0.5)
    
    // Position cards in a fan layout at the bottom
    const cardSpacing = 120
    const startX = (app.screen.width / 2) - ((cardNames.length - 1) * cardSpacing / 2)
    
    card.position.set(startX + index * cardSpacing, app.screen.height - 150)
    card.scale.set(0.3)
    
    // Add slight rotation for fan effect
    card.rotation = (index - 2) * 0.1
    
    // Make cards interactive
    card.eventMode = 'static'
    card.cursor = 'pointer'
    
    // Add hover effects
    card.on('pointerover', () => {
      card.scale.set(0.35)
      card.position.y = app.screen.height - 170
    })
    
    card.on('pointerout', () => {
      card.scale.set(0.3)
      card.position.y = app.screen.height - 150
    })
    
    card.on('pointerdown', () => {
      console.log(`Card ${index + 1} clicked!`)
      // Add card play animation here
      playCard(card, index)
    })
    
    cardContainer.addChild(card)
    cards.push(card)
  })

  // Add title text
  const title = new Graphics()
    .roundRect(50, 30, 300, 60, 10)
    .fill(0x34495e)
    .stroke({ color: 0xecf0f1, width: 2 })
  
  app.stage.addChild(title)
  
  // Add instructions
  const instructions = new Graphics()
    .roundRect(50, app.screen.height - 100, 400, 50, 8)
    .fill(0x34495e)
    .stroke({ color: 0xecf0f1, width: 2 })
  
  app.stage.addChild(instructions)
}

function playCard(card, cardIndex) {
  // Simple card play animation
  const originalY = card.position.y
  const targetY = app.screen.height / 2
  
  // Animate card to center
  const animate = () => {
    card.position.y -= 5
    card.scale.x += 0.02
    card.scale.y += 0.02
    card.rotation = 0
    
    if (card.position.y > targetY) {
      requestAnimationFrame(animate)
    } else {
      // After a delay, return card to hand
      setTimeout(() => {
        returnCard(card, originalY)
      }, 1000)
    }
  }
  
  animate()
}

function returnCard(card, originalY) {
  const animate = () => {
    card.position.y += 5
    card.scale.x -= 0.02
    card.scale.y -= 0.02
    
    if (card.position.y < originalY) {
      requestAnimationFrame(animate)
    } else {
      card.position.y = originalY
      card.scale.set(0.3)
    }
  }
  
  animate()
}

// Start the application
init()
