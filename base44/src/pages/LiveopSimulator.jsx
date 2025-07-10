import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Puzzle, RotateCcw, Download, Edit, Eye, DownloadCloud, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recalculateAnalysis } from '../generation/analysis';
import ChainManagementPanel from '../components/simulator/ChainManagementPanel';

export default function LiveopSimulator() {
  const [currentConfig, setCurrentConfig] = useState({
    event_name: 'Default Event',
    item_chains: [
      { chain_name: 'Energy Cell', levels: 10, color: 'orange' },
      { chain_name: 'Data Chip', levels: 8, color: 'blue' },
      { chain_name: 'Bio Fuel', levels: 8, color: 'green' },
    ],
    milestones: [],
    crossChainMergeLevel: 4,
  });
  const [initialLayout, setInitialLayout] = useState(null);
  const [boardTiles, setBoardTiles] = useState([]);
  const [playerState, setPlayerState] = useState({ credits: 200 });
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
  const [isLayoutVisible, setIsLayoutVisible] = useState(true); // Default to true
  
  // State for managing imported layouts
  const [layoutsToImport, setLayoutsToImport] = useState([]);
  const [importedLayouts, setImportedLayouts] = useState([]);
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);
  const [importSourceConfig, setImportSourceConfig] = useState(null);
  const [bombGiven, setBombGiven] = useState(false);
  const [bombHoverIndex, setBombHoverIndex] = useState(null);
  const [crystalGeneratorCharges, setCrystalGeneratorCharges] = useState({});

  const fileInputRef = useRef(null);

  const showNotification = (message, type = 'info', duration = 3000) => {
    setNotification({ message, type, duration });
  };

  const showCelebration = (type, amount) => {
    setCelebration({ type, amount });
  };
  
  const checkMilestones = (newBoard) => {
    if (!pathAnalysis || !pathAnalysis.milestones) return;

    const newMilestoneStates = { ...milestoneStates };
    let rewardTotal = 0;
    let milestoneTriggered = false;

    pathAnalysis.milestones.forEach(milestone => {
        if (newMilestoneStates[milestone.row]) return; // already claimed

        // Detect any meaningful progress on or above the milestone row.
        // Progress can be:
        // 1) Discovering a new tile (fog-of-war cleared)
        // 2) Unlocking a tile that was previously locked
        // 3) Creating/Upgrading an item via merge (level increase or brand-new item)
        const milestoneProgress = newBoard.some((tile, idx) => {
            if (tile.row > milestone.row) return false; // ignore tiles below the milestone line

            const before = boardTiles[idx];

            // Safety – if we somehow lost map alignment, skip.
            if (!before) return false;

            // (1) Newly discovered tile
            if (tile.discovered && !before.discovered) return true;

            // (2) Tile unlocked state changed
            if (tile.unlocked && !before.unlocked) return true;

            // (3) Item merge/creation that results in a higher level or new item
            const afterItem = tile.item;
            const prevItem  = before.item;
            if (afterItem) {
                if (!prevItem) return true; // brand-new item placed
                if (afterItem.level > (prevItem.level || 0)) return true; // upgraded
            }

            return false;
        });

        if (milestoneProgress) {
            newMilestoneStates[milestone.row] = { discovered: true, claimed: true };
            rewardTotal += milestone.reward;
            showNotification(`Milestone Reached! +${milestone.reward} Energy!`, "success", 1500);
            showCelebration('energy', milestone.reward);
            milestoneTriggered = true;
        }
    });

    if (milestoneTriggered) {
        setMilestoneStates(newMilestoneStates);
        setPlayerState(prev => ({ ...prev, credits: prev.credits + rewardTotal }));
    }
  };

  // Utility: sanitize tiles to respect currentConfig.item_chains (remove unsupported chains)
  const sanitizeTilesForChains = (tiles, allowedChains) => {
    const allowedColors = allowedChains.map(c=>c.color);
    const pickRandomChain = () => allowedChains[Math.floor(Math.random()*allowedChains.length)];
    return tiles.map(tile=>{
      const newTile = { ...tile };
      // Handle generator
      if(newTile.item?.type==='generator'){
        const color = newTile.item.chains?.[0]?.color;
        if(!allowedColors.includes(color)){
          // remove generator => make free tile
          newTile.item = null;
          newTile.tile_type = 'free';
        }
      }
      // Handle items on board
      if(newTile.item?.type==='item'){
        if(!allowedColors.includes(newTile.item.chain_color)){
          const replacement = pickRandomChain();
          const lvl = newTile.item.level;
          newTile.item = {
            ...newTile.item,
            chain_color: replacement.color,
            chain_name: replacement.chain_name,
            chain: replacement,
            name: `${replacement.chain_name} L${lvl}`
          };
        }
      }
      // Handle semi_locked requirement
      if(newTile.required_item_chain_color && !allowedColors.includes(newTile.required_item_chain_color)){
        const replacement = pickRandomChain();
        const lvl = newTile.required_item_level;
        newTile.required_item_chain_color = replacement.color;
        if(newTile.required_item_name){
          newTile.required_item_name = `${replacement.chain_name} L${lvl}`;
        }
      }
      return newTile;
    });
  };

  const handleConfigCreate = (config) => {
    setIsSimulating(true);
    const { tiles, analysis } = generateBoardLayout(config);
    const sanitizedTiles = sanitizeTilesForChains(tiles, config.item_chains);
    loadLayoutData({ tiles: sanitizedTiles, analysis, config });
    showNotification("New simulation created successfully!", "success");
    setIsSimulating(false);
  };
  
  const loadLayoutData = (data) => {
    if (data.layouts && Array.isArray(data.layouts)) {
        // Batch import from LayoutGenerator
        setImportedLayouts(data.layouts);
        const sourceConfig = data.base_config || data.config || currentConfig;
        setImportSourceConfig(sourceConfig);
        setCurrentLayoutIndex(0);
        loadSelectedLayout(data.layouts[0], sourceConfig, true);
        showNotification(`${data.layouts.length} layouts imported successfully!`, "success");
    } else if (data.tiles && data.config) {
        // Single layout import
        setImportedLayouts([data]);
        const sourceConfig = data.config || currentConfig;
        setImportSourceConfig(sourceConfig);
        setCurrentLayoutIndex(0);
        loadSelectedLayout(data, sourceConfig, true);
        showNotification(`Layout imported successfully!`, "success");
    } else {
        showNotification("Invalid layout file format.", "error");
    }
  };

  const loadSelectedLayout = (layout, sourceConfig, isBatchLoad = false) => {
    const newConfig = { ...(sourceConfig || currentConfig), ...layout.config };
    const sanitizedTiles = sanitizeTilesForChains(layout.tiles, newConfig.item_chains);
    setBoardTiles(sanitizedTiles);
    setInitialLayout(JSON.parse(JSON.stringify(sanitizedTiles)));
    setPathAnalysis(layout.analysis);
    setCurrentConfig(newConfig);
    if (!isBatchLoad) {
        // If loading a single one from an already imported batch, update the index
        const idx = importedLayouts.findIndex(l => l.id === layout.id);
        if(idx !== -1) setCurrentLayoutIndex(idx);
    }
    setIsLayoutVisible(true); // Always show the layout on import
    resetGame(); // Soft reset
  };

  const resetGame = () => {
    if (initialLayout) {
      // Always restore pristine copy of starting board
      setBoardTiles(JSON.parse(JSON.stringify(initialLayout)));
    }

    // Reset player and game specific states
    setPlayerState({ credits: 100 });
    setSelectedTileIndex(null);
    setMilestoneStates({}); 
    setHintActive(false);
    setBombGiven(false);
    setBombHoverIndex(null);
    setCrystalGeneratorCharges({});
    setChestHintArea([]);
    setIsEditingBoard(false); // Reset editing mode
    setIsLayoutVisible(false); // Hide full layout on reset
    
    showNotification("Simulation has been reset.", "info");
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
        const data = JSON.parse(e.target.result);
        
        // --- DATA SANITIZATION ---
        // We will now IGNORE the item_chains from the imported file and ALWAYS use the
        // simulator's own default configuration as the single source of truth.
        // This prevents all issues with stale, incomplete, or invalid configs from old files.
        
        // 1. Get the application's default chains and the blue chain for conversion.
        const defaultChains = [
          { chain_name: 'Energy Cell', levels: 10, color: 'orange' },
          { chain_name: 'Data Chip', levels: 8, color: 'blue' },
          { chain_name: 'Bio Fuel', levels: 8, color: 'green' },
        ];
        const blueChain = defaultChains.find(c => c.color === 'blue');
        let unsupportedChainFound = false;

        // 2. Define the sanitization logic for a single layout.
        const processAndSanitizeLayout = (layout) => {
            const sanitizedTiles = layout.tiles.map(tile => {
                if (!tile.item) return tile;
                let chainColor = tile.item.chain_color || tile.item.chains?.[0]?.color;
                
                // If a tile's chain is not in our standard list, convert it to blue.
                if (chainColor && !['orange', 'blue', 'green'].includes(chainColor)) {
                    unsupportedChainFound = true;
                    if (tile.item.type === 'generator') return { ...tile, item: { ...tile.item, chains: [blueChain] } };
                    
                    const newLevel = tile.item.level;
                    return { ...tile, item: { ...tile.item, chain_color: blueChain.color, chain_name: blueChain.chain_name, chain: blueChain, name: `${blueChain.chain_name} L${newLevel}` } };
                }
                return tile;
            });
            return { ...layout, tiles: sanitizedTiles };
        };

        // 3. Apply sanitization to the imported data.
        let sanitizedData;
        if (data.layouts && Array.isArray(data.layouts)) {
            const sanitizedLayouts = data.layouts.map(processAndSanitizeLayout);
            sanitizedData = { ...data, layouts: sanitizedLayouts };
        } else {
            sanitizedData = processAndSanitizeLayout(data);
        }
        
        // 4. Force the sanitized data to use the application's default config.
        if (sanitizedData.config) {
            sanitizedData.config.item_chains = defaultChains;
        } else if (sanitizedData.base_config) {
            sanitizedData.base_config.item_chains = defaultChains;
        }

        if (unsupportedChainFound) {
            showNotification(`Unsupported items were found and converted to the 'blue' type.`, "warning");
        }
        // --- END SANITIZATION ---
        
        loadLayoutData(sanitizedData);

      } catch (error) {
        showNotification("Failed to parse JSON file.", "error");
        console.error("JSON parsing error:", error);
      }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input
  };

  const handleTileUpdate = (index, newTileData) => {
    const newBoard = [...boardTiles];
    const oldTile = newBoard[index];
    const updatedTile = { ...oldTile, ...newTileData };
    newBoard[index] = updatedTile;

    const wasGeneratorPlaced = newTileData.item?.type === 'generator' && oldTile.item?.type !== 'generator';

    if (wasGeneratorPlaced && (updatedTile.tile_type === 'semi_locked' || updatedTile.tile_type === 'locked')) {
        const generatorChain = updatedTile.item.chains[0];
        const { row, col } = updatedTile;
        const generatorCoord = `${row - 1},${col - 1}`;

        if (pathAnalysis && pathAnalysis.all_paths) {
            for (const path of pathAnalysis.all_paths) {
                const generatorPosInPath = path.path.indexOf(generatorCoord);
                
                if (generatorPosInPath !== -1 && generatorPosInPath < path.path.length - 1) {
                    const nextCoord = path.path[generatorPosInPath + 1];
                    const [r, c] = nextCoord.split(',').map(Number);
                    const nextTileIndex = newBoard.findIndex(t => t.row === r + 1 && t.col === c + 1);

                    if (nextTileIndex !== -1) {
                        const tileToUpdate = newBoard[nextTileIndex];
                        const newLevel = Math.max(2, (tileToUpdate.required_item_level || 3) - 1);
                        
                        tileToUpdate.required_item_chain_color = generatorChain.color;
                        tileToUpdate.required_item_name = `${generatorChain.chain_name} L${newLevel}`;
                        tileToUpdate.required_item_level = newLevel;

                        showNotification(`Path updated to use ${generatorChain.chain_name}.`, "success");
                        
                        const newAnalysis = recalculateAnalysis({ ...currentConfig, tiles: newBoard, analysis: pathAnalysis });
                        setPathAnalysis(newAnalysis);
                        
                        break;
                    }
                }
            }
        }
    }

    setBoardTiles(newBoard);
};

  const handleTileClick = (clickedIndex) => {
    if (isEditingBoard) {
        setSelectedTileIndex(clickedIndex);
        return;
    }

    const clickedTile = boardTiles[clickedIndex];

    if (clickedTile.item?.type === 'bomb') {
      const newBoard = [...boardTiles];
      const { row, col } = clickedTile;
      for (let r_offset = -1; r_offset <= 1; r_offset++) {
        for (let c_offset = -1; c_offset <= 1; c_offset++) {
          if (r_offset === 0 && c_offset === 0) continue;
          const neighborIndex = newBoard.findIndex(t => t.row === row + r_offset && t.col === col + c_offset);
          if (neighborIndex !== -1) {
            newBoard[neighborIndex] = { ...newBoard[neighborIndex], discovered: true };
          }
        }
      }
      newBoard[clickedIndex] = { ...newBoard[clickedIndex], item: null, tile_type: 'free' };
      setBoardTiles(newBoard);
      showNotification('💥 BOOM! Area revealed!', 'success');
      setBombHoverIndex(null);
      checkMilestones(newBoard);
      return;
    }

    // Selecting a flashlight
    if (clickedTile.item?.type === 'flashlight') {
        if (selectedTileIndex === clickedIndex) {
            setSelectedTileIndex(null);
        } else {
            setSelectedTileIndex(clickedIndex);
        }
        return;
    }

    if (clickedTile.tile_type === 'rock') {
      return;
    }

    // Handle generator click
    if (clickedTile.item?.type === 'generator') {
        if (clickedTile.item.isCrystal) {
            const generatorId = clickedTile.item.id;
            const chargesLeft = crystalGeneratorCharges[generatorId];

            if (chargesLeft <= 0) {
                showNotification("This Crystal Generator is depleted.", "error");
                return;
            }

            const emptyTileIndex = findRandomEmptyTile();
            if (emptyTileIndex === -1) return;

            const crystalChain = currentConfig.item_chains.find(c => c.isCrystal);
            if (!crystalChain) {
                showNotification("Crystal chain configuration not found.", "error");
                return;
            }

            const newItemLevel = 1;

            const newItem = {
                id: `item-${Date.now()}`,
                type: 'item',
                name: `${crystalChain.chain_name} L${newItemLevel}`,
                level: newItemLevel,
                chain_color: crystalChain.color,
                chain_name: crystalChain.chain_name,
                chain: crystalChain
            };
            
            const newBoard = [...boardTiles];
            newBoard[emptyTileIndex].item = newItem;

            const newCharges = chargesLeft - 1;
            setCrystalGeneratorCharges(prev => ({ ...prev, [generatorId]: newCharges }));

            if (newCharges === 0) {
                newBoard[clickedIndex].item = null;
                newBoard[clickedIndex].tile_type = 'free';
                showNotification('Crystal Generator depleted and vanished!', 'info');
            } else {
                newBoard[clickedIndex].item.uses = newCharges;
            }
            
            setBoardTiles(newBoard);
            checkMilestones(newBoard);
            return;
        }
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
      const itemLevel = generateItemLevel(selectedChain);

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
      checkMilestones(newBoard);
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
        
        if (!selectedTile.item || !clickedTile.item) {
          setSelectedTileIndex(clickedIndex);
          return;
        }

        const isSameChain = selectedTile.item.chain_color === clickedTile.item.chain_color;
        const isSameLevel = selectedTile.item.level === clickedTile.item.level;
        const crystalChain = currentConfig.item_chains.find(c => c.isCrystal);
        const isCrystalMergeLevel = crystalChain && selectedTile.item.level === crystalChain.crossChainMergeLevel;

        if (isSameChain && isSameLevel) {
          let masterChain = currentConfig.item_chains.find(c => c.color === selectedTile.item.chain_color) || selectedTile.item.chain;
          if (selectedTile.item.level >= masterChain.levels) {
            showNotification("This item is already at its maximum level.", "info");
            setSelectedTileIndex(null);
            return;
          }
          const newLevel = selectedTile.item.level + 1;
          const mergedItem = {
            id: `item-${Date.now()}`,
            type: 'item',
            name: `${masterChain.chain_name} L${newLevel}`,
            level: newLevel,
            chain_color: masterChain.color,
            chain_name: masterChain.chain_name,
            chain: masterChain,
          };
          const newBoard = [...boardTiles];
          newBoard[clickedIndex].item = mergedItem;
          newBoard[selectedTileIndex].item = null;
          setBoardTiles(newBoard);
          setSelectedTileIndex(null);
          showNotification(`Merged to ${mergedItem.name}!`, "success");
          checkMilestones(newBoard);
        } else if (!isSameChain && isSameLevel && isCrystalMergeLevel) {
            const newGeneratorId = `crystal-gen-${Date.now()}`;
            const newBoard = [...boardTiles];
            
            newBoard[clickedIndex].item = {
                id: newGeneratorId,
                type: 'generator',
                chains: [crystalChain],
                isCrystal: true,
                uses: crystalChain.crystalGeneratorUses,
            };
            newBoard[selectedTileIndex].item = null;
            
            setCrystalGeneratorCharges(prev => ({ ...prev, [newGeneratorId]: crystalChain.crystalGeneratorUses }));
            setBoardTiles(newBoard);
            setSelectedTileIndex(null);
            showNotification('🔮 Crystal Generator created!', 'success');
            checkMilestones(newBoard);
        } else {
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

            // Unlock the target tile
            const hadEmbeddedGenerator = clickedTile.item?.type === 'generator';

            newBoard[clickedIndex] = { 
                ...clickedTile, 
                unlocked: true, 
                discovered: true,
                item: hadEmbeddedGenerator ? clickedTile.item : null,
                tile_type: hadEmbeddedGenerator ? 'semi_locked' : 'free'
            };

            if (!hadEmbeddedGenerator) {
                const hadEmbeddedBomb = clickedTile.item?.type === 'bomb';
                 if (!bombGiven && (clickedTile.drops_bomb || hadEmbeddedBomb)) {
                     if(hadEmbeddedBomb) newBoard[clickedIndex].item = null;
                     const dropIndex = findRandomEmptyTile();
                     if (dropIndex !== -1) {
                         newBoard[dropIndex].item = { id:`bomb-${Date.now()}`, type:'bomb' };
                         setBombGiven(true);
                         showNotification('You found a bomb! Hover over it to see the blast radius.', 'info');
                     }
                 }
            }
            
            showNotification("Path revealed!", "success");
            
            const initialReveal = [];
            const { row, col } = clickedTile;
            const adjacentOffsets = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
            
            adjacentOffsets.forEach(offset => {
                const neighborIndex = newBoard.findIndex(t => t.row === row + offset.r && t.col === col + offset.c);
                if (neighborIndex !== -1 && !newBoard[neighborIndex].discovered) {
                    initialReveal.push(neighborIndex);
                }
            });

            const finalRevealIndices = new Set(initialReveal);

            initialReveal.forEach(index => {
                const tile = newBoard[index];
                if (tile.item?.type === 'generator' && (tile.tile_type === 'semi_locked' || tile.tile_type === 'locked')) {
                    const { row: genRow, col: genCol } = tile;
                    adjacentOffsets.forEach(offset => {
                        const neighborIndex = newBoard.findIndex(t => t.row === genRow + offset.r && t.col === genCol + offset.c);
                        if (neighborIndex !== -1 && !newBoard[neighborIndex].discovered) {
                            finalRevealIndices.add(neighborIndex);
                        }
                    });
                }
            });

            finalRevealIndices.forEach(index => {
                newBoard[index] = { ...newBoard[index], discovered: true };
                if (newBoard[index].tile_type === 'locked') {
                    newBoard[index].tile_type = 'semi_locked';
                }
            });

            setBoardTiles(newBoard);
            setSelectedTileIndex(null);

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
      
      // Persist current board (after key removal) as new baseline so reset keeps edits/changes.
      setInitialLayout(JSON.parse(JSON.stringify(newBoard)));

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
        // When finishing editing, re-run analysis on the modified board
        const currentLayout = {
            ...currentConfig,
            tiles: boardTiles,
            analysis: pathAnalysis,
        };
        const newAnalysis = recalculateAnalysis(currentLayout);
        setPathAnalysis(newAnalysis);

        // Save the edited board as the new baseline for resets
        setInitialLayout(JSON.parse(JSON.stringify(boardTiles)));
        
        showNotification("Board layout saved as the new baseline for this session.", "success");
    }
    setIsEditingBoard(p => !p);
  };

  const handleFlagTile = (clickedIndex) => {
    if(clickedIndex===null){ showNotification("Select a tile first to toggle entry.","info"); return; }
    const newTiles = [...boardTiles];
    const tile = newTiles[clickedIndex];
    if (tile.tile_type !== 'semi_locked' && tile.tile_type !== 'bridge') {
      showNotification("Only path tiles can be flagged as new entry points.", "warning");
      return;
    }
    
    const isNowEntryPoint = !tile.isEntryPoint;
    let discovered = tile.discovered;

    if (isNowEntryPoint) {
      // If flagging as an entry point, it must be discovered.
      discovered = true;
    } else {
      // If un-flagging, it should only remain discovered if it's unlocked itself
      // or is adjacent to another unlocked tile. Otherwise, it goes back into the fog.
      let remainsDiscovered = tile.unlocked;
      if (!remainsDiscovered) {
        const { row, col } = tile;
        const adjacentPositions = [
          { r: row - 1, c: col }, { r: row + 1, c: col },
          { r: row, c: col - 1 }, { r: row, c: col + 1 }
        ];
        const isAdjacentToUnlocked = newTiles.some(t =>
          t.unlocked && adjacentPositions.some(p => p.r === t.row && p.c === t.col)
        );
        remainsDiscovered = isAdjacentToUnlocked;
      }
      discovered = remainsDiscovered;
    }

    newTiles[clickedIndex] = { ...tile, isEntryPoint: isNowEntryPoint, discovered };
    
    // Create a new layout object to trigger re-analysis
    const newLayout = { ...currentConfig, tiles: newTiles, analysis: pathAnalysis };
    
    // This assumes a recalculateAnalysis function is available or will be added
    // For now, we'll just update the tiles and let a future effect handle it.
    setBoardTiles(newTiles);
    
    // A more robust solution would be to call a dedicated analysis function here
    // similar to the one in LayoutPreview
    const newAnalysis = recalculateAnalysis(newLayout);
    setPathAnalysis(newAnalysis);

    showNotification(`Entry point ${isNowEntryPoint ? 'added' : 'removed'}.`, "success");
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

    let analysisToExport = pathAnalysis;
    if (isEditingBoard) {
        const currentLayout = {
            ...currentConfig,
            tiles: boardTiles,
            analysis: pathAnalysis,
        };
        analysisToExport = recalculateAnalysis(currentLayout);
        showNotification("Analysis recalculated for export.", "info", 1500);
    }

    const exportData = {
      config: currentConfig,
      analysis: analysisToExport,
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

  const findRandomEmptyTile = (excludeIdx = -1) => {
    const emptyTiles = boardTiles
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile, index }) => 
        index !== excludeIdx &&
        (tile.tile_type === 'free' || tile.unlocked) && // free or unlocked path now usable
        !tile.item &&
        !tile.isReservedForChest
      );
    if (emptyTiles.length === 0) {
      showNotification("Board is full. No space for new items.", "error", 2000);
      return -1;
    }
    return emptyTiles[Math.floor(Math.random() * emptyTiles.length)].index;
  };

  const generateItemLevel = (chain) => {
    if (!chain) {
      return 1; // Fallback if no chain is provided
    }
    
    // Use the provided chain's probabilities, with a default
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
  
  const handleRemoveChain = (chainToRemove) => {
        if (currentConfig.item_chains.length <= 1) {
            showNotification("You must have at least one item chain.", "error");
            return;
        }

        let preservationRow = -1;
        boardTiles.forEach(tile => {
            if (tile.item?.type === 'generator' && tile.tile_type === 'semi_locked') {
                if (preservationRow === -1 || tile.row < preservationRow) {
                    preservationRow = tile.row;
                }
            }
        });

        const remainingChains = currentConfig.item_chains.filter(c => c.color !== chainToRemove.color);
        
        const newBoard = boardTiles.map(tile => {
            const newTile = { ...tile };

            if (newTile.item?.chain_color === chainToRemove.color) {
                if (preservationRow !== -1 && newTile.row <= preservationRow) {
                    return newTile; 
                }
                
                const replacementChain = remainingChains[Math.floor(Math.random() * remainingChains.length)];
                newTile.item = {
                    ...newTile.item,
                    chain_color: replacementChain.color,
                    chain_name: replacementChain.chain_name,
                    chain: replacementChain,
                    name: `${replacementChain.chain_name} L${newTile.item.level}`
                };
            }

            if (newTile.item?.type === 'generator' && newTile.item.chains[0].color === chainToRemove.color) {
                newTile.item = null;
                newTile.tile_type = 'free';
            }
            
            return newTile;
        });

        const newConfig = {
            ...currentConfig,
            item_chains: remainingChains
        };
        
        setCurrentConfig(newConfig);
        setBoardTiles(newBoard);
        setInitialLayout(JSON.parse(JSON.stringify(newBoard)));
        const newAnalysis = recalculateAnalysis({ ...newConfig, tiles: newBoard, analysis: pathAnalysis });
        setPathAnalysis(newAnalysis);

        showNotification(`Chain "${chainToRemove.chain_name}" removed and items converted.`, "success");
    };

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
                <TabsTrigger value="chains" className="flex items-center gap-2">Manage Chains</TabsTrigger>
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
                      <Button onClick={() => handleFlagTile(selectedTileIndex)} variant="outline" className="flex items-center gap-2" disabled={selectedTileIndex === null}>
                        <Flag className="w-4 h-4" />
                        Toggle Entry Flag
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
                            bombHoverIndex={bombHoverIndex}
                            setBombHoverIndex={setBombHoverIndex}
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
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cost Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {pathAnalysis ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between font-semibold">
                                                <span>Total Strategic Paths:</span>
                                                <span>{pathAnalysis.all_paths?.length || 0}</span>
                                            </div>
                                            <ScrollArea className="h-48 pr-3 border rounded-md">
                                                <div className="space-y-1 p-2">
                                                    {pathAnalysis.path_costs.map((cost, index) => (
                                                        <div className="flex justify-between text-xs p-1 rounded" key={`path-cost-${index}`}>
                                                            <span>Path {index + 1} Cost:</span>
                                                            <span>{cost}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    ) : <p>No analysis available.</p>}
                                </CardContent>
                            </Card>
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

            <TabsContent value="chains">
              <ChainManagementPanel
                chains={currentConfig.item_chains}
                onRemoveChain={handleRemoveChain}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
