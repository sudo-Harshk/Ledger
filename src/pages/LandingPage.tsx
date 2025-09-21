import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import Footer from '../components/Footer';

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0} 
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded bg-[#222] text-white text-xs shadow-lg z-50 whitespace-nowrap pointer-events-none"
            style={{ bottom: 'auto' }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

const navLinks = [
  { label: 'Home', value: 'home' },
  { label: 'Team', value: 'team' },
];

// 3D Rotating Card Component
const Rotating3DCard: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ className = '', style = {}, children }) => {
  const [isHovering, setIsHovering] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(x, { stiffness: 200, damping: 20 });
  const transform = useMotionTemplate`rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const cardWidth = rect.width;
    const cardHeight = rect.height;
    const centerX = rect.left + cardWidth / 2;
    const centerY = rect.top + cardHeight / 2;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const rotateYVal = ((mouseX - centerX) / (cardWidth / 2)) * 12;
    const rotateXVal = -((mouseY - centerY) / (cardHeight / 2)) * 12;
    x.set(rotateYVal);
    y.set(rotateXVal);
    setIsHovering(true);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setIsHovering(false);
  }

  return (
    <div style={{ perspective: 1000, ...style }}>
      <motion.div
        className={className}
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: isHovering ? '0 8px 32px 0 rgba(248,113,113,0.15)' : undefined,
          willChange: 'transform',
          transition: 'box-shadow 0.2s',
          transform,
        }}
        animate={{
          scale: isHovering ? 1.03 : 1,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </motion.div>
    </div>
  );
};

// WorldClock now accepts a timezone prop
const WorldClock: React.FC<{ timezone: string }> = ({ timezone }) => {
  const [now, setNow] = useState(new Date());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const dateString = now.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone
  });
  const timeString = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone });
  return (
    <div className="flex flex-row items-center justify-center mt-16 mb-2 gap-8">
      <div className="text-xl font-mono text-gray-700">{dateString}</div>
      <div className="text-4xl font-bold text-[#F87171] tracking-widest font-mono">{timeString}</div>
    </div>
  );
};

// LiveQuote component for a quote with live date and time
const LiveQuote: React.FC = () => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center mt-20 mb-8"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: 'spring', stiffness: 60 }}
    >
      <span className="flex flex-row items-center gap-4 text-center">
        <span className="text-4xl md:text-6xl text-[#F87171] select-none" aria-label="quote">“</span>
        <span className="italic text-gray-800 text-2xl md:text-4xl font-semibold leading-snug relative">
          The present moment is all you ever have.
          <span className="block w-2/3 mx-auto mt-2 h-1 rounded-full bg-[#F87171]/20" />
        </span>
      </span>
    </motion.div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState('home');
  // Timezone state for world clock
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex flex-col relative overflow-x-hidden" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      {/* Navigation */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-[#F9C5D1] z-10 bg-[#FDF6F0]">
        <div className="flex items-center gap-2">
          <div className="border-2 border-[#F87171] rounded-md px-2 py-1 text-[#F87171] font-bold text-lg tracking-widest">LEDGER</div>
        </div>
        <nav className="flex gap-8 text-gray-700 font-medium text-lg">
          {navLinks.map(link => (
            <button
              key={link.value}
              onClick={() => setCurrentSection(link.value)}
              className={`bg-transparent border-none outline-none cursor-pointer hover:text-[#F87171] transition-colors border-b-2 pb-1 ${currentSection === link.value ? 'text-[#F87171] border-[#F87171]' : 'border-transparent'}`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </header>
      {/* Main Content */}
      {/* SakuraBg removed */}
      <AnimatePresence mode="wait">
        {currentSection === 'home' && (
          <motion.main
            key="home"
            className="flex-1 flex flex-col md:flex-row items-center justify-center px-4 max-w-5xl mx-auto w-full py-12 md:py-20 relative z-10"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 60, damping: 18 }}
          >
            {/* Left Side: Headline and sub-headline */}
            <section className="flex-1 flex flex-col justify-center items-start gap-4 md:gap-6 w-full md:w-1/2 max-w-xl md:pr-8">
              <Tooltip text="Attendance Management">
                <motion.div
                  className="text-3xl text-[#F87171] font-bold mb-2 cursor-help"
                  style={{fontFamily: 'Noto Sans JP, sans-serif'}}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05, duration: 0.3, type: 'spring', stiffness: 60 }}
                >
                  出席管理
                </motion.div>
              </Tooltip>
              <motion.h1
                className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-2"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35, type: 'spring', stiffness: 60 }}
              >
                Roll Call, <span className="text-[#F87171]">Reimagined.</span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-700 mb-4"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35, type: 'spring', stiffness: 60 }}
              >
                Ledger App transforms attendance into a smooth, satisfying experience—no more admin headaches, just classroom harmony.
              </motion.p>
              <motion.button
                className="bg-[#F87171] hover:bg-[#ef4444] text-white font-semibold py-3 px-8 rounded shadow transition-all text-lg mb-2"
                onClick={() => navigate('/login')}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3, type: 'spring', stiffness: 100 }}
                whileHover={{ scale: 1.07, boxShadow: '0 8px 32px 0 rgba(248,113,113,0.15)' }}
              >
                Get Started
              </motion.button>
            </section>
            {/* Right Side: What is Ledger, highlights, testimonial */}
            <section className="flex-1 flex flex-col items-center md:items-start gap-4 md:gap-6 w-full md:w-1/2 max-w-xl md:pl-8 mt-8 md:mt-0">
              {/* What is Ledger? */}
              <motion.div
                className="bg-white/80 rounded-xl shadow p-4 md:p-6 max-w-2xl text-center md:text-left border-2 border-[#F9C5D1]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3, type: 'spring', stiffness: 60 }}
              >
                <span className="font-bold text-[#F87171]">What is Ledger?</span> <br />
                <span className="text-gray-700">Ledger is a modern, Japanese-inspired web app for teachers and students to track attendance, approvals, and progress—beautifully and effortlessly.</span>
              </motion.div>
              {/* Testimonial/Quote */}
              <motion.div
                className="flex items-center w-full justify-center md:justify-start mt-2 mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.3, type: 'spring', stiffness: 60 }}
              >
                <Tooltip text="A teacher plants the seeds of knowledge with a caring heart.">
                  <span className="italic text-gray-500 text-center md:text-left max-w-xl mx-auto md:mx-0 cursor-help">
                    “先生は心で知識の種をまく。”
                  </span>
                </Tooltip>
                <span className="not-italic text-gray-400 text-xs ml-4 md:ml-8 whitespace-nowrap self-end">— A happy teacher</span>
              </motion.div>
            </section>
          </motion.main>
        )}
        {currentSection === 'team' && (
          <motion.section
            key="team"
            className="flex-1 w-full max-w-5xl mx-auto py-12 px-4 flex flex-col items-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 60, damping: 18 }}
          >
            <motion.h2
              className="text-2xl md:text-3xl font-bold text-[#F87171] mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.3, type: 'spring', stiffness: 60 }}
            >
              About the Developers
            </motion.h2>
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-stretch">
              {/* Developer 1 - prominent card with 3D rotation */}
              <Rotating3DCard
                className="flex flex-col md:flex-row bg-white/90 rounded-2xl shadow-xl border-2 border-[#F9C5D1] flex-1 min-h-[320px] md:w-[480px] w-full overflow-hidden"
                style={{ maxWidth: '100%' }}
              >
                <div className="md:w-1/2 w-full h-56 md:h-auto flex-shrink-0">
                  <img
                    src="https://res.cloudinary.com/dzjfiqicm/image/upload/v1758480335/Developer1_rbppcq.webp"
                    alt="Harshk portrait"
                    className="w-full h-full object-cover object-center bg-white"
                    style={{ minHeight: '100%', minWidth: '100%' }}
                  />
                </div>
                <div className="flex flex-col justify-center items-start p-8 md:w-1/2 w-full">
                  <div className="font-bold text-2xl text-gray-800 mb-2">Harshk</div>
                  <div className="text-[#F87171] font-medium text-lg mb-2">Architect & Developer</div>
                  {/* Optional: Add a short description or quote here */}
                </div>
              </Rotating3DCard>
              {/* Developer 2 - prominent card with 3D rotation, same size as Harshk */}
              <Rotating3DCard
                className="flex flex-col md:flex-row bg-white/90 rounded-2xl shadow-xl border-2 border-[#A7F3D0] flex-1 min-h-[320px] md:w-[480px] w-full overflow-hidden"
                style={{ maxWidth: '100%' }}
              >
                <div className="md:w-1/2 w-full h-56 md:h-auto flex-shrink-0 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&w=512&h=512&facepad=2&q=80"
                    alt="Sahasara placeholder"
                    className="w-full h-full object-cover object-center bg-white"
                    style={{ minHeight: '100%', minWidth: '100%' }}
                  />
                </div>
                <div className="flex flex-col justify-center items-start p-8 md:w-1/2 w-full">
                  <div className="font-bold text-2xl text-gray-800 mb-2">Sahasara</div>
                  <div className="text-[#8B5CF6] font-medium text-lg mb-2">UI/UX Designer</div>
                </div>
              </Rotating3DCard>
            </div>
            {/* Live Quote below the developer cards */}
            <LiveQuote />
            {/* World Clock below the quote, using selected timezone */}
            <WorldClock timezone={timezone} />
          </motion.section>
        )}
      </AnimatePresence>
      {/* Footer */}
      <Footer timezone={timezone} setTimezone={setTimezone} showClock={false} />
    </div>
  );
};

export default LandingPage;
