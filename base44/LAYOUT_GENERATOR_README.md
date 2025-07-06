# Layout Generator Simulator - Complete Documentation

## Overview

The Layout Generator Simulator is a comprehensive tool that generates and analyzes multiple board layouts based on the existing rules in the codebase. It can create variations of existing layouts and generate completely new random layouts, all while ensuring balanced gameplay according to the memory rule.

## Core Memory Rule

**"For any given board layout, the defined paths should be designed to have the closest possible variance in their expected costs. The goal is to create balanced scenarios where the strategic choices are not obvious."**

This rule is implemented through:
- Balanced progression algorithms that distribute costs evenly
- Analysis metrics that measure cost variance
- Filtering options to find layouts with low cost variance
- Recommendations for layouts that provide balanced strategic choices

## Architecture

### 1. Main Components

#### `LayoutGeneratorSimulator.jsx`
- **Purpose**: Main UI component for the layout generator
- **Features**: 
  - Configuration management
  - Layout generation orchestration
  - Analysis and filtering
  - Export functionality
  - Visual preview integration

#### `BoardGenerator.jsx` (Existing)
- **Purpose**: Core layout generation engine
- **Features**:
  - 24 predefined board layouts
  - Balanced progression algorithms
  - Item chain integration
  - Cost calculation systems

#### `LayoutPreview.jsx`
- **Purpose**: Visual representation of generated layouts
- **Features**:
  - Interactive board visualization
  - Color-coded tiles with emoji indicators
  - Analysis display
  - Legend and tooltips

#### `AdvancedLayoutGenerator.jsx`
- **Purpose**: Advanced layout variation algorithms
- **Features**:
  - Zigzag variations
  - Spiral patterns
  - Maze-like structures
  - Random layout generation
  - Multiple connection patterns

### 2. Core Algorithms

#### Balanced Progression Algorithm
```javascript
const createBalancedProgression = (pathTiles, allBoardTiles, targetCost) => {
  // Sort tiles by distance from start (bottom to top)
  const sortedTiles = [...pathTiles].sort((a, b) => b.r - a.r);
  
  sortedTiles.forEach((pathTile, index) => {
    const progressRatio = index / (sortedTiles.length - 1);
    
    // Progressive difficulty system
    let level;
    if (progressRatio <= 0.3) {
      // First 30%: Levels 1-2 (very accessible)
      level = Math.random() < 0.7 ? 1 : 2;
    } else if (progressRatio <= 0.7) {
      // Middle 40%: Levels 2-4 (moderate challenge)
      level = Math.floor(Math.random() * 3) + 2;
    } else {
      // Final 30%: Levels 3-6 (significant challenge)
      level = Math.floor(Math.random() * 4) + 3;
    }
    
    // Apply level constraints and calculate cost
    level = Math.min(level, selectedChain.levels - 1);
    level = Math.max(level, 1);
    currentPathTotalCost += Math.pow(2, level - 1);
  });
};
```

#### Balance Score Calculation
```javascript
const calculateBalanceScore = (analysis, simulation) => {
  let score = 100;
  
  // Penalize high cost variance (0-30 points)
  const costVariancePenalty = Math.min(analysis.cost_variance / 10, 30);
  score -= costVariancePenalty;
  
  // Reward balanced completion rates (0-20 points)
  const completionRateDiff = Math.abs(simulation.overall_completion_rate - 0.3);
  const completionPenalty = completionRateDiff * 20;
  score -= completionPenalty;
  
  // Reward good path distribution (0-10 points)
  const pathRatio = Math.min(analysis.path_info.path1_tiles, analysis.path_info.path2_tiles) / 
                   Math.max(analysis.path_info.path1_tiles, analysis.path_info.path2_tiles);
  const pathBalanceBonus = pathRatio * 10;
  score += pathBalanceBonus;
  
  return Math.max(0, Math.min(100, score));
};
```

#### Complexity Score Calculation
```javascript
const calculateComplexityScore = (analysis) => {
  let score = 0;
  
  // Base complexity from total path tiles (0-30 points)
  score += Math.min(analysis.total_path_tiles / 2, 30);
  
  // Additional complexity for connections (0-20 points)
  if (analysis.path_info.has_connection) {
    score += 20;
  }
  
  // Complexity from bridge tiles (0-25 points)
  score += Math.min(analysis.path_info.bridge_tiles * 3, 25);
  
  // Variance complexity (0-25 points)
  score += Math.min(analysis.cost_variance / 5, 25);
  
  return Math.min(100, score);
};
```

