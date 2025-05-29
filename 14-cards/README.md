# Pixi.js Card Game

A beautiful card game built with Vite, TypeScript and Pixi.js featuring
interactive cards and smooth animations.

## Features

- 🃏 Interactive card hand with hover effects
- 🎨 Beautiful arena background
- ✨ Smooth card animations
- 📱 Responsive design for different screen sizes
- 🎮 Card play mechanics with return animations
- 🖥️ **Full-screen mode support**
- 📝 **TypeScript for type safety**

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## How to Play

- **Hover** over cards to see them lift up and grow slightly
- **Drag** any card upward (above the hand area) to play it
- Cards arrange themselves in Hearthstone-style positioning (center outward)
- Maximum 6 cards can be played in the arena
- **Click arena cards** to remove them (they fly upward and disappear)

## 🖥️ Full-Screen Mode (macOS)

### Automatic Controls:

- **Press F key** to toggle fullscreen
- **Double-click anywhere** to toggle fullscreen
- **Press Escape** to exit fullscreen

### Manual Browser Controls:

- **Safari**: Press `Cmd + Shift + F`
- **Chrome/Firefox**: Press `Cmd + Shift + F` or click View → Enter Full Screen
- **Any Browser**: Press `F11` (if available)

### Best Experience:

1. Start the game in your browser
2. Press **F** key or **double-click** to enter fullscreen
3. Enjoy immersive full-screen gaming!

## Project Structure

```
├── public/           # Static assets (images)
├── src/
│   ├── main.ts      # Main Pixi.js application (TypeScript)
│   └── style.css    # CSS styles
├── index.html       # HTML entry point
├── tsconfig.json    # TypeScript configuration
└── package.json     # Dependencies and scripts
```

## Assets

The game includes 5 different card images and an arena background. All assets
are loaded asynchronously using Pixi.js Assets loader.

## Technologies Used

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript with modern features
- **Pixi.js** - 2D WebGL renderer for smooth graphics and animations
- **Modern CSS** - Full-screen responsive design

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development

The project uses TypeScript for type safety. You can run type checking with:

```bash
npx tsc --noEmit
```

## License

MIT License
