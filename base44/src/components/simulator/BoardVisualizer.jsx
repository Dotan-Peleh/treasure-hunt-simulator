import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, LockOpen, Star } from 'lucide-react';

const tileTypeIcons = {
  free: <LockOpen className="w-4 h-4 text-green-600" />,
  semi_locked: <Lock className="w-4 h-4 text-yellow-600" />,
  locked: <Lock className="w-4 h-4 text-red-600" />,
  chest: <Crown className="w-6 h-6 text-purple-600" />
};

const chainColors = {
  blue: "bg-blue-100 border-blue-300 text-blue-800",
  green: "bg-green-100 border-green-300 text-green-800", 
  purple: "bg-purple-100 border-purple-300 text-purple-800",
  red: "bg-red-100 border-red-300 text-red-800",
  orange: "bg-orange-100 border-orange-300 text-orange-800",
  yellow: "bg-yellow-100 border-yellow-300 text-yellow-800"
};

export default function BoardVisualizer({ tiles, config, progressData }) {
  const rows = 9;
  const cols = 7;
  
  // Create a 2D array from tiles
  const board = Array(rows).fill(null).map(() => Array(cols).fill(null));
  
  tiles.forEach(tile => {
    if (tile.row >= 1 && tile.row <= rows && tile.col >= 1 && tile.col <= cols) {
      board[tile.row - 1][tile.col - 1] = tile;
    }
  });

  const getTileColor = (tile) => {
    if (!tile) return "bg-gray-100 border-gray-200";
    
    if (tile.unlocked) {
      return "bg-green-50 border-green-200";
    }
    
    if (tile.tile_type === 'chest') {
      return "bg-purple-100 border-purple-300";
    }
    
    if (tile.item_chain && chainColors[tile.item_chain]) {
      return chainColors[tile.item_chain];
    }
    
    return "bg-gray-100 border-gray-200";
  };

  const formatItemName = (name) => {
    if (!name) return "";
    return name.length > 10 ? name.substring(0, 8) + "..." : name;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Board Visualization</span>
            {progressData && (
              <Badge variant="outline" className="text-lg px-3 py-1">
                {progressData.completion_percentage?.toFixed(1)}% Complete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 max-w-2xl mx-auto">
            {board.map((row, rowIndex) => 
              row.map((tile, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square border-2 rounded-lg p-2 flex flex-col items-center justify-center
                    transition-all duration-200 hover:shadow-md
                    ${getTileColor(tile)}
                  `}
                >
                  {tile ? (
                    <>
                      <div className="flex items-center justify-center mb-1">
                        {tileTypeIcons[tile.tile_type]}
                        {tile.unlocked && <Star className="w-3 h-3 text-yellow-500 ml-1" />}
                      </div>
                      
                      {tile.item_name && (
                        <div className="text-xs text-center font-medium">
                          {formatItemName(tile.item_name)}
                        </div>
                      )}
                      
                      {tile.item_level && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          L{tile.item_level}
                        </Badge>
                      )}
                      
                      {tile.gem_cost && (
                        <div className="text-xs text-gray-600 mt-1">
                          {tile.gem_cost}💎
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs">Empty</div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <LockOpen className="w-4 h-4 text-green-600" />
              <span className="text-sm">Free Tile</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm">Semi-locked</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" />
              <span className="text-sm">Locked</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              <span className="text-sm">Chest</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Unlocked</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}