#### Strategic Variance Calculation
```javascript
const calculateStrategicVariance = (analysis) => {
  const path1Ratio = analysis.path_info.path1_tiles / analysis.total_path_tiles;
  const path2Ratio = analysis.path_info.path2_tiles / analysis.total_path_tiles;
  
  // Higher variance means more strategic choice
  return Math.abs(path1Ratio - path2Ratio) * 100;
};
```

### 3. Layout Generation Process

#### Step 1: Configuration Setup
```javascript
const generationConfig = {
  numLayouts: 100,                    // Iterations per layout
  keyCostMultiplier: 1.0,            // Overall difficulty
  includeAllLayouts: true,           // Use all 24 base layouts
  customLayoutIds: [],               // Custom layout selection
  includeVariations: true,           // Generate variations
  variationsPerLayout: 5,            // Variations per base layout
  includeRandomLayouts: true,        // Generate random layouts
  numRandomLayouts: 20,              // Number of random layouts
  itemChains: [...],                 // Item chain definitions
  milestones: [...]                  // Milestone definitions
};
```

#### Step 2: Base Layout Generation
```javascript
for (let iteration = 0; iteration < generationConfig.numLayouts; iteration++) {
  for (const layoutId of layoutsToGenerate) {
    const layout = generateSingleLayout(layoutId, generationConfig);
    newLayouts.push(layout);
  }
}
```

#### Step 3: Variation Generation (Advanced)
```javascript
if (generationConfig.includeVariations) {
  for (const layoutId of layoutsToGenerate) {
    const variations = advancedGenerator.generateMultipleVariations(
      layoutId, 
      generationConfig.variationsPerLayout
    );
    
    for (const variation of variations) {
      const layout = generateSingleLayout(variation.id, {
        ...generationConfig,
        layout_id: variation.id,
        customGrid: variation.grid
      });
      newLayouts.push(layout);
    }
  }
}
```

#### Step 4: Random Layout Generation (Advanced)
```javascript
if (generationConfig.includeRandomLayouts) {
  for (let i = 0; i < generationConfig.numRandomLayouts; i++) {
    const randomLayout = advancedGenerator.generateRandomLayout();
    const layout = generateSingleLayout(randomLayout.id, {
      ...generationConfig,
      layout_id: randomLayout.id,
      customGrid: randomLayout.grid
    });
    newLayouts.push(layout);
  }
}
```

### 4. Analysis and Metrics

#### Key Metrics Explained

**Balance Score (0-100)**
- Higher scores indicate more balanced layouts
- Based on cost variance, completion rates, and path distribution
- Target: 70+ for optimal gameplay

**Complexity Score (0-100)**
- Higher scores indicate more complex layouts
- Based on path tiles, connections, bridge tiles, and cost variance
- Target: 30-70 for balanced complexity

**Strategic Variance (0-100)**
- Higher scores indicate more meaningful strategic choices
- Based on path length differences
- Target: 20-60 for optimal strategic depth

**Cost Variance**
- Absolute difference between path costs
- Lower variance = more balanced gameplay
- Target: < 50 for balanced layouts

#### Analysis Process
```javascript
const analyzeGeneratedLayouts = (layouts) => {
  const analysis = {
    total_layouts: layouts.length,
    average_balance_score: layouts.reduce((sum, l) => sum + l.analysis.balance_score, 0) / layouts.length,
    average_complexity_score: layouts.reduce((sum, l) => sum + l.analysis.complexity_score, 0) / layouts.length,
    average_strategic_variance: layouts.reduce((sum, l) => sum + l.analysis.strategic_variance, 0) / layouts.length,
    average_cost_variance: layouts.reduce((sum, l) => sum + l.analysis.cost_variance, 0) / layouts.length,
    connected_paths_percentage: layouts.filter(l => l.analysis.path_info.has_connection).length / layouts.length * 100,
    top_balanced_layouts: [...layouts].sort((a, b) => b.analysis.balance_score - a.analysis.balance_score).slice(0, 10),
    top_complex_layouts: [...layouts].sort((a, b) => b.analysis.complexity_score - a.analysis.complexity_score).slice(0, 10),
    top_strategic_layouts: [...layouts].sort((a, b) => b.analysis.strategic_variance - a.analysis.strategic_variance).slice(0, 10)
  };
};
```

