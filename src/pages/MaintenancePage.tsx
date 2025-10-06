import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const MaintenancePage: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Cherry blossom petals */}
        <div className="absolute top-10 left-10 w-4 h-4 bg-primary/20 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-3 h-3 bg-accent/30 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-20 left-32 w-5 h-5 bg-primary/15 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-40 right-10 w-2 h-2 bg-accent/25 rounded-full animate-pulse delay-1000"></div>
        
        {/* Traditional Japanese wave pattern */}
        <svg className="absolute bottom-0 left-0 w-full h-32 opacity-10" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 C300,120 600,0 900,60 C1050,90 1150,30 1200,60 L1200,120 L0,120 Z" fill="hsl(var(--primary))" />
        </svg>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto text-center relative z-10"
      >
        {/* Traditional Japanese seal/logo area */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-8 border-4 border-primary rounded-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10"
        >
          <div className="w-16 h-16 border-2 border-primary rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-primary rounded-full"></div>
          </div>
        </motion.div>

        {/* Main title with Japanese styling */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-wide"
          style={{ fontFamily: 'Blackflag, serif' }}
        >
          メンテナンス中
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-xl md:text-2xl text-muted-foreground mb-8 font-light"
        >
          Under Maintenance
        </motion.p>

        {/* Description */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-8 mb-8 shadow-lg"
        >
          <p className="text-lg text-foreground mb-4 leading-relaxed">
            申し訳ございませんが、現在システムのメンテナンスを行っております。
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            We apologize for the inconvenience. Our system is currently undergoing maintenance to improve your experience.
          </p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex items-center justify-center space-x-2 mb-8"
        >
          <div className="flex space-x-1">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              className="w-3 h-3 bg-primary rounded-full"
            ></motion.div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              className="w-3 h-3 bg-primary rounded-full"
            ></motion.div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              className="w-3 h-3 bg-primary rounded-full"
            ></motion.div>
          </div>
          <span className="text-muted-foreground ml-4">
            Please wait{dots}
          </span>
        </motion.div>

        {/* Estimated time */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="bg-accent/20 border border-accent/30 rounded-lg p-4 mb-8"
        >
          <p className="text-sm text-foreground font-medium">
            予想復旧時間 / Estimated Recovery Time
          </p>
          <p className="text-lg text-foreground font-bold">
            30分以内 / Within 30 minutes
          </p>
        </motion.div>

        {/* Contact information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-sm text-muted-foreground"
        >
          <p className="mb-2">
            緊急の場合は、お問い合わせください。
          </p>
          <p>
            For urgent matters, please contact us at{' '}
            <a href="mailto:support@ledger-app.com" className="text-primary hover:underline">
              support@ledger-app.com
            </a>
          </p>
        </motion.div>

        {/* Traditional Japanese border decoration */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.7, duration: 1 }}
          className="mt-12 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
        ></motion.div>
      </motion.div>

      {/* Floating particles animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 10,
              opacity: 0
            }}
            animate={{ 
              y: -10,
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MaintenancePage;
