import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { CardData, CardsFile, CardGeneratorConfig, BaseConfig } from './types';

class CardGenerator {
    private cardWidth: number;
    private cardHeight: number;
    private baseImagePath: string;
    private heroImagesPath: string;
    private outputPath: string;
    private scaleFactor: number;
    private baseConfig: BaseConfig | null = null;

    constructor(config?: Partial<CardGeneratorConfig>) {
        // Use the dimensions from cards.json base config, with fallback defaults
        this.cardWidth = config?.cardWidth || 909;
        this.cardHeight = config?.cardHeight || 1382;
        this.scaleFactor = 1; // Will be set based on actual vs default dimensions
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
        fontSize: number,
        weight: string = 'normal',
        fillColor?: string,
        strokeColor?: string,
        strokeWidth?: number,
        textAlign: CanvasTextAlign = 'center',
        textBaseline: CanvasTextBaseline = 'middle'
    ): void {
        ctx.save();

        // Use base config values if not provided
        const actualFillColor = fillColor || this.baseConfig?.fontColor || '#FFFFFF';
        const actualStrokeColor = strokeColor || this.baseConfig?.fontStrokeColor || '#000000';

        // Calculate proportional stroke width based on font size
        let actualStrokeWidth: number;
        if (strokeWidth !== undefined) {
            actualStrokeWidth = strokeWidth;
        } else if (this.baseConfig?.fontStrokeWidthForSize100) {
            // Scale stroke width proportionally: (fontSize / 100) * baseStrokeWidth
            actualStrokeWidth = (fontSize / 100) * this.baseConfig.fontStrokeWidthForSize100;
        } else {
            actualStrokeWidth = 2; // fallback
        }

        // Set text alignment to center the text at the given coordinates
        ctx.textAlign = textAlign;
        ctx.textBaseline = textBaseline;
        ctx.font = `${weight} ${fontSize}px Arial`;

        // Draw stroke first (outline)
        if (actualStrokeWidth > 0) {
            ctx.strokeStyle = actualStrokeColor;
            ctx.lineWidth = actualStrokeWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(text, x, y);
        }

        // Draw fill on top
        ctx.fillStyle = actualFillColor;
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
        ctx.save();
        ctx.font = `normal ${fontSize}px Arial`;

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

        ctx.restore();
        return lines;
    }

