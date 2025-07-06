import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Gem, Circle, Square, Triangle, Shield, Star, Hexagon, Crown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const getLevelIcon = (level) => {
  const iconMap = {
    1: <Circle className="w-6 h-6 text-white" />,
    2: <Square className="w-6 h-6 text-white" />,
    3: <Triangle className="w-6 h-6 text-white" />,
    4: <Shield className="w-6 h-6 text-white" />,
    5: <Star className="w-6 h-6 text-white" />,
    6: <Hexagon className="w-6 h-6 text-white" />,
    7: <Gem className="w-6 h-6 text-white" />,
    8: <Crown className="w-6 h-6 text-white" />,
  };
  return iconMap[level] || <Gem className="w-6 h-6 text-white" />;
};

const itemBgColors = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
};

export default function SelectedItemPanel({ board, selectedIndex, onDeleteItem }) {
  const selectedTile = selectedIndex !== null ? board[selectedIndex] : null;
  const selectedItem = selectedTile?.item;

  return (
    <AnimatePresence>
      {selectedItem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="sticky top-52">
            <CardHeader>
              <CardTitle className="text-lg">Selected Item</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16 rounded-full shadow-lg">
                <div className={`w-full h-full rounded-full flex items-center justify-center ${itemBgColors[selectedItem.chain_color]}`}>
                  {getLevelIcon(selectedItem.level)}
                </div>
              </div>
              
              <div>
                <p className="font-semibold">{selectedItem.name}</p>
                <Badge variant="secondary">
                  Level {selectedItem.level}
                </Badge>
              </div>

              <Button onClick={() => onDeleteItem(selectedIndex)} variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Item
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}