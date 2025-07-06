# Treasure Hunt Event Simulator

This project is a sophisticated suite of tools designed for generating, analyzing, and play-testing board layouts for a Treasure Hunt-style game. It consists of two main applications: the **Layout Generator Simulator** and the **LiveOps Simulator**.

## Core Concepts

The primary goal is to create interesting, balanced, and strategically varied board layouts. The generation process is guided by a set of core design principles that have been implemented as firm rules in the code.

- **Playability is Paramount:** Every generated board is guaranteed to be fully solvable. A validation and repair system runs on every layout to ensure all paths are connected and the key is always reachable from the start area. [[memory:2400481]]
- **Balance Through Variance:** The key to a good layout is low variance in the cost-to-complete between its paths. The system is designed to create layouts where the strategic choices are not obvious. [[memory:2384090]]
- **Strategic Funneling:** Paths are generated to guide the player towards the top of the board in a non-obvious way, creating a natural "funnel" that leads to more interesting end-game scenarios.

## Applications

### 1. Layout Generator Simulator

This is a powerful factory for mass-producing and analyzing board layouts. [[memory:2384092]] It allows for the configuration of various parameters to generate hundreds of unique layouts at once, providing deep analysis on their balance, complexity, and strategic variety.

**Key Features:**
- **Procedural Generation:** Creates layouts dynamically based on a set of rules, rather than static templates. [[memory:2400471]]
- **Configurable Parameters:** Control the number of paths (1-4, with 1 being rare), the number of milestones, and the amount of extra free space.
- **Persistence:** Generated layouts are saved in your browser's local storage, so you can pick up where you left off.
- **Batch Export:** Export your entire collection of generated layouts to a single JSON file for later use.

### 2. LiveOps Simulator

This is an interactive test environment for playing a single, chosen board layout. [[memory:2384092]] It allows you to experience the game as a player would, providing a real-world test of a layout's design.

**Key Features:**
- **Interactive Gameplay:** Click to unlock tiles, merge items, and progress through the board.
- **Layout Importing:** Import a single layout or a whole batch from a JSON file. When importing a batch, you can browse through all the layouts.
- **Board Editing:** A powerful feature that allows you to modify a layout on the fly. When you're done editing, your changes are saved as the new "baseline" for the session and can be exported.
- **Visual Fog of War:** The board is revealed progressively as you unlock tiles, simulating the player experience.

## Layout Generation Logic

The heart of the project is the procedural layout generator. Here are the key rules it follows:

1.  **Start Area:** Every board has a fixed 6-tile start area at the bottom-left. [[memory:2400487]]
2.  **Key Placement:** The key is always placed randomly in the top row (excluding the corners) and is visible from the start of the game. [[memory:2400492]]
3.  **Path Generation:**
    -   Paths start from one of the three rows closest to the bottom.
    -   Each path targets a random endpoint in the top third of the board.
    -   The system automatically ensures all path endpoints are connected to the key.
4.  **Board Density:**
    -   After the start area and paths are drawn, all remaining empty space is filled with "rock" tiles.
    -   A configurable number of "extra free tiles" are then added to create more breathing room.
5.  **Item & Milestone Progression:**
    -   The cost to unlock a tile is `2^(item_level - 1)`.
    -   The minimum level for an unlockable tile is 2. [[memory:2400499]]
    -   Milestones are placed with the smallest reward at the bottom (row 7) and increase in value higher up the board. Rewards are granted when a player first discovers a tile in a milestone row. [[memory:2400508]]

## Getting Started

### Prerequisites
- Node.js and npm

### Running the App
1. Navigate to the `base44` directory:
   ```bash
   cd base44
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
The application will be available at `http://localhost:5173` (or the next available port).