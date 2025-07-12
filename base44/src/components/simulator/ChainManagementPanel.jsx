import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export default function ChainManagementPanel({ chains, onRemoveChain, onAddPurpleChain }) {
  if (!chains || chains.length <= 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage Item Chains</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You must have at least one item chain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Item Chains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
            onClick={onAddPurpleChain} 
            disabled={chains.some(c => c.color === 'purple')}
            className="w-full mb-2"
        >
            Add Purple Chain
        </Button>
        {chains.map((chain) => (
          <div key={chain.color} className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full bg-${chain.color}-500`} />
              <span className="font-medium">{chain.chain_name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveChain(chain)}
              disabled={chains.length <= 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 