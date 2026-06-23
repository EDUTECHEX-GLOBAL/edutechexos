'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const onOffline = () => { setOffline(true); setJustReconnected(false); };
    const onOnline = () => {
      setOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    if (!navigator.onLine) setOffline(true);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(offline || justReconnected) && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 360 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-2 px-4 text-xs font-bold gap-2"
          style={{
            background: offline ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {offline ? (
            <><WifiOff size={13} /> No internet connection — messages may not send</>
          ) : (
            <><Wifi size={13} /> Back online</>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
