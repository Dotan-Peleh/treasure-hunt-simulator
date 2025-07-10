# Treasure Hunt Event Simulator

This project is a sophisticated suite of tools designed for generating, analyzing, and play-testing board layouts for a Treasure Hunt-style game. It consists of two main applications: the **Layout Generator Simulator** and the **LiveOps Simulator**.

## Core Concepts

The primary goal is to create interesting, balanced, and strategically varied board layouts. The generation process is guided by a set of core design principles that have been implemented as firm rules in the code.

- **Playability is Paramount:** Every generated board is guaranteed to be fully solvable. A validation and repair system runs on every layout to ensure all paths are connected and the key is always reachable from the start area. [[memory:2400481]]
- **Balance Through Variance:** The key to a good layout is low variance in the cost-to-complete between its paths. The system is designed to create layouts where the strategic choices are not obvious. [[memory:2384090]]
- **Strategic Funneling:** Paths are generated to guide the player towards the top of the board in a non-obvious way, creating a natural "funnel" that leads to more interesting end-game scenarios.
- **Robust Imports:** The simulator is built to be resilient. When importing layouts from older versions or external sources, it automatically sanitizes the data. It enforces the current game rules, ensuring that all imported layouts are valid and playable, preventing crashes or unexpected behavior from outdated configurations.

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
- **Layout Importing:** Import a single layout or a whole batch from a JSON file. The system automatically sanitizes imported files to ensure compatibility with the latest rules.
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

# Full Product Requirements Document (PRD)

*(The following expands on the quick overview above and documents the entire system end-to-end.)*

## 1. User Roles & Personas
The simulator is designed to serve three distinct roles in the game development lifecycle:

| Role | Primary Application | Core Task |
|---|---|---|
| **Game Designer** | `LayoutGeneratorSimulator` | **Analyze & Select.** Mass-produces and filters hundreds of layouts based on high-level metrics (cost variance, balance, complexity) to find strategically sound candidates for further refinement. |
| **Level Designer** | `LiveopSimulator` (Edit Mode) | **Refine & Tweak.** Takes a promising layout and uses the interactive editing tools to manually adjust tile placements, item requirements, and entry points to perfect the player experience. |
| **QA Tester** | `LiveopSimulator` (Play Mode) | **Validate & Report.** Plays through a layout exactly as a player would to identify frustrating bottlenecks, confusing paths, or bugs. Uses the feedback tools (comments, flags) to report issues. |

## 1. Vision
Design a deterministic yet highly-configurable engine that:
1. Procedurally generates board layouts for a merge-puzzle / live-ops event.
2. Guarantees fairness and solvability while allowing “just-right” strategic variance.
3. Provides rich simulation & analysis tools so game-designers can evaluate thousands of candidate boards in minutes, iterate, and ship balanced content.

## 2. Core Concepts
| Term | Meaning |
|------|---------|
| **Tile** | Cell on a 9 × 7 grid (`row` 1-9 bottom→top, `col` 1-7 left→right). |
| **Tile Types** | `start`, `free`, `semi_locked`, `locked`, `rock`, `bridge`, `key`, `generator_orange`, `generator_blue`, `generator_green`. |
| **Entry Point** | First discoverable tile of a path (must live in rows 7-9). |
| **Path** | Contiguous chain of `semi_locked` tiles leading from an entry point to the key. |
| **Bridge** | Neutral connector auto-inserted by the BFS repair pass. |
| **Item Chains** | Three colored item progressions (orange = Energy Cell, blue = Data Chip, green = Bio Fuel). |
| **Milestones** | Reward thresholds at rows 7, 5, 3 granting +25-60 soft currency. |

## 3. High-Level Flow
```
LayoutGeneratorSimulator
└─ generateSingleLayout()
   ├─ setupGrid()                  – basic grid / start area / key
   ├─ LayoutManager.generateLayout – draw N “rough” paths
   ├─ validateAndRepairLayout()    – BFS reachability + bridge repair
   ├─ placeGeneratorsAndFrees()    – start generators + random frees
   ├─ assignProgressionCosts()     – progressive difficulty per path
   ├─ flagEntryPoints()            – choose bottom-most tile of each path
   ├─ findAllPathsFromEntries()    – Dijkstra shortest path per entry
   └─ buildAnalysis()              – variance, scores, meta-stats
```

