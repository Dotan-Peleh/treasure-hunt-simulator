import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const icons = {
  error: <AlertCircle className="w-6 h-6 text-red-500" />,
  success: <CheckCircle className="w-6 h-6 text-green-500" />,
  info: <Info className="w-6 h-6 text-blue-500" />,
};

const bgColors = {
  error: 'bg-red-100 border-red-400',
  success: 'bg-green-100 border-green-400',
  info: 'bg-blue-100 border-blue-400',
};

export default function NotificationPopup({ notification, onClose }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, notification.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-5 right-5 z-[1000]"
        >
          <div className={`flex items-center p-4 rounded-lg shadow-2xl border-l-4 ${bgColors[notification.type]}`} style={{ fontFamily: 'sans-serif' }}>
            <div className="mr-3">
              {icons[notification.type]}
            </div>
            <div className="text-gray-800 font-medium">
              {notification.message}
            </div>
            <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-black/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}