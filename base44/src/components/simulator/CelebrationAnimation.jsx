
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, Trophy } from 'lucide-react';

export default function CelebrationAnimation({ type, amount, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 1500); // Changed duration from 3000 to 1500

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getCelebrationConfig = () => {
    switch (type) {
      case 'milestone1':
        return {
          icon: <Star className="w-8 h-8 text-yellow-500" />,
          title: "Milestone Reached!",
          color: "from-yellow-400 to-orange-500",
          particles: 8
        };
      case 'milestone2':
        return {
          icon: <Star className="w-10 h-10 text-purple-500" />,
          title: "Major Milestone!",
          color: "from-purple-400 to-pink-500",
          particles: 12
        };
      case 'chest':
        return {
          icon: <Trophy className="w-12 h-12 text-gold-500" />,
          title: "Victory!",
          color: "from-yellow-500 to-yellow-300",
          particles: 16
        };
      default:
        return {
          icon: <Zap className="w-6 h-6 text-blue-500" />,
          title: "Reward!",
          color: "from-blue-400 to-cyan-500",
          particles: 6
        };
    }
  };

  const config = getCelebrationConfig();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        >
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          />

          {/* Main celebration */}
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`relative bg-gradient-to-r ${config.color} text-white p-8 rounded-2xl shadow-2xl text-center`}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              {config.icon}
            </motion.div>
            <h2 className="text-2xl font-bold mt-4">{config.title}</h2>
            <p className="text-lg mt-2">+{amount} Energy!</p>
          </motion.div>

          {/* Flying particles */}
          {Array.from({ length: config.particles }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1
              }}
              animate={{
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 600,
                opacity: 0,
                scale: 0
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                ease: "easeOut"
              }}
              className="absolute"
            >
              <Zap className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ))}

          {/* Credit animation */}
          <motion.div
            initial={{ x: 0, y: 0, scale: 1 }}
            animate={{ x: window.innerWidth * 0.1, y: -window.innerHeight * 0.4, scale: 0.5 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="absolute text-2xl font-bold text-green-500"
          >
            +{amount}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
