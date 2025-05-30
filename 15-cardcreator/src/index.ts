import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { CardData, CardsFile, CardGeneratorConfig } from './types';

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

    private drawScaledText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        targetSize: number,
        weight: string = 'normal',
        fillColor: string = '#FFFFFF',
        strokeColor: string = '#000000',
        strokeWidth: number = 4
    ): void {
        // Save the current state
        ctx.save();

        // Use a base font size that works, then scale to get the desired size
        const baseFontSize = 20; // This size seems to work consistently
        const scaleFactor = targetSize / baseFontSize;

        // Set the base font
        ctx.font = `${weight} ${baseFontSize}px Arial`;

        // Scale the context to achieve the desired size
        ctx.scale(scaleFactor, scaleFactor);

        // Adjust coordinates for the scaled context
        const scaledX = x / scaleFactor;
        const scaledY = y / scaleFactor;

        // Draw stroke first (outline)
        if (strokeWidth > 0) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth / scaleFactor; // Scale stroke width too
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(text, scaledX, scaledY);
        }

        // Draw fill on top
        ctx.fillStyle = fillColor;
        ctx.fillText(text, scaledX, scaledY);

        // Restore the state
        ctx.restore();

        // Debug: Calculate what the "effective" size should be
        console.log(`"${text}" - Effective size: ${targetSize}px (${baseFontSize}px × ${scaleFactor.toFixed(2)})`);
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

    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseFontSize: number, scaleFactor: number): string[] {
        // Set up context for measuring
        ctx.save();
        ctx.font = `normal ${baseFontSize}px Arial`;

        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0];

        // Adjust maxWidth for the scaled context
        const scaledMaxWidth = maxWidth / scaleFactor;

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < scaledMaxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        ctx.restore();
        return lines;
    }

    async generateCard(cardData: CardData): Promise<string> {
        try {
            const canvas: Canvas = createCanvas(this.cardWidth, this.cardHeight);
            const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

            // No background fill - keep transparent

            // Draw hero image as background
            try {
                const heroImagePath = path.join(this.heroImagesPath, cardData.heroImageName);
                const heroImage = await loadImage(heroImagePath);

                const heroSize = 300;
                const aspectRatio = heroImage.width / heroImage.height;
                const heroX = (this.cardWidth - heroSize) / 2;
                const heroY = (this.cardHeight - heroSize) / 2 - 50;
                const heroWidth = heroSize;
                const heroHeight = heroSize / aspectRatio;
                ctx.drawImage(heroImage, heroX, heroY, heroWidth, heroHeight);
                console.log(`✓ Loaded hero image: ${cardData.heroImageName}`);
            } catch (error) {
                console.log(`Hero image ${cardData.heroImageName} not found, creating placeholder background...`);
                const gradient = ctx.createLinearGradient(0, 0, 0, this.cardHeight);
                gradient.addColorStop(0, '#4A4A4A');
                gradient.addColorStop(1, '#2A2A2A');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, this.cardWidth, this.cardHeight);
            }

            // Draw base card image on top
            try {
                const baseImage = await loadImage(this.baseImagePath);
                ctx.drawImage(baseImage, 0, 0, this.cardWidth, this.cardHeight);
                console.log('✓ Loaded base card image');
            } catch (error) {
                console.log('Base image not found, skipping overlay...');
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, this.cardWidth - 2, this.cardHeight - 2);
            }

            // Draw card title (HUGE - 60px, white, normal weight)
            ctx.textAlign = 'center';
            this.drawScaledText(ctx, cardData.title, this.cardWidth / 2, 70, 60, 'normal', '#FFFFFF', '#000000', 8);

            // Draw level (LARGE - 50px, white, normal weight)
            ctx.textAlign = 'center';
            this.drawScaledText(ctx, cardData.level.toString(), 60, 120, 50, 'normal', '#FFFFFF', '#000000', 6);

            // Draw attack and health (MASSIVE - 70px, white, normal weight)
            const attackX = 50;
            const healthX = 350;
            const statsY = 570;

            ctx.textAlign = 'center';

            // Attack
            this.drawScaledText(ctx, cardData.attack.toString(), attackX, statsY, 70, 'normal', '#FFFFFF', '#000000', 8);

            // Health
            this.drawScaledText(ctx, cardData.health.toString(), healthX, statsY, 70, 'normal', '#FFFFFF', '#000000', 8);

            // Draw description (LARGER - 28px, white, normal weight)
            ctx.textAlign = 'left';

            const descFontSize = 28;
            const baseFontSize = 20;
            const descScaleFactor = descFontSize / baseFontSize;
            const descLineHeight = 32;
            const descLines = this.wrapText(ctx, cardData.description, 300, baseFontSize, descScaleFactor);
            let descY = 390;

            descLines.forEach(line => {
                this.drawScaledText(ctx, line, 50, descY, descFontSize, 'normal', '#FFFFFF', '#000000', 5);
                descY += descLineHeight;
            });

            // Draw special effects (LARGE - 30px header, 24px items, white, normal weight)
            if (cardData.specialEffects && cardData.specialEffects.length > 0) {
                this.drawScaledText(ctx, 'Special Effects:', 50, descY + 35, 30, 'normal', '#FFFFFF', '#000000', 5);

                const effectFontSize = 24;
                const effectScaleFactor = effectFontSize / baseFontSize;
                const effectLineHeight = 28;
                let effectY = descY + 70;

                cardData.specialEffects.forEach((effect: string) => {
                    const effectLines = this.wrapText(ctx, `• ${effect}`, 300, baseFontSize, effectScaleFactor);
                    effectLines.forEach(line => {
                        this.drawScaledText(ctx, line, 50, effectY, effectFontSize, 'normal', '#FFFFFF', '#000000', 4);
                        effectY += effectLineHeight;
                    });
                    effectY += 12;
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
            console.log('🎴 Starting card generation with transparent background and white text...\n');

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

// Run the card generator
async function main(): Promise<void> {
    const generator = new CardGenerator();

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