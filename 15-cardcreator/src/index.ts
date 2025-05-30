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

    private drawCurvedText(
        ctx: CanvasRenderingContext2D,
        text: string,
        centerX: number,
        centerY: number,
        radius: number,
        targetSize: number,
        weight: string = 'normal',
        fillColor: string = '#FFFFFF',
        strokeColor: string = '#000000',
        strokeWidth: number = 4
    ): void {
        ctx.save();

        const baseFontSize = 20;
        const scaleFactor = targetSize / baseFontSize;
        ctx.font = `${weight} ${baseFontSize}px Arial`;

        // Don't scale the entire context, just the font
        ctx.font = `${weight} ${targetSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate the total arc span for the text
        const totalTextWidth = ctx.measureText(text).width;
        const circumference = 2 * Math.PI * radius;
        const arcSpan = (totalTextWidth / circumference) * 2 * Math.PI;
        const anglePerChar = arcSpan / text.length;
        const startAngle = -arcSpan / 2;

        console.log(`Curved text: "${text}" - Size: ${targetSize}px, Radius: ${radius}px`);

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const angle = startAngle + anglePerChar * (i + 0.5);

            const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
            const y = centerY + Math.sin(angle - Math.PI / 2) * radius;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            // Draw stroke first
            if (strokeWidth > 0) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.miterLimit = 2;
                ctx.strokeText(char, 0, 0);
            }

            // Draw fill on top
            ctx.fillStyle = fillColor;
            ctx.fillText(char, 0, 0);

            ctx.restore();
        }

        ctx.restore();
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

            // Draw card title (smaller and slightly curved - 40px, white, normal weight) - positioned below hero over curved banner
            ctx.textAlign = 'center';
            this.drawCurvedText(ctx, cardData.title, this.cardWidth / 2, 650, 300, 40, 'normal', '#FFFFFF', '#000000', 6);

            // Draw level (positioned over blue icon in center - 45px, white, normal weight)
            ctx.textAlign = 'center';
            this.drawScaledText(ctx, cardData.level.toString(), this.cardWidth / 2, 110, 50, 'normal', '#FFFFFF', '#000000', 5);

            // Draw attack and health (positioned directly over placeholders - 60px, white, normal weight)
            const attackX = 55;
            const healthX = 345;
            const statsY = 572; // Moved up slightly to sit properly over placeholders

            ctx.textAlign = 'center';

            // Attack
            this.drawScaledText(ctx, cardData.attack.toString(), attackX, statsY, 40, 'normal', '#FFFFFF', '#000000', 6);

            // Health
            this.drawScaledText(ctx, cardData.health.toString(), healthX, statsY, 40, 'normal', '#FFFFFF', '#000000', 6);

            // Draw description (even smaller - 18px, white, normal weight)
            ctx.textAlign = 'left';

            const descFontSize = 18; // Reduced from 22
            const baseFontSize = 20;
            const descScaleFactor = descFontSize / baseFontSize;
            const descLineHeight = 22; // Reduced from 26
            const descLines = this.wrapText(ctx, cardData.description
                + (cardData.specialEffects ? cardData.specialEffects.join(', ') : '')
                , 300, baseFontSize, descScaleFactor);
            let descY = 400; // Adjusted starting position

            descLines.forEach(line => {
                this.drawScaledText(ctx, line, 50, descY, descFontSize, 'normal', '#FFFFFF', '#000000', 3);
                descY += descLineHeight;
            });


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

main();

export default CardGenerator; 