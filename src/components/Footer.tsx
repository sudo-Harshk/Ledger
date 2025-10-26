import React from 'react';

interface FooterProps {
  hideTimeAndControl?: boolean;
}

const Footer: React.FC<FooterProps> = () => {

  return (
    <footer className="w-full bg-gradient-to-r from-palette-light-cream via-palette-golden/5 to-palette-light-cream border-t border-palette-golden/30 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand Section */}
          <div className="flex items-center gap-6">
            <div className="font-bold text-2xl tracking-widest text-palette-dark-red" style={{ fontFamily: "'Blackflag', sans-serif" }}>
              Ledger
            </div>
            <div className="hidden md:block w-px h-8 bg-palette-golden/40"></div>
            <div className="text-palette-dark-teal text-sm">
              Built with ❤️ for educators
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/sudo-Harshk/Ledger"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-white hover:bg-palette-golden/10 text-palette-dark-teal hover:text-palette-deep-red font-semibold px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-palette-golden focus:ring-offset-2 active:scale-95 border border-palette-golden/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Source Code
              </span>
            </a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-palette-golden/20 mt-6 pt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-palette-dark-teal text-sm">
              &copy; {new Date().getFullYear()} Ledger App. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-xs text-palette-dark-teal">
              <span>Japanese-inspired design</span>
              <div className="w-1 h-1 bg-palette-golden rounded-full"></div>
              <span>Modern attendance management</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