## 4. Game-Design Rules
| # | Rule | Enforcement |
|---|------|-------------|
| 1 | Exactly one **key** in the top row, cols 2-6. | `setupGrid` randomises the key after nuking rogues. |
| 2 | Fixed 3×2 **start area** at bottom-left. | `setupGrid`. |
| 3 | **Entry points** must start on rows 7-9. | Discard layout in `LayoutGeneratorSimulator` if any `entry.row < 7`. |
| 4 | All key & path tiles must be reachable. | `validateAndRepairLayout` BFS + bridge repair. |
| 5 | Progressive costs; each tile’s level range is 2 … (chainMax-1). | `assignProgressionCosts` + Balancers |
| 6 | Cost variance ≤ 15 % of mean. | Post-gen rule in simulator. |
| 7 | Three generators (Orange, Blue, Green) fixed in the start area. | `placeGeneratorsAndFrees`. |
| 8 | Extra free tiles (slider 5-15). | `placeGeneratorsAndFrees`. |
| 9 | Milestone rows fixed, rewards random 25-60. | `generateDynamicMilestones`. |
| 10 | All entry points must start at a similar difficulty. | Post-balance "Entry Point Level Harmonization" step. |

## 5. Algorithms
### 5.1 Path Drawing
Lightweight Manhattan walk with randomised decisions – avoids uniform corridors.

### 5.2 Reachability Repair
1. BFS from all start tiles.  2. Convert adjacent blocking rocks into `bridge`.  3. Repeat until all important cells reachable.

### 5.3 Cost Assignment
* First 30 % of each path → Levels 2-3.
* Middle 40 % → Levels 3-5.
* Final 30 % → Levels 4-7.
* Cost per tile = 2^(level-1).

### 5.4 Adaptive Path Discovery
`findAllPathsFromEntries` now enumerates *multiple* plausible routes per entry:

1. **Up-first deterministic** – mirrors the most common player behaviour.
2. **Cost-aware sidestep** – will move left/right if that tile is cheaper than the tile above.
3. **10 % noise variants** – three extra simulations where each move has a 10 % chance to pick any valid tile, producing “imperfect-play” paths.
4. **Fork exploration** – a bounded BFS (≤20 paths/entry) records every branch whenever equally attractive moves exist, ensuring true forks are represented.

All unique paths are deduplicated and returned with individual costs. The pathfinding logic strictly prohibits downward movement. A path is also considered "complete" if it reaches a tile directly adjacent (N/S/E/W) to the key, not just the key tile itself.

### 5.5 Auto Cost Balancer
After initial progressive difficulty assignment, the generator runs an **auto-balance loop**:

• Calculates current cost for each path.
• Iteratively lowers the highest-cost path (or raises the lowest) by one item level at a time, always picking the most impactful tile.
• Stops once every path is within **±15 % of the average path cost** (or after 300 tweaks).

The layout analysis gains:
```json
"cost_variance": 12.5,          // percentage difference to mean
"balanced_costs": true          // helper flag for UI badges
```

### 5.6 Import Sanitization
To ensure stability and prevent crashes from outdated or invalid data, the simulator enforces a strict sanitization process on all imported layout files.

1.  **Ignore Imported Configuration**: The application **completely ignores** the `item_chains` configuration within an imported JSON file.
2.  **Enforce Internal Configuration**: It **always** uses its own internal, default configuration as the single source of truth for item chain rules (max levels, colors, etc.).
3.  **Sanitize Tiles**: It then scans all tiles in the imported layout. Any items or generators belonging to unsupported or legacy chains (e.g., a "purple" chain) are automatically converted to a valid, supported type (e.g., "blue").

This guarantees that all loaded layouts are fully compatible with the current game rules, providing a stable and reliable testing environment.

### 5.7 Single-Unlock Cost Accounting

Players only pay the unlock cost for a **semi_locked** tile the *first* time they clear it. If a path loops back over an already-cleared coordinate the player walks through for free.  

`findAllPathsFromEntries` therefore recomputes each path’s cost after construction by summing **unique** coordinates only. This guarantees the analysis (and UI badges) match real gameplay even when a route contains U-turn detours.

```js
// pseudo
const seen = new Set();
let total = 0;
for (tile of path) {
  if (seen.has(tile.coord)) continue;   // visited before – free
  seen.add(tile.coord);
  total += stepCost(tile.required_item_level);
}
```

This logic is mirrored in the LiveOps Simulator during actual play – a semi-locked tile flips to `unlocked` after a successful merge and never requires a second item.

