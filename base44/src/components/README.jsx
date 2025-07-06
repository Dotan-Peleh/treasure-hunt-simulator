import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Book, Target, Zap, Map, Trophy, Settings } from 'lucide-react';

export default function README() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-6 h-6" />
            LiveOps Simulator - Complete Game Logic Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <div className="space-y-8">
            
            {/* Overview Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Overview
              </h2>
              <p className="mb-4">
                The LiveOps Simulator is a strategic puzzle game simulation tool designed for testing event mechanics in mobile games. 
                Players navigate through a board-based puzzle by merging items to unlock paths leading to a final treasure chest.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Core Objective:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Generate items using generators</li>
                  <li>Merge items to create higher-level versions</li>
                  <li>Use specific items to unlock path tiles</li>
                  <li>Find and collect the Key item</li>
                  <li>Use the Key to open the treasure chest for victory</li>
                </ul>
              </div>
            </section>

            {/* Energy System */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Energy System
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Energy Costs:</h3>
                  <ul className="space-y-1">
                    <li>• Starting Energy: <strong>100</strong></li>
                    <li>• Generator Use: <strong>1 Energy</strong></li>
                    <li>• Hint: <strong>25 Energy</strong></li>
                    <li>• Victory Bonus: <strong>5,000 Energy</strong></li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Item Generation:</h3>
                  <ul className="space-y-1">
                    <li>• Mixed Generator: Blue/Orange items</li>
                    <li>• Green Generator: Green items only</li>
                    <li>• 90% Level 1, 10% Level 2</li>
                    <li>• Items spawn on empty tiles randomly</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Board System */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Map className="w-5 h-5" />
                Board Generation System
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Grid Structure:</h3>
                  <p><strong>9 rows × 7 columns</strong> grid (63 total tiles)</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Row 9 (bottom) = Starting area</li>
                    <li>• Row 1 (top) = Near the key</li>
                    <li>• Column 7 (right) = Key location</li>
                  </ul>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Tile Types:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Free:</strong> Unlocked, can hold items</li>
                      <li>• <strong>Rock:</strong> Impassable obstacles</li>
                      <li>• <strong>Semi-locked:</strong> Visible, needs items</li>
                      <li>• <strong>Locked:</strong> Hidden until adjacent</li>
                      <li>• <strong>Key:</strong> Contains victory item</li>
                      <li>• <strong>Start:</strong> Always unlocked (9 tiles)</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">24 Unique Layouts:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Connected:</strong> Paths merge (13 layouts)</li>
                      <li>• <strong>Independent:</strong> Separate paths (11 layouts)</li>
                      <li>• Each offers different strategic choices</li>
                      <li>• Balanced for fair competition</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Item System */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Item System & Merging</h2>
              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Three Standard Chains:</h3>
                  <ul className="space-y-1">
                    <li>• <strong>Energy Cell</strong> (Orange): 12 levels</li>
                    <li>• <strong>Data Chip</strong> (Blue): 8 levels</li>
                    <li>• <strong>Bio Fuel</strong> (Green): 10 levels</li>
                  </ul>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Merging Rules:</h3>
                  <ul className="space-y-1">
                    <li>• Two items can merge if: <strong>Same color + Same level</strong></li>
                    <li>• Level 1 + Level 1 = Level 2</li>
                    <li>• Consumes both items, creates one higher-level item</li>
                    <li>• Maximum level per chain is configurable</li>
                  </ul>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Energy Cost Formula:</h3>
                  <code className="block bg-white p-2 rounded text-sm">
                    Level 1 = 1 energy, Level 2 = 2 energy, Level 3 = 4 energy, Level 4 = 8 energy...
                    <br />Formula: 2^(level-1)
                  </code>
                </div>
              </div>
            </section>

            {/* Progression */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Progressive Difficulty System</h2>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Difficulty Curve:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span><strong>Bottom 30%</strong> (Path Start)</span>
                      <span className="text-green-600">Levels 1-2 (Easy Start)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span><strong>Middle 40%</strong> (Path Middle)</span>
                      <span className="text-yellow-600">Levels 2-4 (Moderate)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span><strong>Top 30%</strong> (Near Key)</span>
                      <span className="text-red-600">Levels 3-6 (Challenging)</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Discovery System */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Fog of War & Discovery</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Initial Visibility:</h3>
                <ul className="space-y-1">
                  <li>• All start area tiles (9 tiles)</li>
                  <li>• Key tile (always visible as goal)</li>
                  <li>• Tiles adjacent to start area (path entrances)</li>
                </ul>
                
                <h3 className="font-semibold mb-2 mt-4">New Areas Revealed When:</h3>
                <ul className="space-y-1">
                  <li>• Adjacent tiles are unlocked</li>
                  <li>• Key is acquired (reveals surrounding area)</li>
                  <li>• "Show Full Layout" is toggled (optional)</li>
                </ul>
              </div>
            </section>

            {/* Victory & Milestones */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Victory Conditions & Milestones
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Winning Steps:</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Find and collect the Key item</li>
                    <li>Key tile becomes free with Key item</li>
                    <li>Select Key and click treasure chest</li>
                    <li>Victory! Gain 5,000 Energy bonus</li>
                    <li>Game auto-resets after 3 seconds</li>
                  </ol>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Milestone Rewards:</h3>
                  <ul className="space-y-1">
                    <li>• Trigger when tiles are <strong>discovered</strong></li>
                    <li>• Row-based rewards (configurable)</li>
                    <li>• Each milestone claimed once per game</li>
                    <li>• Celebration animations play</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Layout Analysis */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Layout Balance Analysis</h2>
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Balance Rating System:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Path Variance ≤ 10</span>
                    <span className="text-green-600 font-semibold">Excellent</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Path Variance ≤ 20</span>
                    <span className="text-blue-600 font-semibold">Good</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Path Variance ≤ 30</span>
                    <span className="text-yellow-600 font-semibold">Fair</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Path Variance > 30</span>
                    <span className="text-red-600 font-semibold">Poor</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Only "Good" and "Excellent" layouts are available for selection
                </p>
              </div>
            </section>

            {/* Export System */}
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Export Functionality
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Single Layout Export:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Current simulation state</li>
                    <li>• Configuration + tile data</li>
                    <li>• Excludes runtime 'discovered' state</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">All Layouts Export:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Generates data for all 24 layouts</li>
                    <li>• Includes analysis metrics</li>
                    <li>• Perfect for batch testing</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Game Flow */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Complete Game Flow</h2>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg">
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>Setup:</strong> Configure event parameters and select layout</li>
                  <li><strong>Start:</strong> Begin with 100 energy in starting area with generators</li>
                  <li><strong>Generate:</strong> Use generators to create Level 1-2 items (1 energy each)</li>
                  <li><strong>Merge:</strong> Combine same-color, same-level items for higher levels</li>
                  <li><strong>Unlock:</strong> Use specific items to unlock path tiles and reveal areas</li>
                  <li><strong>Progress:</strong> Follow path upward, facing increasing difficulty</li>
                  <li><strong>Milestones:</strong> Earn energy rewards for reaching certain rows</li>
                  <li><strong>Key:</strong> Find and collect the special Key item</li>
                  <li><strong>Victory:</strong> Use Key at treasure chest to win 5,000 energy</li>
                  <li><strong>Reset:</strong> Game automatically resets for replay</li>
                </ol>
              </div>
            </section>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}