import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded bg-[#222] text-white text-xs shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {text}
        </div>
      )}
    </span>
  );
};


// 3D Rotating Card Component with smooth cursor tilting effect
const Rotating3DCard: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ className = '', style = {}, children }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);

  // Use requestAnimationFrame for smoother animations
  React.useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      setRotateX(prev => {
        const diff = rotateX - prev;
        return prev + diff * 0.15; // Smooth interpolation factor
      });
      setRotateY(prev => {
        const diff = rotateY - prev;
        return prev + diff * 0.15;
      });
      setScale(prev => {
        const target = isHovering ? 1.03 : 1;
        const diff = target - prev;
        return prev + diff * 0.2;
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [rotateX, rotateY, isHovering]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate rotation with smoother curve
    const rotateYValue = (mouseX / (rect.width / 2)) * 8; // Reduced from 12 to 8 for smoother feel
    const rotateXValue = -(mouseY / (rect.height / 2)) * 8;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovering(false);
  };

  return (
    <div 
      className={className}
      style={{
        ...style,
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
        transformStyle: 'preserve-3d',
        boxShadow: isHovering 
          ? '0 8px 32px 0 rgba(158,42,43,0.2)' 
          : '0 4px 16px 0 rgba(158,42,43,0.1)',
        willChange: 'transform',
        transition: 'box-shadow 0.3s ease-out',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};


// LiveQuote component
const LiveQuote: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center mt-20 mb-8">
      <span className="flex flex-row items-center gap-4 text-center">
        <span className="text-4xl md:text-6xl text-palette-deep-red select-none" aria-label="quote">"</span>
        <span className="italic text-palette-dark-red text-2xl md:text-4xl font-semibold leading-snug relative">
          The present moment is all you ever have.
          <span className="block w-2/3 mx-auto mt-2 h-1 rounded-full bg-palette-golden/30" />
        </span>
      </span>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll behavior for navbar visibility
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide navbar when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsNavbarVisible(false);
      } else {
        setIsNavbarVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle section highlighting with intersection observer
  React.useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px', // Trigger when section is 50% visible
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-palette-light-cream" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      {/* Navigation */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-palette-light-cream/95 shadow-sm backdrop-blur-md transition-transform duration-300 ${
          isNavbarVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="font-bold text-2xl tracking-widest" style={{ fontFamily: "'Blackflag', sans-serif", color: "#540b0e" }}>Ledger</div>
        </div>
        <nav className="flex gap-8 text-palette-dark-red font-medium text-lg">
          <a 
            href="#home" 
            className={`transition-all duration-300 pb-1 relative ${
              activeSection === 'home' 
                ? 'text-palette-golden' 
                : 'hover:text-palette-golden'
            }`}
          >
            Home
            {activeSection === 'home' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-palette-golden rounded-full"></span>
            )}
          </a>
          <a 
            href="#team" 
            className={`transition-all duration-300 pb-1 relative ${
              activeSection === 'team' 
                ? 'text-palette-golden' 
                : 'hover:text-palette-golden'
            }`}
          >
            Team
            {activeSection === 'team' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-palette-golden rounded-full"></span>
            )}
          </a>
        </nav>
      </header>
      {/* Main Content Container */}
      <main className="relative">
        {/* Background gradient */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="w-full h-full bg-gradient-to-br from-palette-golden/10 via-palette-deep-red/5 to-palette-light-cream/0"></div>
        </div>

        {/* Home Section */}
        <section id="home" className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20 pt-32">
          <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            {/* Left Side: Headline and sub-headline */}
            <div className="flex-1 flex flex-col justify-center items-start gap-4 md:gap-6 w-full md:w-1/2 max-w-xl md:pr-8">
              <Tooltip text="Attendance Management">
                <div className="text-3xl text-palette-deep-red font-bold mb-2 cursor-help" style={{fontFamily: 'Noto Sans JP, sans-serif'}}>
                  出席管理
                </div>
              </Tooltip>
              <h1 className="text-4xl md:text-5xl font-extrabold text-palette-dark-red leading-tight mb-2">
                Roll Call, <span className="text-palette-golden">Reimagined.</span>
              </h1>
              <p className="text-lg text-palette-dark-teal mb-4">
                Ledger App transforms attendance into a smooth, satisfying experience—no more admin headaches, just classroom harmony.
              </p>
              {/* Info Banner */}
              <div className="w-full">
                <div className="max-w-xl">
                  <div className="rounded-xl border border-palette-golden bg-card-base text-palette-deep-red flex items-center gap-3 px-5 py-4 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-palette-deep-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                    <div className="flex flex-col">
                      <span className="font-semibold text-base">In-house Platform</span>
                      <span className="text-sm mt-0.5 text-palette-dark-red">Only users created by teachers can access Ledger. New users cannot self-register.</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                className="bg-palette-deep-red hover:bg-palette-dark-red text-white font-semibold py-3 px-8 rounded shadow-lg transition-all text-lg mb-2 hover:scale-105"
                onClick={() => navigate('/login')}
              >
                Get Started
              </button>
            </div>
            
            {/* Right Side: What is Ledger, highlights, testimonial */}
            <div className="flex-1 flex flex-col items-center md:items-start gap-4 md:gap-6 w-full md:w-1/2 max-w-xl md:pl-8 mt-8 md:mt-0">
              {/* What is Ledger? */}
              <div className="bg-card-elevated rounded-xl shadow-xl p-4 md:p-6 max-w-2xl text-center md:text-left border border-palette-golden/50">
                <span className="font-bold text-palette-deep-red">What is Ledger?</span> <br />
                <span className="text-palette-dark-teal">Ledger is a modern, Japanese-inspired web app for teachers and students to track attendance, approvals, and progress—beautifully and effortlessly.</span>
              </div>
              {/* Testimonial/Quote */}
              <div className="flex items-center w-full justify-center md:justify-start mt-2 mb-8">
                <Tooltip text="A teacher plants the seeds of knowledge with a caring heart.">
                  <span className="italic text-palette-dark-teal text-center md:text-left max-w-xl mx-auto md:mx-0 cursor-help">
                    "先生は心で知識の種をまく。"
                  </span>
                </Tooltip>
                <span className="not-italic text-palette-dark-teal text-xs ml-4 md:ml-8 whitespace-nowrap self-end">— A happy teacher</span>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20 pt-32">
          <div className="max-w-5xl mx-auto w-full flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-palette-deep-red mb-8 text-center">
              About the Developers
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-stretch relative mb-12">
              {/* Background gradient for team section */}
              <div className="absolute inset-0 bg-gradient-to-br from-palette-golden/5 via-palette-deep-red/3 to-palette-light-cream/0 rounded-3xl -z-10"></div>
              
              {/* Developer 1 */}
              <Rotating3DCard
                className="flex flex-col md:flex-row bg-card-elevated rounded-2xl shadow-2xl border border-palette-golden/50 flex-1 min-h-[320px] md:w-[480px] w-full overflow-hidden"
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
                  <div className="font-bold text-2xl text-palette-dark-red mb-2">Harshk</div>
                  <div className="text-palette-golden font-medium text-lg mb-2">Architect</div>
                </div>
              </Rotating3DCard>
              
              {/* Developer 2 */}
              <Rotating3DCard
                className="flex flex-col md:flex-row bg-card-elevated rounded-2xl shadow-2xl border border-palette-golden/50 flex-1 min-h-[320px] md:w-[480px] w-full overflow-hidden"
                style={{ maxWidth: '100%' }}
              >
                <div className="md:w-1/2 w-full h-56 md:h-auto flex-shrink-0 flex items-center justify-center">
                  <img
                    src="https://res.cloudinary.com/dzjfiqicm/image/upload/v1760117842/Developer_2_iv2thw.webp"
                    alt="Sahasara"
                    className="w-full h-full object-cover object-center bg-white"
                    style={{ minHeight: '100%', minWidth: '100%' }}
                  />
                </div>
                <div className="flex flex-col justify-center items-start p-8 md:w-1/2 w-full">
                  <div className="font-bold text-2xl text-palette-dark-red mb-2">Sahasra</div>
                  <div className="text-palette-golden font-medium text-lg mb-2">UI/UX Designer</div>
                </div>
              </Rotating3DCard>
            </div>
            
            {/* Live Quote */}
            <LiveQuote />
          </div>
        </section>
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