### 5.8 Path Consolidation & Dead-Ends
To make layouts more interesting and analysis more intuitive, two final rules are applied:
*   **Faulty Starts & More Dead Ends:** The generator intentionally adds complexity by creating 1-2 short, dead-end paths sprouting from the player's start area. It also has a 15% chance to add a 2-4 tile dead-end branch off of any step in a main path.
*   **Completionist Path Consolidation:** If the analysis for a board with a single entry point results in exactly two paths (a direct route and a detour), the system consolidates them. It keeps only the longer, more expensive path, representing the total cost for a player who explores the dead-end on their way to the key.

## 6. Scoring Metrics
| Metric | Formula |
|---------|---------|
| `cost_variance` | (max |cost − avg| / avg) × 100 % |
| `balanced_costs` | Boolean: true if `cost_variance` ≤ 15 % |
| `balance_score` | 100 − min(30, variance/10) + (min_len/max_len)*10 |
| `complexity_score` | min(total_tiles/2,30)+20*(has_connection)+min(bridge*3,25)+min(var/5,25) |
| `strategic_variance` | ((max_len − min_len)/total_tiles)*100 |

## 7. UI Modules
* **LayoutPreview** – Interactive preview cards with a powerful editing toolbar. Allows for adding/removing entry points (red flags), placing feedback flags (blue), and placing rocks to dynamically block paths and re-calculate costs.
* **InteractiveBoard** – live board with fog-of-war & milestone overlays.
* **LayoutGeneratorSimulator** – batch generator, filters, JSON export, and custom layout management.
* **EventConfigForm** - A form within the Liveop Simulator to configure event parameters and see a quick analysis of base layouts.

## 8. Custom Layout Workflow
The simulator includes a robust workflow for designing, testing, and promoting your own hand-crafted layouts.

1.  **Define a Layout**: Add a new layout object to the `customLayouts` array in `src/components/simulator/custom-layouts.js`. The `grid` uses simple single-character codes (`p` for path, `r` for rock, `k` for key, `s` for start/free).
2.  **Generate and Test**: In the `LayoutGeneratorSimulator`, check the "Include All Custom Layouts" box. This will generate your custom designs alongside any procedural ones, allowing you to analyze and test them with the same tools.
3.  **Iterate and Edit**: Use the editing tools in the `LayoutPreview` (red flags, rocks, etc.) to fine-tune your custom design.
4.  **Promote or Delete**:
    *   **Promote**: If you are happy with a custom layout, click the "Promote" button. This will log a complete, permanent layout definition to the console. Copy this definition into the `boardLayouts` array in `src/components/simulator/layout-definitions.js` to make it a permanent part of the procedural generation pool. The layout will then be removed from the custom list.
    *   **Delete**: If a design isn't working, click the "Delete" button. This will log the ID of the layout to be removed and filter it from the view, allowing you to easily manage your custom layout file.

## 9. Persistence & Export
Local Storage keys: `generatedLayouts`, `layoutFeedback`.
Exports: human-readable JSON snapshots for batch or per-layout.

## 10. Public Data Contracts
(TypeScript-style interfaces omitted here for brevity; see source.)

## 11. Roadmap
1. Module split (in-progress). 2. AI play-test bots. 3. CMS pipeline. 4. Designer tweak UI. 5. Localization.

*(End of PRD)*

## Recent Feature Updates

### Gameplay Mechanics
*   **Bomb Item:** A new "bomb" item can be placed on the board. When clicked, it detonates, revealing all 8 adjacent tiles and turning its own tile into a `free` space. The bomb's blast radius is previewed on hover.
*   **Crystal Generators:** Merging two items of the same configured level but from different primary chains now creates a limited-use Crystal Generator. This special purple generator produces Level 1 items from its own unique "Crystal" chain.
*   **Path-Placed Generators:** Generators can now be placed directly onto `semi_locked` tiles during board editing. When a player unlocks a tile containing a generator, the generator is preserved, and the area around it is revealed, opening up new strategic paths.

### Quality of Life & Editor Improvements
*   **Live Exporting:** Exporting a layout while in "Edit Board" mode now automatically includes all unsaved changes, ensuring the exported file is always up-to-date.
*   **Persistent Edits:** Clicking "Done Editing" now properly saves the current board state as the new baseline for the session. The "Reset" button will restore your edited layout, not the original.
*   **Hidden Items:** Special items like generators and bombs placed on path tiles are now correctly hidden when "Hide Full Layout" is active, preserving the fog-of-war for players.
