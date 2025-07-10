import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { X, Save, Bomb } from 'lucide-react';

const TILE_TYPES = ['free', 'rock', 'locked', 'semi_locked', 'key', 'chest', 'generator'];

export default function TileEditPanel({ tile, onUpdate, itemChains, onClose }) {
  const [editState, setEditState] = useState(null);

  useEffect(() => {
    if (tile) {
      setEditState({
        tile_type: tile.tile_type,
        required_item_name: tile.required_item_name || '',
        required_item_level: tile.required_item_level || 1,
      });
    } else {
      setEditState(null);
    }
  }, [tile]);

  const handleSave = () => {
    const requiredItemChain = itemChains.find(c => editState.required_item_name.startsWith(c.chain_name));
    
    const updateData = {
        ...editState,
        required_item_name: `${requiredItemChain?.chain_name || itemChains[0].chain_name} L${editState.required_item_level}`,
        required_item_chain_color: requiredItemChain?.color || itemChains[0].color,
        drops_bomb: editState.drops_bomb || false,
    };
    onUpdate(updateData);
    onClose();
  };

  if (!tile || !editState) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle>Edit Tile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Select a tile on the board to edit its properties.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedChainName = itemChains.find(c => editState.required_item_name.startsWith(c.chain_name))?.chain_name || '';
  const selectedChain = itemChains.find(c => c.chain_name === selectedChainName);
  const maxLevel = selectedChain ? selectedChain.levels : 8;

  return (
    <Card className="sticky top-24">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edit Tile ({tile.row}, {tile.col})</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="tile-type">Tile Type</Label>
          <Select
            value={editState.tile_type}
            onValueChange={(value) => {
              const newState = { ...editState, tile_type: value };
              if (value !== 'generator') {
                newState.item = null;
              }
              setEditState(newState);
            }}
          >
            <SelectTrigger id="tile-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TILE_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(editState.tile_type === 'semi_locked' || editState.tile_type === 'key' || editState.tile_type === 'locked') && (
          <>
            <div>
              <Label>Required Item Chain</Label>
              <Select
                value={selectedChainName}
                onValueChange={(chainName) => setEditState(p => ({ ...p, required_item_name: `${chainName} L${p.required_item_level}` }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item chain" />
                </SelectTrigger>
                <SelectContent>
                  {itemChains.map(chain => (
                    <SelectItem key={chain.chain_name} value={chain.chain_name}>{chain.chain_name} (L1-{chain.levels})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="req-level">Required Item Level (Max: {maxLevel})</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setEditState(p => ({ ...p, required_item_level: Math.max(1, p.required_item_level - 1) }))}
                >
                  -
                </Button>
                <Input
                  id="req-level"
                  type="number"
                  min="1"
                  max={maxLevel}
                  value={editState.required_item_level}
                  className="w-20 text-center"
                  onChange={(e) => setEditState(p => ({ ...p, required_item_level: Math.min(Math.max(1, parseInt(e.target.value) || 1), maxLevel) }))}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setEditState(p => ({ ...p, required_item_level: Math.min(maxLevel, p.required_item_level + 1) }))}
                >
                  +
                </Button>
              </div>
            </div>
          </>
        )}

        {(editState.tile_type === 'semi_locked' || editState.tile_type === 'locked') && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="drop-bomb"
              checked={editState.drops_bomb || false}
              onChange={(e)=>setEditState(p=>({...p,drops_bomb:e.target.checked}))}
            />
            <Label htmlFor="drop-bomb">Drops Bomb on Unlock</Label>
          </div>
        )}

        {editState.tile_type === 'generator' && (
          <div className="pt-2">
            <Label>Generator Chain</Label>
            <Select
              value={editState.item?.chains?.[0]?.color || ''}
              onValueChange={(color) => {
                const chain = itemChains.find(c => c.color === color);
                if (chain) {
                  setEditState(p => ({
                    ...p,
                    item: { id: `gen-${Date.now()}`, type: 'generator', chains: [chain] }
                  }));
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a chain..." />
              </SelectTrigger>
              <SelectContent>
                {itemChains.map(chain => (
                  <SelectItem key={chain.color} value={chain.color} disabled={chain.isCrystal}>
                    {chain.chain_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {tile.item?.type === 'bomb' ? (
            <Button variant="destructive" onClick={()=>{onUpdate({ item:null }); onClose();}}>Remove Bomb</Button>
        ) : (
            <Button variant="outline" onClick={()=>{onUpdate({ item:{ id:`bomb-${Date.now()}`, type:'bomb' } }); onClose();}}>Add Bomb</Button>
        )}
        <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}