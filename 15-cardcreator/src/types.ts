export interface CardData {
    id: number;
    title: string;
    description: string;
    level: number;
    health: number;
    attack: number;
    specialEffects?: string[];
    heroImageName: string;
}

export interface CardsFile {
    cards: CardData[];
}

export interface CardGeneratorConfig {
    cardWidth: number;
    cardHeight: number;
    baseImagePath: string;
    heroImagesPath: string;
    outputPath: string;
} 