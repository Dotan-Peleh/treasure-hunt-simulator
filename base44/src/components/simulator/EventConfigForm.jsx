import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Trash2, PlusCircle } from 'lucide-react';
import { boardLayouts } from './layout-definitions';
import { generateBoardLayout } from './BoardGenerator';
import LayoutPreview from './LayoutPreview';
import LayoutAnalysis from './LayoutAnalysis';

const initialChain = {
  chain_name: "New Chain",
  color: "green",
  levels: 5,
};

const EventConfigForm = ({ onConfigCreate, isSimulating, showFullAnalysis = false }) => {
  const [config, setConfig] = useState({
    event_name: 'Default Event',
    duration_hours: 72,
    layout_id: 1,
    item_chains: [
      { chain_name: 'Orange', color: 'orange', levels: 12, crossChainMergeLevel: 4 },
      { chain_name: 'Blue', color: 'blue', levels: 8, isBlueGeneratorSource: true, blueGeneratorUses: 5 },
      { chain_name: 'Green', color: 'green', levels: 10 },
      { 
        chain_name: 'Purple', 
        color: 'purple', 
        levels: 8, 
        isCrystal: true,
        crossChainMergeLevel: 1,
        crystalGeneratorUses: 5,
        crystalMergePair: ['orange','green'],
      },
    ],
    milestoneCount: 3,
    crossChainMergeLevel: 4,
    crystalGeneratorUses: 5,
  });
  const [filteredLayouts, setFilteredLayouts] = useState(boardLayouts);
  const [currentLayout, setCurrentLayout] = useState(boardLayouts[0]);
  const [previewLayout, setPreviewLayout] = useState(null);

  useEffect(() => {
    // This effect can be computationally expensive, consider debouncing or moving to a worker thread if performance is an issue.
    const balancedLayouts = boardLayouts.filter(layout => {
        try {
            const tempConfig = { ...config, layout_id: layout.id, item_chains: config.item_chains };
            const { analysis } = generateBoardLayout(tempConfig);
            // A layout is "balanced" if the difference in path costs is within a reasonable threshold.
            const pathVariance = Math.abs(analysis.path1_cost - analysis.path2_cost);
            return pathVariance <= 500; // Increased threshold for more variety
        } catch (error) {
            // If a layout fails to generate, it's not balanced.
            console.error(`Failed to analyze layout ${layout.id} for balancing:`, error);
            return false;
        }
    });

    const finalLayouts = balancedLayouts.length > 0 ? balancedLayouts : boardLayouts;
    setFilteredLayouts(finalLayouts);
    
    // Ensure the currently selected layout is valid and exists in the new filtered list.
    const currentSelectionStillValid = finalLayouts.some(l => l.id === config.layout_id);
    
    if (currentSelectionStillValid) {
        // If the selection is still good, just update the layout object itself.
        setCurrentLayout(finalLayouts.find(l => l.id === config.layout_id));
    } else {
        // If not, default to the first layout in the new filtered list.
        const newLayout = finalLayouts[0];
        setConfig(prev => ({...prev, layout_id: newLayout.id}));
        setCurrentLayout(newLayout);
    }
    // Reduced dependencies to prevent excessive re-runs. Only re-filter when core cost factors change.
  }, [config.item_chains, config.layout_id]);

  useEffect(() => {
    if (currentLayout) {
        const { tiles } = generateBoardLayout({ ...config, layout_id: currentLayout.id });
        setPreviewLayout({ ...currentLayout, tiles });
    }
  }, [currentLayout, config.item_chains]);

  const handleMilestoneRewardChange = (index, value) => {
    const newMilestones = [...config.milestones];
    // Ensure value is a number and not negative
    const rewardValue = Math.max(0, parseInt(value, 10) || 0);
    newMilestones[index] = { ...newMilestones[index], reward: rewardValue };
    setConfig(prev => ({ ...prev, milestones: newMilestones }));
  };

  const generateAndSetConfig = () => {
      if (!onConfigCreate) return;
      // The old logic for dynamic milestones is removed.
      // We now pass the config directly as it comes from the state.
      onConfigCreate(config);
  };

  const handleInputChange = (e) => setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSelectChange = (value) => setConfig(prev => ({ ...prev, layout_id: parseInt(value, 10) }));
  
  const addItemChain = () => setConfig(prev => ({ ...prev, item_chains: [...prev.item_chains, { ...initialChain, chain_name: `New Chain ${prev.item_chains.length + 1}` }] }));
  const removeItemChain = (index) => setConfig(prev => ({ ...prev, item_chains: prev.item_chains.filter((_, i) => i !== index) }));
  const handleItemChainChange = (index, field, value) => {
    const newChains = [...config.item_chains];
    const chainToUpdate = { ...newChains[index] };
    chainToUpdate[field] = value;
    newChains[index] = chainToUpdate;
    setConfig(prev => ({ ...prev, item_chains: newChains }));
  };

  return (
    <Card className="w-full lg:w-3/4 mx-auto">
      <CardHeader><CardTitle>Event Configuration</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
                <Label htmlFor="event_name">Event Name</Label>
            <Input id="event_name" name="event_name" value={config.event_name} onChange={handleInputChange} />
          </div>
          <Accordion type="single" collapsible defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>Board Layout</AccordionTrigger>
              <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                    <Label>Select Layout</Label>
                    <Select onValueChange={handleSelectChange} value={config.layout_id.toString()}>
                      <SelectTrigger><SelectValue placeholder="Select a layout..." /></SelectTrigger>
                        <SelectContent>
                            {filteredLayouts.map(layout => (
                          <SelectItem key={layout.id} value={layout.id.toString()}>{layout.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <Label className="mb-2 text-sm font-medium">Layout Preview</Label>
                    {previewLayout ? (
                        <LayoutPreview layout={previewLayout} showDetails={false} compact={true} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg p-4">
                            <p>Loading Preview...</p>
                        </div>
                    )}
                </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>Milestone Rewards</AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 mt-2 p-2">
                        <p className="text-sm text-slate-500">Set the Energy reward for crossing each milestone line.</p>
                        {(config.milestones || []).map((milestone, index) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                                <Label htmlFor={`milestone-reward-${index}`}>Milestone {index + 1} (Row {milestone.row})</Label>
                                <Input 
                                    id={`milestone-reward-${index}`}
                                    type="number"
                                    value={milestone.reward}
                                    onChange={(e) => handleMilestoneRewardChange(index, e.target.value)}
                                    className="w-28"
                                    min="0"
                                />
                            </div>
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
                <AccordionTrigger>Item Chains</AccordionTrigger>
                <AccordionContent>
                    <Button onClick={addItemChain} variant="outline" size="sm"><PlusCircle className="w-4 h-4 mr-2" />Add Chain</Button>
                    <div className="space-y-4 mt-2">
                  {config.item_chains.map((chain, index) => (
                            <div key={index} className="p-4 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <Input value={chain.chain_name} onChange={(e) => handleItemChainChange(index, 'chain_name', e.target.value)} placeholder="Chain Name" disabled={chain.isCrystal} />
                                    <Button onClick={() => removeItemChain(index)} variant="ghost" size="icon" disabled={chain.isCrystal || config.item_chains.length <= 1}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input type="number" value={chain.levels} onChange={(e) => handleItemChainChange(index, 'levels', parseInt(e.target.value, 10))} placeholder="Levels" />
                                    <Select onValueChange={(v) => handleItemChainChange(index, 'color', v)} value={chain.color} disabled={chain.isCrystal}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="orange">Orange</SelectItem>
                                            <SelectItem value="blue">Blue</SelectItem>
                                            <SelectItem value="green">Green</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {chain.isCrystal && (
                                    <div className="pt-4 mt-4 border-t space-y-4">
                                        <div>
                                            <Label>Required Merge Level: {chain.crossChainMergeLevel}</Label>
                                            <Slider value={[chain.crossChainMergeLevel]} onValueChange={(val) => handleItemChainChange(index, 'crossChainMergeLevel', val[0])} min={1} max={8} step={1} />
                                        </div>
                                        <div>
                                            <Label>Generator Charges: {chain.crystalGeneratorUses}</Label>
                                            <Slider value={[chain.crystalGeneratorUses]} onValueChange={(val) => handleItemChainChange(index, 'crystalGeneratorUses', val[0])} min={1} max={10} step={1} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label>Merge Chain A</Label>
                                                <Select
                                                    value={chain.crystalMergePair?.[0]}
                                                    onValueChange={(color) => {
                                                        const newPair = [color, chain.crystalMergePair?.[1]];
                                                        handleItemChainChange(index, 'crystalMergePair', newPair);
                                                    }}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {config.item_chains.filter(c => !c.isCrystal).map(c => (
                                                            <SelectItem key={c.color} value={c.color}>{c.chain_name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Merge Chain B</Label>
                                                <Select
                                                    value={chain.crystalMergePair?.[1]}
                                                    onValueChange={(color) => {
                                                        const newPair = [chain.crystalMergePair?.[0], color];
                                                        handleItemChainChange(index, 'crystalMergePair', newPair);
                                                    }}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {config.item_chains.filter(c => !c.isCrystal).map(c => (
                                                            <SelectItem key={c.color} value={c.color}>{c.chain_name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {chain.color === 'orange' && (
                                    <div className="pt-4 mt-4 border-t">
                                        <Label>Required Merge Level: {chain.crossChainMergeLevel}</Label>
                                        <Slider value={[chain.crossChainMergeLevel]} onValueChange={(val) => handleItemChainChange(index, 'crossChainMergeLevel', val[0])} min={1} max={8} step={1} />
                                    </div>
                                )}
                                {chain.color === 'blue' && (
                                    <div className="pt-4 mt-4 border-t">
                                        <Label>Generator Charges: {chain.blueGeneratorUses}</Label>
                                        <Slider value={[chain.blueGeneratorUses]} onValueChange={(val) => handleItemChainChange(index, 'blueGeneratorUses', val[0])} min={1} max={10} step={1} />
                                    </div>
                                )}
                            </div>
                  ))}
              </div>
                </AccordionContent>
            </AccordionItem>
            {showFullAnalysis && (
            <AccordionItem value="item-4">
                <AccordionTrigger>Full Analysis</AccordionTrigger>
                <AccordionContent>
                    <LayoutAnalysis config={config} onLayoutSelect={(id) => handleSelectChange(id.toString())} />
                </AccordionContent>
            </AccordionItem>) }
          </Accordion>
          <Button onClick={generateAndSetConfig} disabled={isSimulating} className="w-full">
            {isSimulating ? "Creating..." : "Create Simulation"}
          </Button>
        </div>
        </CardContent>
      </Card>
  );
}

EventConfigForm.propTypes = {
    onConfigCreate: PropTypes.func.isRequired,
    isSimulating: PropTypes.bool.isRequired,
    showFullAnalysis: PropTypes.bool,
};

export default EventConfigForm;
