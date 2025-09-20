import React, { useState, useEffect } from 'react';

const FooterClock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const timeString = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <div className="text-sm text-[#F87171] font-mono font-bold ml-auto">{timeString}</div>
  );
};

const Footer: React.FC = () => (
  <footer className="w-full flex items-center justify-center px-8 py-4 border-t border-[#F9C5D1] bg-[#FDF6F0] mt-auto z-10 relative">
    <div className="text-gray-400 text-sm text-center w-full">&copy; {new Date().getFullYear()} Ledger App. Inspired by Japanese design.</div>
    <div className="absolute right-8">
      <FooterClock />
    </div>
  </footer>
);

export default Footer;
