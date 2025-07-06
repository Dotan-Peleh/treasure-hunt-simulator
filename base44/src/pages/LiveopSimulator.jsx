
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Puzzle, RotateCcw, Download, Edit, Eye, DownloadCloud, ChevronLeft, ChevronRight } from 'lucide-react';
import Chest from '../components/simulator/Chest';
import NotificationPopup from '../components/simulator/NotificationPopup';
import CelebrationAnimation from '../components/simulator/CelebrationAnimation';

import EventConfigForm from '../components/simulator/EventConfigForm';
import { generateBoardLayout } from '../components/simulator/BoardGenerator';
import { boardLayouts } from '../components/simulator/layout-definitions';
import InteractiveBoard from '../components/simulator/InteractiveBoard';
import PlayerHUD from '../components/simulator/PlayerHUD';
import SelectedItemPanel from '../components/simulator/SelectedItemPanel';
import TileEditPanel from '../components/simulator/TileEditPanel';
import { calculateProgress } from '../components/simulator/GameEngine';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function LiveopSimulator() {
  const [currentConfig, setCurrentConfig] = useState(null);
  const [initialLayout, setInitialLayout] = useState(null);
  const [boardTiles, setBoardTiles] = useState([]);
  const [playerState, setPlayerState] = useState({ credits: 100 });
  const [selectedTileIndex, setSelectedTileIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("config");
  const [isSimulating, setIsSimulating] = useState(false);
  const [pathAnalysis, setPathAnalysis] = useState(null);
  const [notification, setNotification] = useState(null);
  const [milestoneStates, setMilestoneStates] = useState({});
  const [hintActive, setHintActive] = useState(false);
  const [chestHintArea, setChestHintArea] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [isLayoutVisible, setIsLayoutVisible] = useState(false);
  
  // State for managing imported layouts
  const [layoutsToImport, setLayoutsToImport] = useState([]);
  const [importedLayouts, setImportedLayouts] = useState([]);
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);
  const [importSourceConfig, setImportSourceConfig] = useState(null);

  const fileInputRef = useRef(null);

  const showNotification = (message, type = 'info', duration = 3000) => {
    setNotification({ message, type, duration });
  };

  const showCelebration = (type, amount) => {
    setCelebration({ type, amount });
  };
  
  const checkMilestones = (newBoard) => {
    if (!currentConfig?.milestones) return;
    
    // Sort milestones to check from bottom-up
    const milestones = [...currentConfig.milestones].sort((a, b) => b.row - a.row);
    let totalReward = 0;
    let celebrationType = null;
    const newlyAchievedStates = {};
    
    // Create a combined state for this check to handle multiple milestones in one action
    const allClaimedStates = { ...milestoneStates };

    // Find the highest row (lowest number) where player has DISCOVERED a PATH tile.
    // This triggers the reward when the tile becomes visible, not when it's unlocked.
    // Exclude the 'key' tile from this calculation to prevent premature triggers.
    const discoveredPathTiles = newBoard.filter(tile =>
        (tile.tile_type === 'semi_locked' || tile.tile_type === 'locked') && tile.discovered
    );
    const discoveredRows = discoveredPathTiles.map(tile => tile.row);
    const highestProgressRow = discoveredRows.length > 0 ? Math.min(...discoveredRows) : 10;
    
    milestones.forEach((milestone, index) => {
      const milestoneKey = `row${milestone.row}`;
      
      // Trigger if player's progress is at or past the milestone row AND it hasn't been claimed yet in this session
      if (highestProgressRow <= milestone.row && !allClaimedStates[milestoneKey]) {
        totalReward += milestone.reward;
        newlyAchievedStates[milestoneKey] = true;
        allClaimedStates[milestoneKey] = true; // Mark as claimed for this check
        
        // Use the index from the sorted array to determine celebration type
        celebrationType = `milestone-${index + 1}`;
      }
    });

    if (totalReward > 0) {
      setPlayerState(prev => ({ ...prev, credits: prev.credits + totalReward }));
      setMilestoneStates(prev => ({ ...prev, ...newlyAchievedStates }));
      showCelebration(celebrationType, totalReward);
      showNotification(`🎉 Milestone reached! +${totalReward} Energy!`, "success");
    }
  };

  const handleConfigCreate = (config) => {
    setIsSimulating(true);
    const { tiles, analysis } = generateBoardLayout(config);
    loadLayoutData({ tiles, analysis, config });
    showNotification("New simulation created successfully!", "success");
    setIsSimulating(false);
  };
  
  const loadLayoutData = (data, options = {}) => {
    const { makeLayoutVisible = false } = options;
    const { tiles, analysis, config } = data;

    setCurrentConfig(config);
    setBoardTiles(tiles);
    // Store a deep copy of the initial layout for reliable resets
    setInitialLayout(JSON.parse(JSON.stringify(tiles)));
    setPathAnalysis(analysis);
    
    // Reset game state
    setPlayerState({ credits: 100 });
    setSelectedTileIndex(null);
    setMilestoneStates({}); // Reset dynamic milestone states
    setHintActive(false);
    setChestHintArea([]);
    setIsEditingBoard(false);
    setIsLayoutVisible(makeLayoutVisible); // Always start with layout hidden

    setActiveTab("playground");
  };
  
  const resetGame = () => {
    if (!currentConfig || !initialLayout) return;

    // Restore the board to its initial generated state
    setBoardTiles(JSON.parse(JSON.stringify(initialLayout)));

    // Reset player and game specific states
    setPlayerState({ credits: 100 });
    setSelectedTileIndex(null);
    setMilestoneStates({}); 
    setHintActive(false);
    setChestHintArea([]);
    setIsEditingBoard(false); // Reset editing mode
    setIsLayoutVisible(false); // Hide full layout on reset
    
    showNotification("Simulation has been reset with current layout.", "info");
  };

  const loadSelectedLayout = (layout, sourceConfig, isBatchLoad = false) => {
    if (!layout || !sourceConfig) return;

    // Create a synthetic config for the LiveopSimulator using the correct data
    const newConfig = {
        event_name: layout.name || 'Imported Layout',
        layout_id: layout.id,
        item_chains: sourceConfig.itemChains || [],
        milestones: layout.analysis.milestones || [], 
        duration_hours: sourceConfig.duration_hours || 72,
        pathCount: layout.analysis.path_info.path_count || 2,
        freeTileCount: sourceConfig.freeTileCount || 10,
    };
    
    loadLayoutData({
        tiles: layout.tiles,
        analysis: layout.analysis,
        config: newConfig,
    }, { makeLayoutVisible: true });
    
    if (!isBatchLoad) {
        // If loading a single layout, clear the browsing state.
        setImportedLayouts([]);
        setLayoutsToImport([]);
        setImportSourceConfig(null);
    }

    showNotification(`Loaded layout: ${layout.name}`, "success");
  };

  const handleLoadAll = () => {
      setImportedLayouts(layoutsToImport);
      setCurrentLayoutIndex(0);
      loadSelectedLayout(layoutsToImport[0], importSourceConfig, true);
      setLayoutsToImport([]); // Close the dialog
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        if (Array.isArray(importedData.layouts) && importedData.layouts.length > 0) {
          // This is a full export file from the generator.
          // Let the user pick which layout to load.
          setImportSourceConfig(importedData.config);
          setLayoutsToImport(importedData.layouts);
        } else if (importedData.tiles && importedData.analysis) {
          // This is a single layout object. Load it directly.
           const singleLayout = {
               ...importedData,
               name: importedData.config?.event_name || 'Imported Single Layout',
               id: importedData.config?.layout_id || 'single-import'
           };
          const sourceConfig = importedData.config || {};
          loadSelectedLayout(singleLayout, sourceConfig);
        } else {
          throw new Error("Invalid or unrecognized layout file format.");
        }
      } catch (error) {
        showNotification(`Error importing file: ${error.message}`, "error");
        console.error("Import error:", error);
      }
    };
    reader.readAsText(file);
    // Reset file input to allow importing the same file again
    event.target.value = null;
  };

  const handleTileUpdate = (index, newTileData) => {
    const newBoard = [...boardTiles];
    newBoard[index] = { ...newBoard[index], ...newTileData };
    setBoardTiles(newBoard);
  };

  const handleTileClick = (clickedIndex) => {
    if (isEditingBoard) {
        setSelectedTileIndex(clickedIndex);
        return;
    }

    const clickedTile = boardTiles[clickedIndex];

    if (clickedTile.tile_type === 'rock') {
      return;
    }

    // Handle generator click
    if (clickedTile.item?.type === 'generator') {
      const cost = 1;
      if (playerState.credits < cost) {
        showNotification("Not enough Energy!", "error");
        return;
      }
      
      const emptyTileIndex = findRandomEmptyTile();
      if (emptyTileIndex === -1) {
        return;
      }
      
      // Deduct credits FIRST
      setPlayerState(prev => ({ ...prev, credits: prev.credits - cost }));

      const generator = clickedTile.item;
      const selectedChain = generator.chains[Math.floor(Math.random() * generator.chains.length)];
      const itemLevel = generateItemLevel();

      const newItem = {
        id: `item-${Date.now()}`,
        type: 'item',
        name: `${selectedChain.chain_name} L${itemLevel}`,
        chain_color: selectedChain.color,
        level: itemLevel,
        chain_name: selectedChain.chain_name,
        chain: selectedChain,
      };
      
      const newBoard = [...boardTiles];
      newBoard[emptyTileIndex].item = newItem;
      setBoardTiles(newBoard);
      return;
    }

    // Handle item merging
    if (clickedTile.item?.type === 'item') {
      if (selectedTileIndex === null) {
        setSelectedTileIndex(clickedIndex);
      } else if (selectedTileIndex === clickedIndex) {
        setSelectedTileIndex(null);
      } else {
        const selectedTile = boardTiles[selectedTileIndex];
        
        // NEW MERGE CHECK: Based on color and level, not name.
        if (
          selectedTile.item.chain_color === clickedTile.item.chain_color &&
          selectedTile.item.level === clickedTile.item.level
        ) {
          // Find the authoritative chain from the current config based on color
          let masterChain = currentConfig.item_chains.find(c => c.color === selectedTile.item.chain_color);
          
          // If the chain color was deleted from config, use the item's own data as a fallback
          if (!masterChain) {
            masterChain = selectedTile.item.chain || clickedTile.item.chain || {
              chain_name: selectedTile.item.chain_name,
              color: selectedTile.item.chain_color,
              levels: Math.max(selectedTile.item.level + 2, 8)
            };
            showNotification(`Chain color "${masterChain.color}" not in config. Using item data as fallback.`, "info");
          }
          
          if (selectedTile.item.level >= masterChain.levels) {
            showNotification("This item is already at its maximum level.", "info");
            setSelectedTileIndex(null);
            return;
          }

          const newLevel = selectedTile.item.level + 1;
          // Create the new item using the masterChain's properties
          const mergedItem = {
            id: `item-${Date.now()}`,
            type: 'item',
            name: `${masterChain.chain_name} L${newLevel}`, // Use current name
            level: newLevel,
            chain_color: masterChain.color, // Use current color
            chain_name: masterChain.chain_name, // Use current name
            chain: masterChain, // Store the full, up-to-date chain object
          };
          
          const newBoard = [...boardTiles];
          newBoard[clickedIndex].item = mergedItem;
          newBoard[selectedTileIndex].item = null;
          
          setBoardTiles(newBoard);
          setSelectedTileIndex(null);
          
          showNotification(`Merged to ${mergedItem.name}!`, "success");
          checkMilestones(newBoard); // Check milestones after merge

        } else {
          // More informative error messages
          if (selectedTile.item.level !== clickedTile.item.level) {
              showNotification(`Cannot merge items of different levels (L${selectedTile.item.level} vs L${clickedTile.item.level}).`, "error");
          } else if (selectedTile.item.chain_color !== clickedTile.item.chain_color) {
              showNotification(`Cannot merge items from different chains (visually different colors).`, "error");
          }
          setSelectedTileIndex(clickedIndex);
        }
      }
      return;
    }
    
    // Handle key tile - just pick up the key item
    if (clickedTile.tile_type === 'key' && !clickedTile.item) {
      // Check if the key is reachable by checking for an adjacent unlocked tile
      const { row, col } = clickedTile;
      const isReachable = boardTiles.some(t =>
        t.unlocked && (
          (Math.abs(t.row - row) === 1 && t.col === col && t.discovered) ||
          (Math.abs(t.col - col) === 1 && t.row === row && t.discovered)
        )
      );

      if (!isReachable) {
        showNotification("You must clear a path to the key first!", "error");
        return;
      }

      if (!currentConfig || !currentConfig.item_chains) {
        showNotification("Configuration not loaded or item chains missing.", "error");
        return;
      }
      const keyChain = currentConfig.item_chains.find(c => c.color === 'orange') || currentConfig.item_chains[0];
      
      if (!keyChain) {
        showNotification("No item chains configured to generate key item.", "error");
        return;
      }

      const keyItem = {
        id: `key-${Date.now()}`,
        type: 'item',
        name: `${keyChain.chain_name} Key`,
        level: 1, // Level doesn't matter for the key
        chain_color: keyChain.color,
        chain_name: keyChain.chain_name,
        chain: keyChain,
      };
      
      const newBoard = [...boardTiles];
      // Mark the tile as unlocked, free, discovered, and reserved for chest (to prevent new items from spawning on it later)
      newBoard[clickedIndex] = { ...clickedTile, unlocked: true, tile_type: 'free', item: keyItem, discovered: true, isReservedForChest: true }; 
      setBoardTiles(newBoard);
      setSelectedTileIndex(null);
      showNotification("🗝️ Key obtained! Take it to the chest to win!", "success");
      
      // Reveal adjacent tiles (Fog of War) when a key is obtained
      const adjacentPositions = [
          { r: row - 1, c: col }, { r: row + 1, c: col },
          { r: row, c: col - 1 }, { r: row, c: col + 1 }
      ];
      adjacentPositions.forEach(pos => {
          const adjacentIndex = newBoard.findIndex(t => t.row === pos.r && t.col === pos.c);
          if (adjacentIndex !== -1) {
              newBoard[adjacentIndex].discovered = true;
              if (newBoard[adjacentIndex].tile_type === 'locked') {
                  newBoard[adjacentIndex].tile_type = 'semi_locked';
              }
          }
      });
      setBoardTiles(newBoard); // Update again with discovered state

      checkMilestones(newBoard); // Check milestones after key obtain
      return;
    }
    
    // Handle unlocking tiles (semi_locked and locked only)
    if ((clickedTile.tile_type === 'semi_locked' || clickedTile.tile_type === 'locked') && !clickedTile.unlocked) {
        if(selectedTileIndex === null) {
            showNotification(`Requires a ${clickedTile.required_item_name} to unlock.`, "info");
            return;
        }

        const selectedItem = boardTiles[selectedTileIndex].item;
        
        const isCompatible = selectedItem && 
            selectedItem.chain_color === clickedTile.required_item_chain_color &&
            selectedItem.level === clickedTile.required_item_level;
            
        if (isCompatible) {
            const newBoard = [...boardTiles];
            // The item from the selected tile is being "used up"
            newBoard[selectedTileIndex].item = null;

            // SIMPLIFIED: Unlock the target tile and make it empty. No more "merge-to-unlock".
            // This makes the progression clearer: you use an item to reveal more of the path.
            newBoard[clickedIndex] = { ...clickedTile, unlocked: true, discovered: true, item: null };
            showNotification("Path revealed!", "success");
            
            // Reveal adjacent tiles (Fog of War)
            const { row, col } = clickedTile;
            const adjacentPositions = [
                { r: row - 1, c: col }, { r: row + 1, c: col },
                { r: row, c: col - 1 }, { r: row, c: col + 1 }
            ];
            adjacentPositions.forEach(pos => {
                const adjacentIndex = newBoard.findIndex(t => t.row === pos.r && t.col === pos.c);
                if (adjacentIndex !== -1) {
                    newBoard[adjacentIndex].discovered = true;
                    if (newBoard[adjacentIndex].tile_type === 'locked') {
                        newBoard[adjacentIndex].tile_type = 'semi_locked';
                    }
                }
            });

            setBoardTiles(newBoard);
            setSelectedTileIndex(null);

            // ALWAYS check milestones after a successful unlock/board change.
            checkMilestones(newBoard);
        } else {
            // More helpful error message
            if (selectedItem) {
                showNotification(`Incorrect item. Need: ${clickedTile.required_item_name} (Color: ${clickedTile.required_item_chain_color}, Level: ${clickedTile.required_item_level}). You have: ${selectedItem.name} (Color: ${selectedItem.chain_color}, Level: ${selectedItem.level}).`, "error");
            } else {
                showNotification(`Incorrect item. Requires ${clickedTile.required_item_name}.`, "error");
            }
        }
    }
  };
  
  const handleChestClick = () => {
    if (selectedTileIndex === null) {
      showNotification("Select the key item first!", "info");
      return;
    }
    
    const selectedItem = boardTiles[selectedTileIndex].item;
    if (selectedItem && selectedItem.name && selectedItem.name.includes("Key")) {
      // Player has the key item! Victory!
      const newBoard = [...boardTiles];
      newBoard[selectedTileIndex].item = null; // Remove key item
      setBoardTiles(newBoard);
      setSelectedTileIndex(null);
      
      // Grant victory reward
      setPlayerState(prev => ({ ...prev, credits: prev.credits + 5000 }));
      showCelebration('chest', 5000);
      showNotification("🎉 VICTORY! You've completed the event! 🎉", "success", 5000);
      
      // Reset after celebration
      setTimeout(() => resetGame(), 3000);
    } else {
      showNotification("You need the special key to open the chest!", "error");
    }
  };

  const handleNextLayout = () => {
    if (currentLayoutIndex < importedLayouts.length - 1) {
        const newIndex = currentLayoutIndex + 1;
        setCurrentLayoutIndex(newIndex);
        loadSelectedLayout(importedLayouts[newIndex], importSourceConfig, true);
    }
  };

  const handlePrevLayout = () => {
      if (currentLayoutIndex > 0) {
          const newIndex = currentLayoutIndex - 1;
          setCurrentLayoutIndex(newIndex);
          loadSelectedLayout(importedLayouts[newIndex], importSourceConfig, true);
      }
  };

  const handleToggleEditMode = () => {
    if (isEditingBoard) {
        // When finishing editing, we need to re-run the analysis to get fresh data
        // for the potentially modified board. We can do this by running the generator
        // with a custom grid derived from the current tiles.

        const tempGrid = Array(9).fill(null).map(() => Array(7).fill(null));
        boardTiles.forEach(t => {
            // This is a simplification; we lose some fidelity (e.g., path1 vs path2),
            // but for re-analysis, mapping tile_type to a base grid type is sufficient.
            const gridType = (t.tile_type === 'semi_locked' || t.tile_type === 'locked') ? 'path' : t.tile_type;
            tempGrid[t.row - 1][t.col - 1] = gridType;
        });

        const { analysis } = generateBoardLayout({
            ...currentConfig,
            customGrid: tempGrid,
        });

        setPathAnalysis(analysis);
        setInitialLayout(JSON.parse(JSON.stringify(boardTiles)));
        showNotification("Board layout saved as the new baseline for this session.", "success");
    }
    setIsEditingBoard(p => !p);
  };

  const handleDeleteItem = (indexToDelete) => {
      if (indexToDelete === null) return;
      const newBoard = [...boardTiles];
      newBoard[indexToDelete].item = null;
      setBoardTiles(newBoard);
      setSelectedTileIndex(null);
      showNotification("Item removed.", "info");
  };

  const handleExport = () => {
    if (!currentConfig || !boardTiles.length) {
      showNotification("No active simulation to export.", "error");
      return;
    }

    const exportData = {
      config: currentConfig,
      analysis: pathAnalysis, // Use the analysis from the state, which is now always fresh
      tiles: boardTiles.map(({ ...rest }) => rest),
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentConfig.event_name.replace(/\s+/g, '_')}_layout.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Current layout exported successfully!", "success");
  };
  
  const handleExportAllLayouts = () => {
    if (!currentConfig) {
      showNotification("No active configuration to generate layouts.", "error");
      return;
    }

    showNotification("Generating all layouts for export... this may take a moment.", "info");

    setTimeout(() => {
      try {
        const allLayoutsData = boardLayouts.map(layout => {
          // Use a deep copy of the currentConfig to ensure no side effects
          const testConfig = JSON.parse(JSON.stringify(currentConfig));
          testConfig.layout_id = layout.id; // Override layout_id for this specific layout

          const { tiles, analysis } = generateBoardLayout(testConfig);
          return {
            layout_name: layout.name,
            layout_id: layout.id,
            analysis,
            tiles: tiles.map(({ ...rest }) => rest), // Don't export discovered state as it's runtime
          };
        });

        const exportData = {
          base_config: currentConfig, // Include the base config used for generation
          layouts: allLayoutsData,
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentConfig.event_name.replace(/\s+/g, '_')}_all_layouts.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("All layouts exported successfully!", "success");
      } catch (error) {
        console.error("Error exporting all layouts:", error);
        showNotification("Failed to export all layouts. See console for details.", "error");
      }
    }, 500); // Timeout to allow notification to show before processing
  };
  
  const handleLayoutChange = () => {
    if (!currentConfig) {
      showNotification("No configuration loaded to change layout.", "error");
      return;
    }
    
    // Get a random layout different from the current one
    const availableLayouts = boardLayouts.filter(layout => layout.id !== currentConfig.layout_id);
    
    if (availableLayouts.length === 0) {
      showNotification("No other layouts available to switch to.", "info");
      return;
    }

    const randomLayout = availableLayouts[Math.floor(Math.random() * availableLayouts.length)];
    
    // Create new config with the new layout
    const newConfig = { ...currentConfig, layout_id: randomLayout.id };
    
    // Generate new board with same settings but different layout
    const { tiles, analysis } = generateBoardLayout(newConfig);
    
    setCurrentConfig(newConfig);
    setBoardTiles(tiles);
    setInitialLayout(JSON.parse(JSON.stringify(tiles)));
    setPathAnalysis(analysis);
    
    // Reset game state but keep current energy
    const currentCredits = playerState.credits;
    setPlayerState({ credits: currentCredits });
    setSelectedTileIndex(null);
    setMilestoneStates({});
    setHintActive(false);
    setChestHintArea([]);
    setIsEditingBoard(false);
    setIsLayoutVisible(false);
    
    showNotification(`🎲 New layout: ${randomLayout.name}!`, "success");
  };

  const handleHintClick = () => {
    const hintCost = 25;
    if (playerState.credits < hintCost) {
      showNotification("Not enough energy for a hint!", "error");
      return;
    }
    if (hintActive) {
      showNotification("Hint is already active!", "info");
      return;
    }
    const keyTile = boardTiles.find(t => t.tile_type === 'key');
    if (!keyTile) {
      showNotification("No key tile found on the board!", "error");
      return;
    }
    setPlayerState(prev => ({ ...prev, credits: prev.credits - hintCost }));
    const hintTiles = [];
    for(let r = keyTile.row - 1; r <= keyTile.row + 1; r++) {
      for(let c = keyTile.col - 1; c <= keyTile.col + 1; c++) {
        if(r >= 1 && r <= 9 && c >=1 && c <= 7) {
            hintTiles.push({ row: r, col: c });
        }
      }
    }
    setChestHintArea(hintTiles);
    setHintActive(true);
    showNotification("The key's location has been narrowed down!", "success");
  };

  const findRandomEmptyTile = () => {
    const emptyTiles = boardTiles
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile }) => 
        (tile.tile_type === 'free' || tile.unlocked) && // Tile is generally available
        !tile.item && // Tile has no item
        !tile.isReservedForChest // Tile is not reserved as a chest location (where key was picked up)
      );
    if (emptyTiles.length === 0) {
      showNotification("Board is full. No space for new items.", "error", 2000);
      return -1;
    }
    return emptyTiles[Math.floor(Math.random() * emptyTiles.length)].index;
  };

  const generateItemLevel = () => {
    if (!currentConfig || !currentConfig.item_chains || currentConfig.item_chains.length === 0) {
      return 1; // Fallback to level 1 if no config or chains
    }
    
    // Use the first chain's probabilities as default for generators
    const chain = currentConfig.item_chains[0];
    const probabilities = chain.level_probabilities || { 1: 90, 2: 10 };
    
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [level, probability] of Object.entries(probabilities)) {
      cumulative += probability;
      if (random <= cumulative) {
        return parseInt(level);
      }
    }
    
    return 1; // Fallback to level 1 if probabilities don't sum up or no match
  };

  const progressData = boardTiles.length > 0 && pathAnalysis ? calculateProgress(boardTiles, pathAnalysis.total_path_tiles) : null;
  const selectedItem = selectedTileIndex !== null ? boardTiles[selectedTileIndex]?.item : null;
  
  return (
    <>
      <NotificationPopup notification={notification} onClose={() => setNotification(null)} />
      {celebration && (
        <CelebrationAnimation
          type={celebration.type}
          amount={celebration.amount}
          onComplete={() => setCelebration(null)}
        />
      )}

      <Dialog open={layoutsToImport.length > 0} onOpenChange={() => setLayoutsToImport([])}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select a Layout to Import</DialogTitle>
            <DialogDescription>
              Your file contains {layoutsToImport.length} layouts. Click one to load it individually, or load all to browse.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
            {layoutsToImport.map((layout) => (
              <div 
                key={layout.id} 
                className="p-4 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => loadSelectedLayout(layout, importSourceConfig)}
              >
                <h3 className="font-semibold">{layout.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {layout.analysis.path_info.path_count} paths, {layout.analysis.total_path_tiles} tiles, Cost Variance: {layout.analysis.cost_variance.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
              <Button onClick={handleLoadAll} className="w-full">
                  Load All {layoutsToImport.length} Layouts & Browse
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen p-4 md:p-8 bg-slate-50 text-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-left mb-8">
            <h1 className="text-4xl font-bold text-gray-800">
              LiveOps Simulator
            </h1>
            <p className="text-slate-600 text-lg">
              Configure and test your game event mechanics.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex justify-start">
              <TabsList>
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="playground" disabled={!currentConfig} className="flex items-center gap-2">
                  <Puzzle className="w-5 h-5" />
                  Playground
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="config">
              <EventConfigForm onConfigCreate={handleConfigCreate} isSimulating={isSimulating}/>
            </TabsContent>

            <TabsContent value="playground">
              {currentConfig && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-slate-800">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold">
                            {isEditingBoard ? "Editing:" : ""}
                        </h2>
                        {isEditingBoard ? (
                            <Input 
                                value={currentConfig.event_name}
                                onChange={(e) => setCurrentConfig(prev => ({...prev, event_name: e.target.value}))}
                                className="text-3xl font-bold"
                            />
                        ) : (
                            <h2 className="text-3xl font-bold">{currentConfig.event_name}</h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                       {importedLayouts.length > 1 && (
                        <div className="flex items-center gap-2 border rounded-lg p-1">
                            <Button onClick={handlePrevLayout} disabled={currentLayoutIndex === 0} variant="ghost" size="icon">
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                Layout {currentLayoutIndex + 1} of {importedLayouts.length}
                            </span>
                            <Button onClick={handleNextLayout} disabled={currentLayoutIndex >= importedLayouts.length - 1} variant="ghost" size="icon">
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                      )}
                      <Button onClick={() => setIsLayoutVisible(p => !p)} variant="outline" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {isLayoutVisible ? "Hide Full Layout" : "Show Full Layout"}
                      </Button>
                      <Button onClick={handleToggleEditMode} variant={isEditingBoard ? "default" : "outline"} className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        {isEditingBoard ? "Done Editing" : "Edit Board"}
                      </Button>
                      <Button onClick={handleLayoutChange} variant="outline" className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200" disabled={isEditingBoard}>
                        <Puzzle className="w-4 h-4" />
                        Change Layout
                      </Button>
                      <Button onClick={resetGame} variant="outline" className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </Button>
                      <Button onClick={handleImportClick} variant="outline" className="flex items-center gap-2">
                        <DownloadCloud className="w-4 h-4" />
                        Import Layouts
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        className="hidden"
                        accept=".json"
                      />
                      <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export Current
                      </Button>
                      <Button onClick={handleExportAllLayouts} variant="outline" className="flex items-center gap-2" disabled={isEditingBoard}>
                        <DownloadCloud className="w-4 h-4" />
                        Export All Layouts
                      </Button>
                    </div>
                  </div>
                  
                  {!isEditingBoard && (
                    <PlayerHUD 
                      playerState={playerState}
                      progressData={progressData}
                      pathAnalysis={pathAnalysis}
                      onHintClick={handleHintClick}
                      hintActive={hintActive}
                    />
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      <div className="lg:col-span-2">
                          <InteractiveBoard 
                            board={boardTiles}
                            onTileClick={handleTileClick}
                            selectedTileIndex={selectedTileIndex}
                            hintActive={hintActive}
                            chestHintArea={chestHintArea}
                            isEditing={isEditingBoard}
                            pathAnalysis={pathAnalysis}
                            isLayoutVisible={isLayoutVisible}
                          />
                      </div>
                      <div className="lg:col-span-1 space-y-4">
                        {isEditingBoard ? (
                            <TileEditPanel
                                tile={selectedTileIndex !== null ? boardTiles[selectedTileIndex] : null}
                                onUpdate={(data) => handleTileUpdate(selectedTileIndex, data)}
                                itemChains={currentConfig.item_chains}
                                onClose={() => setSelectedTileIndex(null)}
                            />
                        ) : (
                          <>
                            <Chest 
                              onClick={handleChestClick}
                              selectedItem={selectedItem}
                            /> 
                            <SelectedItemPanel
                              board={boardTiles}
                              selectedIndex={selectedTileIndex}
                              onDeleteItem={handleDeleteItem}
                            />
                          </>
                        )}
                      </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