### 5. Advanced Features

#### Variation Algorithms

**Zigzag Variations**
- Adds zigzag patterns to existing paths
- Creates more complex routing options
- Maintains connectivity while adding variety

**Spiral Variations**
- Creates spiral patterns around board center
- Generates unique path configurations
- Ensures proper start-to-key connectivity

**Maze Variations**
- Adds maze-like connections between paths
- Creates multiple routing options
- Increases strategic complexity

**Obstacle Variations**
- Adds random obstacles to create new challenges
- Maintains path connectivity
- Creates unique gameplay scenarios

**Connection Variations**
- Creates multiple connection points between paths
- Enables early/late merge strategies
- Provides flexible routing options

#### Random Layout Generation
```javascript
const generateRandomLayout = () => {
  const grid = Array(9).fill(null).map(() => Array(7).fill('rock'));
  
  // Set start area and key
  grid[0][6] = 'key';
  for (let r = 6; r < 9; r++) {
    for (let c = 0; c < 4; c++) {
      grid[r][c] = 'start';
    }
  }
  
  // Generate random paths
  const path1 = generateRandomPath([7, 1], [0, 6]);
  const path2 = generateRandomPath([7, 3], [0, 6]);
  
  // Apply paths and obstacles
  path1.forEach(([r, c]) => { if (grid[r][c] === 'rock') grid[r][c] = 'path1'; });
  path2.forEach(([r, c]) => { if (grid[r][c] === 'rock') grid[r][c] = 'path2'; });
  
  return { id: `random-${Date.now()}`, grid, name: `Random Layout ${Date.now()}` };
};
```

### 6. Usage Instructions

#### Basic Usage
1. Navigate to `/LayoutGeneratorSimulator`
2. Configure generation settings
3. Click "Generate Layouts"
4. View results in Analysis and Preview tabs
5. Export data for further analysis

#### Advanced Usage
1. Enable variations for more diverse layouts
2. Enable random layouts for completely new configurations
3. Use filters to find specific layout types
4. Sort by different metrics to find optimal layouts
5. Export results for integration with other tools

#### Configuration Options
- **Number of iterations**: How many times to generate each base layout
- **Key cost multiplier**: Adjusts overall difficulty (0.1-10.0)
- **Layout selection**: All layouts or custom selection
- **Variations**: Enable/disable and set count per layout
- **Random layouts**: Enable/disable and set count
- **Filters**: Cost variance, path tiles, connection type
- **Sort options**: Balance, complexity, strategic variance, etc.

### 7. Export Format

The exported JSON includes:
```javascript
{
  generated_at: "2024-01-01T00:00:00.000Z",
  config: { /* generation configuration */ },
  analysis: { /* overall analysis statistics */ },
  layouts: [
    {
      id: "layout-1",
      name: "1. Short vs Long (Connected)",
      tiles: [ /* tile array */ ],
      analysis: { /* layout-specific analysis */ },
      generated_at: "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 8. Integration Points

#### With Main Simulator
- Export layouts can be imported into LiveopSimulator
- Analysis data can guide layout selection
- Balance scores help identify optimal configurations

#### With External Tools
- JSON export format enables external analysis
- Statistical data can be processed by other tools
- Layout data can be used for machine learning

### 9. Performance Considerations

#### Optimization Strategies
- Batch processing for large generation runs
- Progress tracking for user feedback
- Memory management for large datasets
- Efficient filtering and sorting algorithms

#### Scalability
- Can generate 1000+ layouts in one run
- Supports real-time filtering and sorting
- Export functionality for large datasets
- Modular architecture for easy extension

### 10. Future Enhancements

#### Planned Features
- Machine learning optimization
- Real-time layout validation
- Advanced visualization options
- Integration with game engine
- Automated testing framework

#### Potential Improvements
- More variation algorithms
- Advanced balance metrics
- Performance optimizations
- Enhanced export formats
- Collaborative features

## Conclusion

The Layout Generator Simulator provides a comprehensive solution for generating, analyzing, and optimizing board layouts. It successfully implements the memory rule for balanced gameplay while offering extensive customization and analysis capabilities. The modular architecture ensures easy maintenance and future enhancements. 