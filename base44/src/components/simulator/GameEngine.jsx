
export const initializeGameState = (config) => {
  return {
    creditsSpent: 0
  };
};

export const calculateProgress = (boardTiles, totalPathTilesCount) => {
  const pathTiles = boardTiles.filter(t => 
    t.tile_type === 'semi_locked' || t.tile_type === 'locked' || t.tile_type === 'key'
  );

  const unlockedPathTiles = pathTiles.filter(t => t.unlocked);
  const unlockedPathTilesCount = unlockedPathTiles.length;
  
  const keyTile = boardTiles.find(t => t.tile_type === 'key');
  const keyItem = boardTiles.find(t => t.item && t.item.name?.includes("Key"));

  // If the key has been obtained, progress is 100%
  if (keyItem || (keyTile && keyTile.unlocked && !keyTile.item)) {
    return {
        completion_percentage: 100,
        unlocked_tiles: totalPathTilesCount,
        total_path_tiles: totalPathTilesCount
    };
  }

  return {
    completion_percentage: totalPathTilesCount > 0 ? (unlockedPathTilesCount / totalPathTilesCount) * 100 : 0,
    unlocked_tiles: unlockedPathTilesCount,
    total_path_tiles: totalPathTilesCount
  };
};

export const canUnlockGenerator = (generator, playerProgress) => {
  return true;
};
