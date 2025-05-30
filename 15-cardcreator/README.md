# Card Creator - Hearthstone-Style Game Cards

A TypeScript/Node.js program that generates beautiful PNG game cards similar to
Hearthstone style, with customizable text, stats, and hero images.

## Features

- 🎴 Generate beautiful game cards with custom layouts
- 📊 Display card stats (level, attack, health)
- 🖼️ Support for hero images and base card backgrounds
- 📝 Automatic text wrapping for descriptions and special effects
- 🎨 Attractive styling with gradients, borders, and badges
- 📁 Batch processing of multiple cards from JSON data
- ⚡ TypeScript support with full type safety

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For canvas to work properly on macOS, you might need:**
   ```bash
   # If you encounter canvas installation issues
   brew install pkg-config cairo pango libpng jpeg giflib librsvg
   ```

## Usage

### Basic Usage

#### Production Build and Run

```bash
npm run build
npm start
```

#### Development with Watch Mode

```bash
npm run dev  # Starts TypeScript compiler in watch mode
```

#### Type Checking Only

```bash
npm run type-check
```

### File Structure

```
card-creator/
├── src/                   # TypeScript source files
│   ├── index.ts          # Main card generation script
│   └── types.ts          # TypeScript type definitions
├── dist/                 # Compiled JavaScript (generated)
│   ├── index.js
│   ├── index.d.ts
│   └── types.js
├── cards.json            # Card data definitions
├── tsconfig.json         # TypeScript configuration
├── package.json          # Node.js dependencies
├── assets/               # Asset files
│   ├── base_card.png     # Base card background (optional)
│   └── heroes/           # Hero images directory
│       ├── dwarf.png
│       └── wizard.png
└── output/               # Generated cards (created automatically)
    ├── mountain_dwarf_card.png
    └── arcane_wizard_card.png
```

### Card Data Format

The `cards.json` file defines your cards with the following structure:

```json
{
    "cards": [
        {
            "id": 1,
            "title": "Card Name",
            "description": "Card description text",
            "level": 5,
            "health": 8,
            "attack": 6,
            "specialEffects": [
                "Effect 1 description",
                "Effect 2 description"
            ],
            "heroImageName": "hero_image.png"
        }
    ]
}
```

### TypeScript Types

The project includes comprehensive TypeScript types:

```typescript
interface CardData {
    id: number;
    title: string;
    description: string;
    level: number;
    health: number;
    attack: number;
    specialEffects?: string[];
    heroImageName: string;
}
```

### Adding Your Own Images

1. **Base Card Image (Optional):**
   - Place your base card PNG in `assets/base_card.png`
   - Should be 400x600 pixels for best results
   - If not provided, a gradient background will be generated

2. **Hero Images:**
   - Place hero images in `assets/heroes/` directory
   - Reference them in the JSON with the `heroImageName` field
   - Recommended size: any reasonable resolution (will be resized to 300x200)
   - If not found, a placeholder will be generated

### Card Layout

The generated cards include:

- **Title:** Displayed at the top with golden text and shadow
- **Level Badge:** Red circular badge in the top-left corner
- **Hero Image:** Central image area (300x200 pixels)
- **Description:** Wrapped text below the hero image
- **Special Effects:** Listed below the description with bullet points
- **Attack Stat:** Orange circular badge in bottom-left (sword icon area)
- **Health Stat:** Green circular badge in bottom-right (heart icon area)

## Development

### Building the Project

```bash
npm run build    # Clean build
npm run clean    # Remove dist directory
```

### TypeScript Configuration

The project uses strict TypeScript settings for better type safety:

- Strict mode enabled
- Source maps generated
- Declaration files generated

## Customization

### Modifying Card Dimensions

Edit the constructor in `src/index.ts`:

```typescript
constructor(config?: Partial<CardGeneratorConfig>) {
  this.cardWidth = config?.cardWidth || 400;   // Change card width
  this.cardHeight = config?.cardHeight || 600; // Change card height
  // ...
}
```

### Styling Changes

You can modify colors, fonts, and layout by editing the `generateCard()` method
in `src/index.ts`. Key styling areas:

- **Colors:** Search for hex color codes (e.g., `#F1C40F`)
- **Fonts:** Modify `ctx.font` statements
- **Positioning:** Adjust x,y coordinates for different elements

### Adding More Cards

Simply add more card objects to the `cards` array in `cards.json`:

```json
{
    "cards": [
        // ... existing cards ...
        {
            "id": 3,
            "title": "New Card",
            "description": "New card description",
            "level": 3,
            "health": 5,
            "attack": 4,
            "specialEffects": ["New effect"],
            "heroImageName": "new_hero.png"
        }
    ]
}
```

## Example Output

The program generates PNG files in the `output/` directory with names like:

- `mountain_dwarf_card.png`
- `arcane_wizard_card.png`

Each card will be 400x600 pixels and include all the formatted text and images.

## Troubleshooting

### Canvas Installation Issues

If you encounter issues installing the canvas package:

**On macOS:**

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
npm install canvas
```

**On Ubuntu/Debian:**

```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm install canvas
```

### Missing Images

- The program will work without base card or hero images
- Missing base card: Creates a gradient background
- Missing hero images: Creates a gray placeholder

### Memory Issues

For processing many cards or large images, you might need to increase Node.js
memory:

```bash
node --max-old-space-size=4096 index.js
```

## License

MIT License - Feel free to modify and use for your projects!
