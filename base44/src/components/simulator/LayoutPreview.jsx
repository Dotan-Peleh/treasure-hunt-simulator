import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Zap, Lock, Mountain, Circle } from 'lucide-react';
import PropTypes from 'prop-types';

export default function LayoutPreview({ layout, analysis, showDetails = true, compact = false }) {
  if (!layout || !layout.tiles) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No layout data available</p>
        </CardContent>
      </Card>
    );
  }

  // Convert tiles to grid for visualization
  const grid = Array(9).fill(null).map(() => Array(7).fill(null));
  
  layout.tiles.forEach(tile => {
    const row = tile.row - 1;
    const col = tile.col - 1;
    if (row >= 0 && row < 9 && col >= 0 && col < 7) {
      grid[row][col] = tile;
    }
  });

  const getTileColor = (tile) => {
    if (!tile) return 'bg-gray-200';
    
    switch (tile.tile_type) {
      case 'free':
        return 'bg-green-100 border-green-300';
      case 'semi_locked':
        return 'bg-yellow-100 border-yellow-300';
      case 'locked':
        return 'bg-red-100 border-red-300';
      case 'rock':
        return 'bg-gray-400 border-gray-600';
      case 'key':
        return 'bg-purple-200 border-purple-400';
      default:
        return 'bg-gray-200 border-gray-400';
    }
  };

  const getTileContent = (tile) => {
    if (!tile) return null;
    if (tile.tile_type === 'key') return <Key className="w-4 h-4 text-purple-700" />;
    if (tile.item?.type === 'generator') return <Zap className="w-4 h-4 text-yellow-600" />;
    if (tile.required_item_name) {
      const level = tile.required_item_level;
      const color = tile.required_item_chain_color;
      const colorMap = {
        orange: 'text-orange-600',
        blue: 'text-blue-600',
        green: 'text-green-600',
      };
      return (
        <div className="flex items-center gap-0.5">
          <Circle className={`w-3 h-3 ${colorMap[color] || 'text-gray-500'}`} />
          <span className="font-bold text-xs">{level}</span>
        </div>
      );
    }
    if (tile.tile_type === 'semi_locked') return <Lock className="w-4 h-4 text-yellow-700" />;
    if (tile.tile_type === 'rock') return <Mountain className="w-4 h-4 text-gray-600" />;
    
    return null;
  };

  const milestoneColorMap = {
    green: { bg: 'bg-green-300', border: 'border-green-400', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-300', border: 'border-yellow-400', text: 'text-yellow-600' },
    red: { bg: 'bg-red-300', border: 'border-red-400', text: 'text-red-600' },
    blue: { bg: 'bg-blue-300', border: 'border-blue-400', text: 'text-blue-600' }
  };

  const boardGrid = (
    <div className={`relative grid grid-cols-7 gap-1 ${compact ? 'p-1 bg-slate-200' : 'p-2 bg-gray-100'} rounded-lg`}>
        {/* Dynamic Milestone Lines */}
        {!compact && analysis?.milestones && analysis.milestones.map((milestone, index) => {
          const topPercentage = ((milestone.row -1) / 9) * 100;
          const colorNames = ['green', 'yellow', 'red'];
          const colorName = colorNames[index % colorNames.length] || 'blue';
          const colors = milestoneColorMap[colorName];
          return (
            <div
              key={index}
              className={`absolute left-[-4px] right-[-4px] h-px ${colors.bg} border-t border-dashed ${colors.border} z-10`}
              style={{ top: `${topPercentage}%` }}
            >
                <span className={`absolute left-2 -top-2 text-xs font-bold ${colors.text}`}>
                    +{milestone.reward}
                </span>
            </div>
          );
        })}
        {grid.map((row, rowIndex) => 
            row.map((tile, colIndex) => (
            <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                ${compact ? 'w-7 h-7' : 'w-8 h-8'} border rounded flex items-center justify-center text-xs font-medium
                ${getTileColor(tile)}
                ${tile?.discovered ? 'ring-2 ring-blue-400' : ''}
                `}
                title={tile ? `${tile.tile_type}${tile.required_item_name ? ` - ${tile.required_item_name}` : ''}` : 'Empty'}
            >
                {getTileContent(tile)}
            </div>
            ))
        )}
    </div>
  );

  if (compact) {
      return boardGrid;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{layout.name || `Layout ${layout.id}`}</span>
          <div className="flex gap-1">
            <Badge variant="outline">#{layout.id}</Badge>
            {analysis?.path_info?.has_connection && (
              <Badge variant="secondary">Connected</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Board Visualization */}
        <div className="flex justify-center">
            {boardGrid}
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              Free
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              Semi-locked
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              Locked
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 border border-gray-600 rounded"></div>
              Rock
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-200 border border-purple-400 rounded"></div>
              Key
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Generator</span>
            <span className="flex items-center gap-1"><Key className="w-3 h-3" /> Key</span>
            <span className="flex items-center gap-1"><Circle className="w-3 h-3 text-orange-500" /> Item Lvl</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
          </div>
        </div>

        {/* Analysis Details */}
        {showDetails && analysis && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Path Analysis</h4>
              <div className="space-y-1">
                {analysis.path_info.path_tiles.map((tileCount, index) => (
                    <div className="flex justify-between" key={`path-tiles-${index}`}>
                        <span>Path {index + 1}:</span>
                        <span>{tileCount} tiles</span>
                    </div>
                ))}
                {analysis.path_info.bridge_tiles > 0 && (
                  <div className="flex justify-between">
                    <span>Bridge:</span>
                    <span>{analysis.path_info.bridge_tiles} tiles</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{analysis.total_path_tiles} tiles</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Cost Analysis</h4>
              <div className="space-y-1">
                {analysis.path_costs.map((cost, index) => (
                    <div className="flex justify-between" key={`path-cost-${index}`}>
                        <span>Path {index + 1} Cost:</span>
                        <span>{cost}</span>
                    </div>
                ))}
                <div className="flex justify-between text-muted-foreground">
                  <span>Cost Variance:</span>
                  <span>{analysis.cost_variance.toFixed(1)}</span>
                </div>
                 <div className="flex justify-between font-semibold">
                    <span>Shortest Path:</span>
                    <span>{analysis.shortest_path}</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Longest Path:</span>
                    <span>{analysis.longest_path}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Path:</span>
                  <span>{analysis.average_path.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <h4 className="font-medium mb-2">Scores</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {analysis.balance_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {analysis.complexity_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Complexity</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {analysis.strategic_variance?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Strategic</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 

LayoutPreview.propTypes = {
    layout: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        tiles: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
    analysis: PropTypes.object,
    showDetails: PropTypes.bool,
    compact: PropTypes.bool,
}; 