# Pixi.js Card Game

A beautiful card game built with Vite and Pixi.js featuring interactive cards
and smooth animations.

## Features

- 🃏 Interactive card hand with hover effects
- 🎨 Beautiful arena background
- ✨ Smooth card animations
- 📱 Responsive design for different screen sizes
- 🎮 Card play mechanics with return animations

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
- **Click** on any card to play it (it will animate to the center and return)
- Cards are arranged in a fan formation at the bottom of the screen

## Project Structure

```
├── public/           # Static assets (images)
├── src/
│   ├── main.js      # Main Pixi.js application
│   └── style.css    # CSS styles
├── index.html       # HTML entry point
└── package.json     # Dependencies and scripts
```

## Assets

The game includes 5 different card images and an arena background. All assets
are loaded asynchronously using Pixi.js Assets loader.

## Technologies Used

- **Vite** - Fast build tool and development server
- **Pixi.js** - 2D WebGL renderer for smooth graphics and animations
- **Vanilla JavaScript** - Clean, modern JavaScript without additional
  frameworks

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

MIT License
