import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Settings, 
  Puzzle, 
  Download, 
  Play, 
  Pause, 
  BarChart3,
  Grid3X3,
  Zap,
  Target,
  TrendingUp,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { generateBoardLayout } from './BoardGenerator';
import { boardLayouts } from './layout-definitions';
import LayoutPreview from './LayoutPreview';

const PREVIEWS_PER_PAGE = 10;

export default function LayoutGeneratorSimulator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedLayouts, setGeneratedLayouts] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [previewPage, setPreviewPage] = useState(0);
  
  const [generationConfig, setGenerationConfig] = useState({
    generationType: 'all',
    baseLayoutIterations: 2,
    variationsPerLayout: 5,
    numRandomLayouts: 20,
    itemChains: [
      { chain_name: 'Energy Cell', levels: 12, color: 'orange' },
      { chain_name: 'Data Chip', levels: 8, color: 'blue' },
      { chain_name: 'Bio Fuel', levels: 10, color: 'green' }
    ],
    // MILESTONE REWORK: Now controlled by a single 'count' value.
    // The actual rewards and rows will be generated dynamically.
    milestoneCount: 3, 
    pathCount: 2,
    freeTileCount: 10,
    pathPattern: 'random', // 'random', 'vertical', 's_curve', 'y_junction'
  });
  
  const [filters, setFilters] = useState({
    minCostVariance: 0,
    maxCostVariance: 1000,
    minPathTiles: 0,
    maxPathTiles: 100,
    hasConnection: 'all',
    layoutType: 'all'
  });
  
  const [sortBy, setSortBy] = useState('cost_variance');
  const [sortOrder, setSortOrder] = useState('asc');

  // Load layouts from local storage on initial render
  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem('generatedLayouts');
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        setGeneratedLayouts(parsedLayouts);
        analyzeGeneratedLayouts(parsedLayouts);
      }
    } catch (error) {
      console.error("Failed to load layouts from local storage:", error);
      localStorage.removeItem('generatedLayouts'); // Clear corrupted data
    }
  }, []); // Run only once on mount

  // Save layouts to local storage whenever they change
  useEffect(() => {
    try {
      if (generatedLayouts.length > 0) {
        localStorage.setItem('generatedLayouts', JSON.stringify(generatedLayouts));
      } else {
        // This will be triggered by handleClearLayouts
        localStorage.removeItem('generatedLayouts');
      }
    } catch (error) {
      console.error("Failed to save layouts to local storage:", error);
    }
  }, [generatedLayouts]);

  const generateSingleLayout = (layoutId, name, config, customGrid = null) => {
    const layoutConfig = {
      ...config,
      item_chains: config.itemChains,
      // DYNAMIC MILESTONES: Generate them based on the count.
      milestones: generateDynamicMilestones(config.milestoneCount),
      layout_id: layoutId,
      customGrid: customGrid,
    };
    
    try {
      const result = generateBoardLayout(layoutConfig);

      // Entry point validation: ensure entry points are not too high on the board.
      // "Max line 3" from the bottom corresponds to tile.row >= 7.
      const entryPoints = result.tiles.filter(t => t.isEntryPoint);
      for (const entry of entryPoints) {
        if (entry.row < 8) {
          return null; // Discard layout if an entry point is higher than row 8 (max line 2).
        }
      }

      // The 15% cost deviation rule has been removed. All layouts will be kept.

      return {
        id: layoutId,
        name: name,
        tiles: result.tiles,
        analysis: {
          ...result.analysis,
          balance_score: calculateBalanceScore(result.analysis),
          complexity_score: calculateComplexityScore(result.analysis),
          strategic_variance: calculateStrategicVariance(result.analysis)
        },
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error generating layout ${layoutId}: ${error.message}`);
      return null;
    }
  };

  const generateLayouts = async () => {
    setIsGenerating(true);
    // Reset any prior per-layout feedback so the next batch starts clean
    try {
      localStorage.removeItem('layoutFeedback');
    } catch {/* ignore */}
    setGenerationProgress(0);
    setGeneratedLayouts([]);
    setCurrentAnalysis(null);

    const baseLayouts = (generationConfig.generationType === 'all' || generationConfig.generationType === 'base' || generationConfig.generationType === 'variations')
      ? boardLayouts.map(l => ({ id: l.id, name: l.name, grid: null }))
      : [];

    const finalGenerationQueue = [];

    // --- Determine Path Counts for the Batch ---
    const pathCounts = [];
    for (let i = 0; i < baseLayouts.length * generationConfig.baseLayoutIterations; i++) {
        const rand = Math.random();
        if (rand < 0.01) pathCounts.push(1); // 1% chance for 1 path
        else if (rand < 0.34) pathCounts.push(2); // 33% chance for 2
        else if (rand < 0.67) pathCounts.push(3); // 33% chance for 3
        else pathCounts.push(4); // 33% chance for 4
    }

    if (generationConfig.generationType === 'all' || generationConfig.generationType === 'base') {
      for (let i = 0; i < generationConfig.baseLayoutIterations; i++) {
        baseLayouts.forEach(baseLayout => finalGenerationQueue.push({ 
            ...baseLayout, 
            pathCount: pathCounts.pop() || generationConfig.pathCount 
        }));
      }
    }

    if (generationConfig.generationType === 'all' || generationConfig.generationType === 'variations') {
      // NOTE: Advanced generator was removed as part of simplification.
      // This block can be extended in the future if new variation logic is needed.
    }

    if (generationConfig.generationType === 'all' || generationConfig.generationType === 'random') {
      // Generate random layouts using the procedural generator
      for (let i = 0; i < generationConfig.numRandomLayouts; i++) {
        finalGenerationQueue.push({ id: `random-${Math.floor(Math.random() * 10000)}`, name: `Random Layout #${i + 1}`, grid: null });
      }
    }

    const newLayouts = [];
    const total = finalGenerationQueue.length;

    for (let i = 0; i < total; i++) {
      const layoutInfo = finalGenerationQueue[i];
      const newConfig = { ...generationConfig, pathCount: layoutInfo.pathCount || generationConfig.pathCount };
      const layout = generateSingleLayout(layoutInfo.id, layoutInfo.name, newConfig, layoutInfo.grid);
      if (layout) {
        newLayouts.push(layout);
      }
      
      setGenerationProgress((i + 1) / total * 100);
      // Yield to main thread to prevent freezing
      await new Promise(resolve => setTimeout(resolve, 0)); 
    }

    const allLayouts = [...generatedLayouts, ...newLayouts];
    setGeneratedLayouts(allLayouts);
    setPreviewPage(0); // Reset to first page on new generation
    analyzeGeneratedLayouts(allLayouts);
    setIsGenerating(false);
    alert(`Successfully generated ${newLayouts.length} layouts!`);
  };

  // New function to generate milestones dynamically based on count.
  const generateDynamicMilestones = (count) => {
    if (count === 0) return [];
    const rewards = [];
    while (rewards.length < count) {
      const rand = Math.floor(25 + Math.random() * 36); // 25-60 inclusive
      if (!rewards.includes(rand)) rewards.push(rand);
    }
    rewards.sort((a, b) => a - b); // ensure ascending
    const rowPositions = [7, 5, 3]; // bottom to top
    return rewards.map((reward, idx) => ({ row: rowPositions[idx], reward }));
  };

  const calculateBalanceScore = (analysis) => {
    let score = 100;
    const costVariancePenalty = Math.min(analysis.cost_variance / 10, 30);
    score -= costVariancePenalty;

    const pathLengths = analysis.path_info.path_tiles;
    if (pathLengths && pathLengths.length > 1) {
        const minLength = Math.min(...pathLengths);
        const maxLength = Math.max(...pathLengths);
        if (maxLength > 0) {
            const pathRatio = minLength / maxLength;
    const pathBalanceBonus = pathRatio * 10;
    score += pathBalanceBonus;
        }
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateComplexityScore = (analysis) => {
    let score = 0;
    score += Math.min(analysis.total_path_tiles / 2, 30);
    if (analysis.path_info.has_connection) score += 20;
    score += Math.min(analysis.path_info.bridge_tiles * 3, 25);
    score += Math.min(analysis.cost_variance / 5, 25);
    return Math.min(100, score);
  };

  const calculateStrategicVariance = (analysis) => {
    const pathLengths = analysis.path_info.path_tiles;
    if (!pathLengths || pathLengths.length < 2) return 0;

    const minLength = Math.min(...pathLengths);
    const maxLength = Math.max(...pathLengths);
    
    const totalTiles = pathLengths.reduce((a, b) => a + b, 0);
    if (totalTiles === 0) return 0;

    return ((maxLength - minLength) / totalTiles) * 100;
  };

  const analyzeGeneratedLayouts = (layouts) => {
    if (layouts.length === 0) return;
    const analysis = {
      total_layouts: layouts.length,
      average_balance_score: layouts.reduce((sum, l) => sum + l.analysis.balance_score, 0) / layouts.length,
      average_complexity_score: layouts.reduce((sum, l) => sum + l.analysis.complexity_score, 0) / layouts.length,
      average_strategic_variance: layouts.reduce((sum, l) => sum + l.analysis.strategic_variance, 0) / layouts.length,
      average_cost_variance: layouts.reduce((sum, l) => sum + l.analysis.cost_variance, 0) / layouts.length,
      average_path_tiles: layouts.reduce((sum, l) => sum + l.analysis.total_path_tiles, 0) / layouts.length,
      connected_paths_percentage: layouts.filter(l => l.analysis.path_info.has_connection).length / layouts.length * 100,
      layout_distribution: {},
      top_balanced_layouts: [],
      top_complex_layouts: [],
      top_strategic_layouts: []
    };
    layouts.forEach(layout => {
      analysis.layout_distribution[layout.id] = (analysis.layout_distribution[layout.id] || 0) + 1;
    });
    analysis.top_balanced_layouts = [...layouts].sort((a, b) => b.analysis.balance_score - a.analysis.balance_score).slice(0, 10);
    analysis.top_complex_layouts = [...layouts].sort((a, b) => b.analysis.complexity_score - a.analysis.complexity_score).slice(0, 10);
    analysis.top_strategic_layouts = [...layouts].sort((a, b) => b.analysis.strategic_variance - a.analysis.strategic_variance).slice(0, 10);
    setCurrentAnalysis(analysis);
  };

  const getFilteredAndSortedLayouts = () => {
    let filtered = generatedLayouts.filter(layout => {
      const analysis = layout.analysis;
      if (analysis.cost_variance < filters.minCostVariance || analysis.cost_variance > filters.maxCostVariance) return false;
      if (analysis.total_path_tiles < filters.minPathTiles || analysis.total_path_tiles > filters.maxPathTiles) return false;
      if (filters.hasConnection !== 'all') {
        const hasConnection = analysis.path_info.has_connection;
        if (filters.hasConnection === 'connected' && !hasConnection) return false;
        if (filters.hasConnection === 'independent' && hasConnection) return false;
      }
      return true;
    });
    filtered.sort((a, b) => {
      const aValue = a.analysis[sortBy];
      const bValue = b.analysis[sortBy];
      if (sortOrder === 'asc') return aValue - bValue;
      else return bValue - aValue;
    });
    return filtered;
  };

  const exportLayouts = () => {
    const data = {
      generated_at: new Date().toISOString(),
      config: generationConfig,
      analysis: currentAnalysis,
      layouts: getFilteredAndSortedLayouts()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPageFeedback = () => {
    let feedback = {};
    try {
      feedback = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
    } catch { feedback = {}; }
    const layoutsWithFeedback = paginatedLayouts.map(l => ({
        ...l,
        feedback: feedback[l.id] || null
    }));
    const data = {
      exported_at: new Date().toISOString(),
      layouts: layoutsWithFeedback
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-feedback-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLayouts = () => {
    setGeneratedLayouts([]);
    setCurrentAnalysis(null);
    setPreviewPage(0);
    try {
      localStorage.removeItem('layoutFeedback');
    } catch {/* ignore */}
  };

  const filteredLayouts = getFilteredAndSortedLayouts();
  const totalPreviewPages = Math.ceil(filteredLayouts.length / PREVIEWS_PER_PAGE);
  const paginatedLayouts = filteredLayouts.slice(
    previewPage * PREVIEWS_PER_PAGE,
    (previewPage + 1) * PREVIEWS_PER_PAGE
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Layout Generator Simulator</h1>
          <p className="text-muted-foreground">
            Generate and analyze multiple board layouts to find optimal configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateLayouts} disabled={isGenerating} className="flex items-center gap-2">
            {isGenerating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Generate More'}
          </Button>
          <Button onClick={handleClearLayouts} disabled={generatedLayouts.length === 0} variant="destructive" className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <Button 
            onClick={() => {
              try {
                const testLayout = generateSingleLayout('test-1', 'Test Layout', generationConfig);
                if (testLayout) {
                  setGeneratedLayouts([testLayout]);
                  analyzeGeneratedLayouts([testLayout]);
                  alert('Test layout generated successfully!');
                }
              } catch (error) {
                alert('Error generating test layout: ' + error.message);
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
            title="Generate a single layout for quick testing."
          >
            <Puzzle className="w-4 h-4" />
            Test Single
          </Button>
          <Button onClick={exportLayouts} disabled={generatedLayouts.length === 0} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={exportPageFeedback} disabled={paginatedLayouts.length === 0} variant="secondary" className="flex items-center gap-2" title="Export feedback for layouts on this page">
            <Download className="w-4 h-4" />
            Export Page Feedback
          </Button>
        </div>
      </div>

      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Generating layouts...</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(generationProgress)}%
              </span>
            </div>
            <Progress value={generationProgress} className="w-full" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="layouts">Generated Layouts</TabsTrigger>
          <TabsTrigger value="preview">Layout Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Generation Type</label>
                  <select
                    value={generationConfig.generationType}
                    onChange={(e) => setGenerationConfig(prev => ({ ...prev, generationType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Types (Base + Variations + Random)</option>
                    <option value="base">Base Layouts Only</option>
                    <option value="variations">Variations (Not Implemented)</option>
                    <option value="random">Random Only</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the type of layouts you want to generate.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Path Pattern</label>
                  <select
                    value={generationConfig.pathPattern}
                    onChange={(e) => setGenerationConfig(prev => ({ ...prev, pathPattern: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="random">Random (Zig-Zag)</option>
                    <option value="vertical_lanes">Vertical Lanes</option>
                    <option value="s_curves">Mirrored S-Curves</option>
                    <option value="y_junction">Y-Junction</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a specific path shape or randomize.
                  </p>
                </div>

                {(generationConfig.generationType === 'all' || generationConfig.generationType === 'base') && (
                  <div>
                    <label className="text-sm font-medium">Iterations per Base Layout</label>
                    <input
                      type="number"
                      value={generationConfig.baseLayoutIterations}
                      onChange={(e) => setGenerationConfig(prev => ({ ...prev, baseLayoutIterations: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      min="1"
                      max="1000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How many times each of the 24 base layouts is generated.
                    </p>
                  </div>
                )}

                {(generationConfig.generationType === 'all' || generationConfig.generationType === 'variations') && (
                  <div>
                    <label className="text-sm font-medium">Variations per Base Layout (N/A)</label>
                    <input
                      type="number"
                      value={generationConfig.variationsPerLayout}
                      onChange={(e) => setGenerationConfig(prev => ({ ...prev, variationsPerLayout: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      min="1"
                      max="100"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Advanced variations are currently disabled.
                    </p>
                  </div>
                )}

                {(generationConfig.generationType === 'all' || generationConfig.generationType === 'random') && (
                  <div>
                    <label className="text-sm font-medium">Number of Random Layouts</label>
                    <input
                      type="number"
                      value={generationConfig.numRandomLayouts}
                      onChange={(e) => setGenerationConfig(prev => ({ ...prev, numRandomLayouts: parseInt(e.target.value) || 1 }))}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      min="1"
                      max="500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      How many unique layouts to generate from scratch.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Gameplay Modifiers
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Number of Milestones (1-3)</label>
                        <Slider
                            value={[generationConfig.milestoneCount]}
                            onValueChange={(value) => setGenerationConfig(prev => ({ ...prev, milestoneCount: value[0] }))}
                            min={1}
                            max={3}
                            step={1}
                            className="mt-2"
                        />
                         <p className="text-xs text-muted-foreground mt-1">
                            Rewards will be 25, 40, 55 respectively.
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Number of Paths (1-4)</label>
                        <Slider
                            value={[generationConfig.pathCount]}
                            onValueChange={(value) => setGenerationConfig(prev => ({ ...prev, pathCount: value[0] }))}
                            min={1}
                            max={4}
                            step={1}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            The number of distinct paths on the board.
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Additional Free Space</label>
                        <Slider
                            value={[generationConfig.freeTileCount]}
                            onValueChange={(value) => setGenerationConfig(prev => ({ ...prev, freeTileCount: value[0] }))}
                            min={5}
                            max={15}
                            step={1}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Total Free Tiles: 6 (start) + {generationConfig.freeTileCount} (extra) = {6 + generationConfig.freeTileCount}
                        </p>
                    </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Cost variance range</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={filters.minCostVariance}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        minCostVariance: parseInt(e.target.value) || 0
                      }))}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      value={filters.maxCostVariance}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        maxCostVariance: parseInt(e.target.value) || 1000
                      }))}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Path tiles range</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      value={filters.minPathTiles}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        minPathTiles: parseInt(e.target.value) || 0
                      }))}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      value={filters.maxPathTiles}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        maxPathTiles: parseInt(e.target.value) || 100
                      }))}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Connection type</label>
                  <select
                    value={filters.hasConnection}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      hasConnection: e.target.value
                    }))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="all">All</option>
                    <option value="connected">Connected paths</option>
                    <option value="independent">Independent paths</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Sort Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="cost_variance">Cost Variance</option>
                    <option value="balance_score">Balance Score</option>
                    <option value="complexity_score">Complexity Score</option>
                    <option value="strategic_variance">Strategic Variance</option>
                    <option value="total_path_tiles">Total Path Tiles</option>
                    <option value="average_path">Average Path Cost</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Sort order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {currentAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Total Layouts</p>
                      <p className="text-2xl font-bold">{currentAnalysis.total_layouts}</p>
                    </div>
                    <Grid3X3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Avg Balance Score</p>
                      <p className="text-2xl font-bold">{currentAnalysis.average_balance_score.toFixed(1)}</p>
                    </div>
                    <Target className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Avg Complexity</p>
                      <p className="text-2xl font-bold">{currentAnalysis.average_complexity_score.toFixed(1)}</p>
                    </div>
                    <Puzzle className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Connected Paths</p>
                      <p className="text-2xl font-bold">{currentAnalysis.connected_paths_percentage.toFixed(1)}%</p>
                    </div>
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* Top Layouts */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Top Balanced Layouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentAnalysis.top_balanced_layouts.slice(0, 5).map((layout) => (
                        <div key={layout.id} className="flex items-center justify-between">
                          <span className="text-sm">{layout.name}</span>
                          <Badge variant="secondary">{layout.analysis.balance_score.toFixed(1)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Puzzle className="w-4 h-4" />
                      Most Complex Layouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentAnalysis.top_complex_layouts.slice(0, 5).map((layout) => (
                        <div key={layout.id} className="flex items-center justify-between">
                          <span className="text-sm">{layout.name}</span>
                          <Badge variant="secondary">{layout.analysis.complexity_score.toFixed(1)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Most Strategic Layouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentAnalysis.top_strategic_layouts.slice(0, 5).map((layout) => (
                        <div key={layout.id} className="flex items-center justify-between">
                          <span className="text-sm">{layout.name}</span>
                          <Badge variant="secondary">{layout.analysis.strategic_variance.toFixed(1)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Generate layouts to see analysis results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {filteredLayouts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Layout Visualizations</h3>
                <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                        Page {previewPage + 1} of {totalPreviewPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                            disabled={previewPage === 0}
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <Button
                            onClick={() => setPreviewPage(p => Math.min(totalPreviewPages - 1, p + 1))}
                            disabled={previewPage >= totalPreviewPages - 1}
                            variant="outline"
                        >
                            Next
                        </Button>
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {paginatedLayouts.map((layout, index) => (
                  layout.analysis ? (
                  <LayoutPreview
                    key={`${layout.id}-${index}`}
                    layout={layout}
                    analysis={layout.analysis}
                    showDetails={true}
                  />
                  ) : (
                    <div key={`${layout.id}-${index}`} className="text-red-500 p-4 border rounded-md">
                      Error: Missing analysis for layout {layout.name || layout.id}
                    </div>
                  )
                ))}
              </div>
              
              {filteredLayouts.length > 10 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {paginatedLayouts.length} of {filteredLayouts.length} filtered layouts.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Generate layouts to see visual previews
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="layouts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredLayouts.length} of {generatedLayouts.length} layouts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLayouts.slice(0, 50).map((layout, index) => (
              <Card key={`${layout.id}-${index}`} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{layout.name}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">#{layout.id}</Badge>
                    {layout.analysis.path_info.has_connection && (
                      <Badge variant="secondary">Connected</Badge>
                    )}
                    <Badge variant="outline">{layout.analysis.total_path_tiles} tiles</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Balance:</span>
                      <div className="font-medium">{layout.analysis.balance_score.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Complexity:</span>
                      <div className="font-medium">{layout.analysis.complexity_score.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cost Variance:</span>
                      <div className="font-medium">{layout.analysis.cost_variance.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Strategic:</span>
                      <div className="font-medium">{layout.analysis.strategic_variance.toFixed(1)}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Path 1: {layout.analysis.path_info.path1_tiles} tiles</span>
                      <span>Path 2: {layout.analysis.path_info.path2_tiles} tiles</span>
                    </div>
                    {layout.analysis.path_info.bridge_tiles > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Bridge: {layout.analysis.path_info.bridge_tiles} tiles
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Generated: {new Date(layout.generated_at).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLayouts.length > 50 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Showing first 50 layouts. Use filters to narrow down results.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 