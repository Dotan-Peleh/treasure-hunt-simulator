// Simple test script for the layout generator
// Run with: node test-layout-generator.js

const { generateBoardLayout, boardLayouts } = require('./src/components/simulator/BoardGenerator.js');

console.log('🧪 Testing Layout Generator...\n');

// Test 1: Generate a simple layout
console.log('Test 1: Generating layout #1...');
try {
  const config = {
    item_chains: [
      { chain_name: 'Energy Cell', levels: 12, color: 'orange' },
      { chain_name: 'Data Chip', levels: 8, color: 'blue' },
      { chain_name: 'Bio Fuel', levels: 10, color: 'green' }
    ],
    key_cost_multiplier: 1.0,
    layout_id: 1,
    milestones: [
      { row: 7, reward: 50 },
      { row: 5, reward: 100 },
      { row: 3, reward: 200 }
    ]
  };

  const result = generateBoardLayout(config);
  console.log('✅ Layout generated successfully!');
  console.log(`   - Tiles: ${result.tiles.length}`);
  console.log(`   - Path 1 cost: ${result.analysis.path1_cost}`);
  console.log(`   - Path 2 cost: ${result.analysis.path2_cost}`);
  console.log(`   - Cost variance: ${result.analysis.cost_variance}`);
  console.log(`   - Total path tiles: ${result.analysis.total_path_tiles}`);
  console.log(`   - Has connection: ${result.analysis.path_info.has_connection}\n`);
} catch (error) {
  console.error('❌ Error generating layout:', error.message);
}

// Test 2: List all available layouts
console.log('Test 2: Available layouts...');
console.log(`   - Total layouts: ${boardLayouts.length}`);
boardLayouts.slice(0, 5).forEach(layout => {
  console.log(`   - ${layout.name}`);
});
console.log(`   - ... and ${boardLayouts.length - 5} more\n`);

// Test 3: Test configuration validation
console.log('Test 3: Configuration validation...');
const testConfigs = [
  { name: 'Valid config', config: { layout_id: 1, key_cost_multiplier: 1.0 } },
  { name: 'High difficulty', config: { layout_id: 1, key_cost_multiplier: 2.0 } },
  { name: 'Low difficulty', config: { layout_id: 1, key_cost_multiplier: 0.5 } }
];

testConfigs.forEach(({ name, config }) => {
  try {
    const result = generateBoardLayout({
      ...config,
      item_chains: [
        { chain_name: 'Energy Cell', levels: 12, color: 'orange' },
        { chain_name: 'Data Chip', levels: 8, color: 'blue' },
        { chain_name: 'Bio Fuel', levels: 10, color: 'green' }
      ],
      milestones: []
    });
    console.log(`   ✅ ${name}: Generated successfully (variance: ${result.analysis.cost_variance.toFixed(1)})`);
  } catch (error) {
    console.log(`   ❌ ${name}: Failed - ${error.message}`);
  }
});

console.log('\n🎉 Layout Generator Test Complete!');
console.log('\nNext steps:');
console.log('1. Open http://localhost:5173/LayoutGeneratorSimulator');
console.log('2. Configure generation settings');
console.log('3. Click "Generate Layouts"');
console.log('4. Explore the Analysis and Preview tabs');
console.log('5. Export results for further analysis'); 