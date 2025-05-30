const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

class CardGenerator {
  constructor() {
    this.cardWidth = 400;
    this.cardHeight = 600;
    this.baseImagePath = './assets/base_card.png';
    this.heroImagesPath = './assets/heroes/';
    this.outputPath = './output/';
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }
  }

  async loadCardData() {
    try {
      const data = fs.readFileSync('./cards.json', 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading card data:', error);
      throw error;
    }
  }

  wrapText(ctx, text, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  drawTextWithOutline(ctx, text, x, y, fillColor = '#FFFFFF', strokeColor = '#000000', strokeWidth = 4) {
    // ctx.fillStyle  = fillColor;
    // ctx.fillText(text, x, y);

    // ctx.strokeStyle = strokeColor;
    // ctx.lineWidth   = strokeWidth;
    // ctx.lineJoin    = 'round';
    // ctx.miterLimit  = 2;
    ctx.font = 'normal 16px Roboto';
    

    // ctx.strokeText(text, x, y);
  }

  async generateCard(cardData) {
    try {
      const canvas = createCanvas(this.cardWidth, this.cardHeight);
      const ctx = canvas.getContext('2d');


      // Draw a background gradient
      //make hero background dark yellow
      // ctx.fillStyle = '#ff0000';
      // const herobackmargins=[50, 100, 50, 100];
      // ctx.fillRect(herobackmargins[0], herobackmargins[1], this.cardWidth - herobackmargins[0] - herobackmargins[2], this.cardHeight - herobackmargins[1] - herobackmargins[3]);

      // Draw hero image as background
      try {
        const heroImagePath = path.join(this.heroImagesPath, cardData.heroImageName);
        const heroImage = await loadImage(heroImagePath);
        
        // Draw hero image smaller in the center of the card, 
        // ensuring the aspect ratio is maintained and the image is not cut off
        const heroSize = 300;
        const aspectRatio = heroImage.width / heroImage.height;
        const heroX = (this.cardWidth - heroSize) / 2;
        const heroY = (this.cardHeight - heroSize) / 2 -50; // Add 100 to the y-coordinate to move the image down
        const heroWidth = heroSize;
        const heroHeight = heroSize / aspectRatio;
        ctx.drawImage(heroImage, heroX, heroY, heroWidth, heroHeight);
        console.log(`✓ Loaded hero image: ${cardData.heroImageName}`);
      } catch (error) {
        console.log(`Hero image ${cardData.heroImageName} not found, creating placeholder background...`);
        // Create placeholder background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.cardHeight);
        gradient.addColorStop(0, '#4A4A4A');
        gradient.addColorStop(1, '#2A2A2A');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.cardWidth, this.cardHeight);
      }

      // SECOND: Draw base card image on top (should be transparent where hero shows through)
      try {
        const baseImage = await loadImage(this.baseImagePath);
        ctx.drawImage(baseImage, 0, 0, this.cardWidth, this.cardHeight);
        console.log('✓ Loaded base card image');
      } catch (error) {
        console.log('Base image not found, skipping overlay...');
        // If no base card, just add a subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.cardWidth - 2, this.cardHeight - 2);
      }

      // Draw card title (VERY LARGE)
      ctx.font = 'normal 36px Roboto';
      ctx.textAlign = 'center';
      this.drawTextWithOutline(ctx, cardData.title, this.cardWidth / 2, 60, '#FFFFFF', '#000000', 6);

      // Draw level (VERY LARGE)
      ctx.font = 'normal 30px Roboto';
      ctx.textAlign = 'center';
      this.drawTextWithOutline(ctx, cardData.level.toString(), 60, 95, '#FFFFFF', '#000000', 5);


      // Draw attack and health (VERY LARGE NUMBERS)
      const attackX = 50;
      const healthX = 350;
      const statsY = 570;

      ctx.font = 'normal 40px Arial';
      ctx.textAlign = 'center';
      
      // Attack
      this.drawTextWithOutline(ctx, cardData.attack.toString(), attackX, statsY, '#FFFFFF', '#000000', 6);

      // Health
      this.drawTextWithOutline(ctx, cardData.health.toString(), healthX, statsY, '#FFFFFF', '#000000', 6);

      // Draw description (LARGE TEXT)
      ctx.font = 'normal 18px Roboto';
      ctx.textAlign = 'left';
      
      const descLineHeight = 22;
      const descLines = this.wrapText(ctx, cardData.description, 300, descLineHeight);
      let descY = 370;
      
      descLines.forEach(line => {
        this.drawTextWithOutline(ctx, line, 50, descY, '#FFFFFF', '#000000', 4);
        descY += descLineHeight;
      });

      // Draw special effects (LARGE TEXT)
      if (cardData.specialEffects && cardData.specialEffects.length > 0) {
        ctx.font = 'normal 20px Roboto';
        this.drawTextWithOutline(ctx, 'Special Effects:', 50, descY + 25, '#FFD700', '#000000', 4);
        
        ctx.font = 'normal 16px Roboto';
        
        const effectLineHeight = 20;
        let effectY = descY + 55;
        cardData.specialEffects.forEach((effect, index) => {
          const effectLines = this.wrapText(ctx, `• ${effect}`, 300, effectLineHeight);
          effectLines.forEach(line => {
            this.drawTextWithOutline(ctx, line, 50, effectY, '#FFFFFF', '#000000', 3);
            effectY += effectLineHeight;
          });
          effectY += 8;
        });
      }

      ctx.font = 'normal 48px "Roboto"';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'red';
      ctx.strokeText("Hello world", 50, 100);      
      ctx.fillStyle = 'blue';
      ctx.fillText("Hello world", 50, 100);      

      // Save the generated card
      const outputFileName = `${cardData.title.replace(/\s+/g, '_').toLowerCase()}_card.png`;
      const outputPath = path.join(this.outputPath, outputFileName);
      
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✓ Generated card: ${outputFileName}`);
      return outputPath;
    } catch (error) {
      console.error(`Error generating card for ${cardData.title}:`, error);
      throw error;
    }
  }

  async generateAllCards() {
    try {
      console.log('🎴 Starting card generation...\n');
      
      const cardData = await this.loadCardData();
      const generatedCards = [];

      for (const card of cardData.cards) {
        console.log(`Generating card: ${card.title}`);
        const outputPath = await this.generateCard(card);
        generatedCards.push(outputPath);
      }

      console.log(`\n🎉 Successfully generated ${generatedCards.length} cards!`);
      console.log('📁 Output directory:', this.outputPath);
      console.log('Generated files:');
      generatedCards.forEach(cardPath => {
        console.log(`  - ${path.basename(cardPath)}`);
      });

      return generatedCards;
    } catch (error) {
      console.error('❌ Error during card generation:', error);
      throw error;
    }
  }
}

function loadFonts() {
  registerFont('./Roboto/static/Roboto-Regular.ttf', { family: 'Roboto' }); 
  console.log('✓ Loaded Roboto font');
}

// Run the card generator
async function main() {
  const generator = new CardGenerator();
  loadFonts();

  try {
    await generator.generateAllCards();
  } catch (error) {
    console.error('Failed to generate cards:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = CardGenerator; 