import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { CardData, CardsFile, CardGeneratorConfig } from './types';

class CardGenerator {
    private cardWidth: number;
    private cardHeight: number;
    private baseImagePath: string;
    private heroImagesPath: string;
    private outputPath: string;

    constructor(config?: Partial<CardGeneratorConfig>) {
        this.cardWidth = config?.cardWidth || 400;
        this.cardHeight = config?.cardHeight || 600;
        this.baseImagePath = config?.baseImagePath || './assets/base_card.png';
        this.heroImagesPath = config?.heroImagesPath || './assets/heroes/';
        this.outputPath = config?.outputPath || './output/';

        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    }

    async loadCardData(): Promise<CardsFile> {
        try {
            const data = fs.readFileSync('./cards.json', 'utf8');
            return JSON.parse(data) as CardsFile;
        } catch (error) {
            console.error('Error loading card data:', error);
            throw error;
        }
    }

    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
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

    private drawTextWithOutline(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        fillColor: string = '#FFFFFF',
        strokeColor: string = '#000000',
        strokeWidth: number = 4
    ): void {
        // Note: The original implementation seems to have placeholder/debug code
        // This is a proper implementation for text with outline
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        // Draw stroke first
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(text, x, y);

        // Draw fill on top
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
    }

    async generateCard(cardData: CardData): Promise<string> {
        try {
            const canvas: Canvas = createCanvas(this.cardWidth, this.cardHeight);
            const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

            // Draw hero image as background
            try {
                const heroImagePath = path.join(this.heroImagesPath, cardData.heroImageName);
                const heroImage = await loadImage(heroImagePath);

                // Draw hero image smaller in the center of the card, 
                // ensuring the aspect ratio is maintained and the image is not cut off
                const heroSize = 300;
                const aspectRatio = heroImage.width / heroImage.height;
                const heroX = (this.cardWidth - heroSize) / 2;
                const heroY = (this.cardHeight - heroSize) / 2 - 50; // Move the image up by 50px
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

            // Draw base card image on top (should be transparent where hero shows through)
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
                cardData.specialEffects.forEach((effect: string) => {
                    const effectLines = this.wrapText(ctx, `• ${effect}`, 300, effectLineHeight);
                    effectLines.forEach(line => {
                        this.drawTextWithOutline(ctx, line, 50, effectY, '#FFFFFF', '#000000', 3);
                        effectY += effectLineHeight;
                    });
                    effectY += 8;
                });
            }

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

    async generateAllCards(): Promise<string[]> {
        try {
            console.log('🎴 Starting card generation...\n');

            const cardDataFile = await this.loadCardData();
            const generatedCards: string[] = [];

            for (const card of cardDataFile.cards) {
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

function loadFonts(): void {
    try {
        registerFont('./Roboto/static/Roboto-Regular.ttf', { family: 'Roboto' });
        console.log('✓ Loaded Roboto font');
    } catch (error) {
        console.warn('⚠️ Could not load Roboto font, using system default');
    }
}

// Run the card generator
async function main(): Promise<void> {
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

export default CardGenerator; 