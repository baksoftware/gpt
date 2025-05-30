export interface CardData {
    id: number;
    title: string;
    description: string;
    level: number;
    health: number;
    attack: number;
    specialEffects?: string[];
    heroImageName: string;
    heroImageBottomCutoff: number;
}

export interface TextConfig {
    x: number;
    y: number;
    fontSize: number;
    width?: number;
    height?: number;
}

export interface ImageConfig {
    imageName: string;
    width: number;
    height: number;
}

export interface HeroImageConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BaseConfig {
    backImage: ImageConfig;
    heroImage: HeroImageConfig;
    levelText: TextConfig;
    healthText: TextConfig;
    attackText: TextConfig;
    descriptionText: TextConfig;
    titleText: TextConfig;
    specialEffects: TextConfig;
}

export interface CardsFile {
    base: BaseConfig;
    cards: CardData[];
}

export interface CardGeneratorConfig {
    cardWidth: number;
    cardHeight: number;
    baseImagePath: string;
    heroImagesPath: string;
    outputPath: string;
} 