    private drawMultilineText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        fontSize: number,
        lineHeight: number,
        weight: string = 'normal',
        fillColor?: string,
        strokeColor?: string,
        strokeWidth?: number,
        textAlign: CanvasTextAlign = 'center'
    ): void {
        const lines = this.wrapText(ctx, text, maxWidth, fontSize);

        // Calculate starting Y position to center the text block vertically
        const totalHeight = lines.length * lineHeight;
        let startY = y - (totalHeight / 2) + (lineHeight / 2);

        lines.forEach((line, index) => {
            this.drawScaledText(
                ctx,
                line,
                x,
                startY + (index * lineHeight),
                fontSize,
                weight,
                fillColor,
                strokeColor,
                strokeWidth,
                textAlign,
                'middle'
            );
        });
    }

    async loadCardData(): Promise<CardsFile> {
        try {
            const data = fs.readFileSync('./cards.json', 'utf8');
            const cardsFile = JSON.parse(data) as CardsFile;

            // Store base config for use in generation
            this.baseConfig = cardsFile.base;

            // Update card dimensions based on base config
            this.cardWidth = cardsFile.base.backImage.width;
            this.cardHeight = cardsFile.base.backImage.height;

            return cardsFile;
        } catch (error) {
            console.error('Error loading card data:', error);
            throw error;
        }
    }

    async generateCard(cardData: CardData): Promise<string> {
        if (!this.baseConfig) {
            throw new Error('Base config not loaded. Call loadCardData() first.');
        }

        try {
            const canvas: Canvas = createCanvas(this.cardWidth, this.cardHeight);
            const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

            // Draw base card image first
            try {
                const baseImageName = this.baseConfig.backImage.imageName;
                const baseImagePath = path.join('./assets/', baseImageName);
                const baseImage = await loadImage(baseImagePath);
                ctx.drawImage(baseImage, 0, 0, this.cardWidth, this.cardHeight);
                console.log('✓ Loaded base card image:', baseImageName);
            } catch (error) {
                console.log('Base image not found, skipping overlay...');
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, this.cardWidth - 2, this.cardHeight - 2);
            }

            // Draw hero image on top of base card
            try {
                const heroImagePath = path.join(this.heroImagesPath, cardData.heroImageName);
                const heroImage = await loadImage(heroImagePath);

                const heroConfig = this.baseConfig.heroImage;

                // Calculate the crop area (remove bottom pixels)
                const cropHeight = heroImage.height - cardData.heroImageBottomCutoff;
                const sourceX = 0;
                const sourceY = 0;
                const sourceWidth = heroImage.width;
                const sourceHeight = cropHeight;

                // Calculate destination position (centered on x,y coordinates)
                const destX = heroConfig.x - (heroConfig.width / 2);
                const destY = heroConfig.y - (heroConfig.height / 2);
                const destWidth = heroConfig.width;
                const destHeight = heroConfig.height;

                ctx.drawImage(
                    heroImage,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    destX, destY, destWidth, destHeight
                );
                console.log(`✓ Loaded and cropped hero image: ${cardData.heroImageName}`);
            } catch (error) {
                console.log(`Hero image ${cardData.heroImageName} not found, creating placeholder background...`);
                // Draw placeholder background
                const heroConfig = this.baseConfig.heroImage;
                const destX = heroConfig.x - (heroConfig.width / 2);
                const destY = heroConfig.y - (heroConfig.height / 2);

                const gradient = ctx.createLinearGradient(destX, destY, destX, destY + heroConfig.height);
                gradient.addColorStop(0, '#4A4A4A');
                gradient.addColorStop(1, '#2A2A2A');
                ctx.fillStyle = gradient;
                ctx.fillRect(destX, destY, heroConfig.width, heroConfig.height);
            }

            // Draw texts using positions from base config
            const { levelText, healthText, attackText, titleText, descriptionText, specialEffects } = this.baseConfig;

            // Draw level
            this.drawScaledText(
                ctx,
                cardData.level.toString(),
                levelText.x,
                levelText.y,
                levelText.fontSize,
                'bold',
                levelText.fontColor
            );

            // Draw attack
            this.drawScaledText(
                ctx,
                cardData.attack.toString(),
                attackText.x,
                attackText.y,
                attackText.fontSize,
                'bold',
                attackText.fontColor
            );

            // Draw health
            this.drawScaledText(
                ctx,
                cardData.health.toString(),
                healthText.x,
                healthText.y,
                healthText.fontSize,
                'bold',
                healthText.fontColor
            );

            // Draw title (might need wrapping)
            if (titleText.width && titleText.height) {
                this.drawMultilineText(
                    ctx,
                    cardData.title,
                    titleText.x,
                    titleText.y,
                    titleText.width,
                    titleText.fontSize,
                    titleText.fontSize + 5,
                    'bold',
                    titleText.fontColor
                );
            } else {
                this.drawScaledText(
                    ctx,
                    cardData.title,
                    titleText.x,
                    titleText.y,
                    titleText.fontSize,
                    'bold',
                    titleText.fontColor
                );
            }

            // Draw description
            if (descriptionText.width && descriptionText.height) {
                this.drawMultilineText(
                    ctx,
                    cardData.description,
                    descriptionText.x,
                    descriptionText.y,
                    descriptionText.width,
                    descriptionText.fontSize,
                    descriptionText.fontSize + 4,
                    'normal',
                    descriptionText.fontColor
                );
            }

            // Draw special effects if they exist
            if (cardData.specialEffects && cardData.specialEffects.length > 0 && specialEffects.width && specialEffects.height) {
                const effectsText = cardData.specialEffects.join('\n');
                this.drawMultilineText(
                    ctx,
                    effectsText,
                    specialEffects.x,
                    specialEffects.y,
                    specialEffects.width,
                    specialEffects.fontSize,
                    specialEffects.fontSize + 4,
                    'italic',
                    specialEffects.fontColor
                );
            }

            // Save the generated card
            const outputFileName = `${cardData.title.replace(/\s+/g, '_').toLowerCase()}_card.png`;
            const outputPath = path.join(this.outputPath, outputFileName);

            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);

            console.log(`✓ Generated card: ${outputFileName} at ${this.cardWidth}x${this.cardHeight} resolution`);
            return outputPath;
        } catch (error) {
            console.error(`Error generating card for ${cardData.title}:`, error);
            throw error;
        }
    }

    async generateAllCards(): Promise<string[]> {
        try {
            console.log(`🎴 Starting card generation...\n`);

            const cardDataFile = await this.loadCardData();
            const generatedCards: string[] = [];
            const gameCards: any[] = [];

            console.log(`📏 Using dimensions: ${this.cardWidth}x${this.cardHeight} pixels`);

            for (const card of cardDataFile.cards) {
                console.log(`Generating card: ${card.title}`);
                const outputPath = await this.generateCard(card);
                generatedCards.push(outputPath);

                // Create game card data (excluding visual/generation-specific properties)
                const outputFileName = `${card.title.replace(/\s+/g, '_').toLowerCase()}_card.png`;
                const gameCard = {
                    id: card.id,
                    title: card.title,
                    description: card.description,
                    level: card.level,
                    health: card.health,
                    attack: card.attack,
                    specialEffects: card.specialEffects || [],
                    imageFileName: outputFileName
                };
                gameCards.push(gameCard);
            }

            // Write game cards JSON file
            const gameCardsPath = path.join(this.outputPath, 'gamecards.json');
            const gameCardsData = {
                cards: gameCards
            };
            fs.writeFileSync(gameCardsPath, JSON.stringify(gameCardsData, null, 2));

            console.log(`\n🎉 Successfully generated ${generatedCards.length} cards!`);
            console.log('📁 Output directory:', this.outputPath);
            console.log(`📏 Resolution: ${this.cardWidth}x${this.cardHeight} pixels`);
            console.log('Generated files:');
            generatedCards.forEach(cardPath => {
                console.log(`  - ${path.basename(cardPath)}`);
            });
            console.log(`  - gamecards.json (game engine data)`);

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