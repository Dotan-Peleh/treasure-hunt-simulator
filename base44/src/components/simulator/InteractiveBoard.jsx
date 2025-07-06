
import { Badge } from '@/components/ui/badge';
import PropTypes from 'prop-types';
import {
  Lock, Gem, Zap, HelpCircle, Mountain,
  Circle, Square, Triangle, Shield, Star, Hexagon, Crown, Key
} from 'lucide-react';

const getLevelIcon = (level) => {
  const iconMap = {
    1: <Circle className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    2: <Square className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    3: <Triangle className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    4: <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    5: <Star className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    6: <Hexagon className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    7: <Gem className="w-5 h-5 md:w-6 md:h-6 text-white" />,
    8: <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />,
  };
  return iconMap[level] || <Gem className="w-5 h-5 md:w-6 md:h-6 text-white" />;
};

const itemBgColors = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
};

export default function InteractiveBoard({
  board,
  onTileClick,
  selectedTileIndex,
  hintActive,
  chestHintArea,
  isEditing,
  pathAnalysis,
  isLayoutVisible,
}) {

  const colorMap = {
    green: {
      bg: 'bg-green-300',
      border: 'border-green-400',
      text: 'text-green-600',
    },
    yellow: {
      bg: 'bg-yellow-300',
      border: 'border-yellow-400',
      text: 'text-yellow-600',
    },
    red: {
      bg: 'bg-red-300',
      border: 'border-red-400',
      text: 'text-red-600',
    },
    blue: {
      bg: 'bg-blue-300',
      border: 'border-blue-400',
      text: 'text-blue-600',
    }
  };

  const renderItem = (item) => {
    if (item.type === 'generator') {
      const hasGreen = item.chains.some(c => c.color === 'green');
      const generatorClass = hasGreen 
        ? 'bg-green-500' 
        : 'bg-gradient-to-br from-blue-400 to-orange-400';

      return (
        <div className="relative w-10 h-10 md:w-12 md:h-12 cursor-pointer group">
          <div className={`relative w-full h-full ${generatorClass} rounded-full flex items-center justify-center shadow-md`}>
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </div>
      );
    }

    // NEW: Special render for the Key Item
    if (item.name && item.name.includes("Key")) {
        return (
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full shadow-md cursor-pointer transition-transform hover:scale-110">
                <div className={`w-full h-full rounded-full flex items-center justify-center bg-yellow-500`}>
                    <Key className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
            </div>
        );
    }

    const ItemIcon = getLevelIcon(item.level);

    return (
      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full shadow-md cursor-pointer transition-transform hover:scale-110">
        <div className={`w-full h-full rounded-full flex items-center justify-center ${itemBgColors[item.chain_color]}`}>
          {ItemIcon}
        </div>
        <Badge variant="secondary" className="text-[10px] absolute -top-1 -right-1 px-1.5 py-0.5 h-auto">
          {item.level}
        </Badge>
      </div>
    );
  };

  return (
    <div className="p-2 md:p-4 bg-slate-100 rounded-lg shadow-inner">
      <div className="grid grid-cols-7 gap-1 max-w-md mx-auto relative">
        {/* Dynamic Milestone Lines */}
        {!isEditing && pathAnalysis?.milestones && pathAnalysis.milestones.map((milestone, index) => {
          const topPercentage = ((9 - milestone.row) / 9) * 100;
          const colorNames = ['green', 'yellow', 'red'];
          const colorName = colorNames[index % colorNames.length] || 'blue';
          const colors = colorMap[colorName];
          
          return (
            <div
              key={index}
              className={`absolute left-[-10px] right-[-10px] h-px ${colors.bg} border-t-2 border-dashed ${colors.border}`}
              style={{ top: `${topPercentage}%` }}
            >
              <span className={`absolute -left-20 -top-2.5 text-xs ${colors.text} font-bold`}>
                {milestone.name} (+{milestone.reward})
              </span>
            </div>
          );
        })}

        {board.map((tile, index) => {
          const isTileVisible = isLayoutVisible || isEditing || tile.discovered;

          const getTileClassName = () => {
            if (!isTileVisible) {
              return 'bg-slate-400 border-slate-500'; // Fog of War
            }
            
            const isHinted = hintActive && chestHintArea.some(h => h.row === tile.row && h.col === tile.col);
            if (isHinted) return 'bg-purple-100 border-purple-300 animate-pulse';

            // Unified styling for all tile types, regardless of editing mode.
            switch (tile.tile_type) {
              case 'rock': return 'bg-slate-300 border-slate-400';
              case 'free': return 'bg-green-50 border-green-200';
              case 'semi_locked': return tile.unlocked ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200';
              case 'key': return 'bg-yellow-100 border-yellow-300';
              case 'locked': return tile.unlocked ? 'bg-green-50 border-green-200' : 'bg-slate-200 border-slate-300';
              default: return 'bg-slate-100 border-slate-200';
            }
          };

          const showRequirement = !tile.unlocked && !tile.item && (tile.tile_type === 'semi_locked' || (tile.tile_type === 'locked' && isLayoutVisible));

          return (
            <div
              key={tile.id || index}
              onClick={() => onTileClick(index)}
              className={`
                aspect-square rounded-md border flex items-center justify-center relative transition-all duration-200
                ${getTileClassName()}
                ${index === selectedTileIndex ? 'ring-2 ring-blue-500 z-10' : ''}
                ${isEditing ? 'cursor-pointer' : (isTileVisible && (tile.item || tile.tile_type === 'semi_locked' || tile.tile_type === 'key')) ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {isTileVisible ? (
                <>
                  {/* If there's an actual item on the tile, render it. This takes priority. */}
                  {tile.item && renderItem(tile.item)}

                  {/* If we should show the tile's unlock requirement */}
                  {showRequirement && (
                    <div className="absolute inset-0 rounded-md flex flex-col items-center justify-center p-1 text-center z-0">
                      {/* Faded background icon for the required item */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${itemBgColors[tile.required_item_chain_color] || 'bg-gray-400'} opacity-70 shadow-inner`}>
                        {getLevelIcon(tile.required_item_level)}
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4 leading-none px-1 bg-white/50">
                        {tile.required_item_level}
                      </Badge>
                      {/* Overlay with a lock to indicate it's a requirement, not a real item */}
                      <div className="absolute inset-0 bg-black/25 rounded-md flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Fallback for a standard locked tile (not in layout view) */}
                  {tile.tile_type === 'locked' && !showRequirement && !tile.item && <Lock className="w-5 h-5 text-slate-400" />}
                  
                  {/* Key tile - always show key icon when no item is present */}
                  {tile.tile_type === 'key' && !tile.item && <Key className="w-6 h-6 text-yellow-500"/>}
                  {tile.tile_type === 'rock' && <Mountain className="w-6 h-6 text-slate-500" />}
                </>
              ) : (
                <div className="text-slate-500 opacity-50">
                  <HelpCircle className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

InteractiveBoard.propTypes = {
    board: PropTypes.array.isRequired,
    onTileClick: PropTypes.func.isRequired,
    selectedTileIndex: PropTypes.number,
    hintActive: PropTypes.bool,
    chestHintArea: PropTypes.array,
    isEditing: PropTypes.bool,
    pathAnalysis: PropTypes.object,
    isLayoutVisible: PropTypes.bool,
};
