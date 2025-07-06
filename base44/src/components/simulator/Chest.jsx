import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Key, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Chest({ onClick, selectedItem }) {
  const hasKey = selectedItem && selectedItem.name && selectedItem.name.includes("Key");

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Event Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4 p-6">
        <motion.div
            animate={{ scale: hasKey ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: hasKey ? Infinity : 0 }}
            className={`
            relative w-24 h-24 flex items-center justify-center rounded-full cursor-pointer
            ${hasKey ? 'bg-green-100' : 'bg-slate-100'}
            `}
            onClick={onClick}
        >
           <Trophy className={`w-12 h-12 ${hasKey ? 'text-green-500' : 'text-slate-400'}`}/>
           {!hasKey && (
             <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-slate-400" />
             </div>
           )}
        </motion.div>

        {hasKey ? (
          <div className="space-y-3 w-full">
            <p className="font-semibold text-green-600">You have the Key!</p>
            <Button onClick={onClick} className="w-full shadow-md font-bold bg-green-500 hover:bg-green-600">
              <Zap className="w-5 h-5 mr-2" />
              Open the Chest!
            </Button>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            <p className="font-semibold text-slate-600">Chest is Locked</p>
            <p className="text-sm text-slate-500">Find the Key Item on the board to unlock the final reward.</p>
          </div>
        )}
        
        <div className="pt-4 border-t w-full">
            <p className="text-sm font-semibold text-slate-700">Reward: <span className="font-bold text-blue-600">5,000 Energy</span></p>
        </div>
      </CardContent>
    </Card>
  );
}