import React from 'react';


interface FooterProps {
  hideTimeAndControl?: boolean;
}

const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="w-full flex items-center justify-end px-4 h-20 md:h-16 bg-palette-light-cream mt-auto z-10 relative overflow-hidden">
      <div className="text-palette-dark-teal text-sm text-right">&copy; {new Date().getFullYear()} Ledger App. Inspired by Japanese design.</div>
    </footer>
  );
};

export default Footer;
