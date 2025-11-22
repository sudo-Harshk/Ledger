import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { FlippableCard, FeatureCard, SecurityBadge } from '../components';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Shield, 
  Lock, 
  Eye,
  UserCheck,
  ClipboardCheck,
  Palette,
  Sparkles
} from 'lucide-react';

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
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded bg-tooltip-bg text-tooltip-text text-xs shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {text}
        </div>
      )}
    </span>
  );
};

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
  const [selectedTheme, setSelectedTheme] = useState<string>('default');

  const themes = [
    { value: 'default', label: 'Warm Cream', colors: ['#FDF6F0', '#FFE1AF', '#F87171', '#9e2a2b'] },
    { value: 'sage', label: 'Sage Green', colors: ['#D9E9CF', '#B6CEB4', '#F0F0F0', '#96A78D'] },
    { value: 'ocean', label: 'Ocean Breeze', colors: ['#E7F2EF', '#A1C2BD', '#708993', '#19183B'] },
    { value: 'vintage', label: 'Vintage Warm', colors: ['#FBF3D1', '#DEDED1', '#C5C7BC', '#B6AE9F'] },
    { value: 'desert', label: 'Desert Sunset', colors: ['#FFE1AF', '#E2B59A', '#957C62', '#B77466'] }
  ];

  return (
    <div className="min-h-screen bg-palette-light-cream" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      <div className="floating-nav-wrapper">
        <header className="floating-nav-header">
          <div className="flex items-center gap-2">
            <div className="font-bold text-2xl tracking-widest text-palette-dark-red" style={{ fontFamily: "'Blackflag', sans-serif" }}>Ledger</div>
          </div>
          <nav className="flex gap-8 text-palette-dark-red font-medium text-lg">
            <button 
              onClick={() => navigate('/login')}
              className="group relative bg-gradient-to-r from-palette-golden to-palette-deep-red hover:from-palette-golden/90 hover:to-palette-deep-red/90 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-palette-golden focus:ring-offset-2 active:scale-95 border border-palette-golden/30"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg 
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </span>
              <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </nav>
        </header>
      </div>
      <main className="relative">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="w-full h-full bg-gradient-to-br from-palette-golden/10 via-palette-deep-red/5 to-palette-light-cream/0"></div>
        </div>

        {/* Hero Section */}
        <section id="home" className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-16">
              <div className="flex-1 flex flex-col justify-center items-start gap-4 md:gap-6 w-full md:w-1/2 max-w-xl">
                <Tooltip text="Attendance Management">
                  <div className="text-3xl text-palette-deep-red font-bold mb-2 cursor-help" style={{fontFamily: 'Noto Sans JP, sans-serif'}}>
                    出席管理
                  </div>
                </Tooltip>
                <h1 className="text-4xl md:text-6xl font-extrabold text-palette-dark-red leading-tight mb-4">
                  Roll Call, <span className="text-palette-golden">Reimagined.</span>
                </h1>
                <p className="text-lg md:text-xl text-palette-dark-teal mb-6 leading-relaxed">
                  Ledger App transforms attendance into a smooth, satisfying experience—no more admin headaches, just classroom harmony.
                </p>
                <div className="w-full mb-6">
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
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    className="bg-palette-deep-red hover:bg-palette-dark-red text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all text-lg focus:outline-none focus:ring-2 focus:ring-palette-golden focus:ring-offset-2"
                    onClick={() => navigate('/login')}
                  >
                    Get Started
                  </button>
                  <button
                    className="border-2 border-palette-golden text-palette-dark-red hover:bg-palette-golden/10 font-semibold py-3 px-8 rounded-lg transition-all text-lg focus:outline-none focus:ring-2 focus:ring-palette-golden focus:ring-offset-2"
                    onClick={() => {
                      const featuresSection = document.getElementById('features');
                      featuresSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Learn More
                  </button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center md:items-start gap-4 md:gap-6 w-full md:w-1/2 max-w-xl mt-8 md:mt-0">
                <div className="bg-card-elevated rounded-xl shadow-xl p-6 md:p-8 max-w-2xl text-center md:text-left border border-palette-golden/50">
                  <span className="font-bold text-palette-deep-red text-lg">What is Ledger?</span>
                  <p className="text-palette-dark-teal mt-2 leading-relaxed">
                    Ledger is a modern, Japanese-inspired web app for teachers and students to track attendance, approvals, and progress—beautifully and effortlessly.
                  </p>
                </div>
                <div className="flex items-center w-full justify-center md:justify-start mt-2">
                  <Tooltip text="A teacher plants the seeds of knowledge with a caring heart.">
                    <span className="italic text-palette-dark-teal text-center md:text-left max-w-xl mx-auto md:mx-0 cursor-help">
                      "先生は心で知識の種をまく。"
                    </span>
                  </Tooltip>
                  <span className="not-italic text-palette-dark-teal text-xs ml-4 md:ml-8 whitespace-nowrap self-end">— A happy teacher</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative z-10 py-20 px-4 bg-gradient-to-b from-palette-light-cream to-palette-light-cream/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-palette-deep-red mb-4">
                Powerful Features for Everyone
              </h2>
              <p className="text-lg text-palette-dark-teal max-w-2xl mx-auto">
                Everything you need to manage attendance and fees, beautifully designed for students, teachers, and administrators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <FeatureCard
                icon={<UserCheck className="w-6 h-6" />}
                title="Daily Attendance"
                description="Students can mark their attendance daily with a simple, intuitive interface. Real-time updates keep everyone in sync."
                highlight={true}
              />
              <FeatureCard
                icon={<ClipboardCheck className="w-6 h-6" />}
                title="Approval Workflow"
                description="Teachers approve or reject attendance requests instantly. Bulk operations make managing multiple students effortless."
              />
              <FeatureCard
                icon={<DollarSign className="w-6 h-6" />}
                title="Fee Management"
                description="Automatic fee calculation based on attendance. Students see exactly what they owe, when it's due, and payment status."
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Revenue Analytics"
                description="Teachers and admins get comprehensive revenue summaries, monthly charts, and financial insights at a glance."
              />
              <FeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Student Management"
                description="Create, edit, and manage student accounts. Activate or deactivate students as needed with full control."
              />
              <FeatureCard
                icon={<Calendar className="w-6 h-6" />}
                title="Calendar View"
                description="Beautiful calendar interface showing attendance status for each day. Visual indicators make tracking progress simple."
              />
            </div>
          </div>
        </section>

        {/* Theme Showcase Section */}
        <section id="themes" className="relative z-10 py-20 px-4 bg-gradient-to-b from-palette-light-cream/50 to-palette-light-cream">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Palette className="w-6 h-6 text-palette-golden" />
                <h2 className="text-3xl md:text-4xl font-bold text-palette-deep-red">
                  Choose Your Theme
                </h2>
              </div>
              <p className="text-lg text-palette-dark-teal max-w-2xl mx-auto">
                Personalize your experience with 5 beautifully curated color palettes. Your preference is saved automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setSelectedTheme(theme.value)}
                  className={`
                    relative group p-6 rounded-xl border-2 transition-all duration-300
                    ${selectedTheme === theme.value 
                      ? 'border-palette-golden shadow-lg bg-card-elevated' 
                      : 'border-palette-golden/30 bg-card-base hover:border-palette-golden/50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-24 rounded-lg overflow-hidden flex">
                      <div 
                        className="flex-1"
                        style={{ backgroundColor: theme.colors[0] }}
                      />
                      <div 
                        className="flex-1"
                        style={{ backgroundColor: theme.colors[1] }}
                      />
                      <div 
                        className="flex-1"
                        style={{ backgroundColor: theme.colors[2] }}
                      />
                      <div 
                        className="flex-1"
                        style={{ backgroundColor: theme.colors[3] }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`font-semibold ${selectedTheme === theme.value ? 'text-palette-deep-red' : 'text-palette-dark-red'}`}>
                        {theme.label}
                      </div>
                      {selectedTheme === theme.value && (
                        <div className="mt-2 text-palette-golden text-sm font-medium">Selected</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-palette-dark-teal text-sm">
                <Sparkles className="w-4 h-4 inline mr-1 text-palette-golden" />
                Theme switcher available in the footer and throughout the app
              </p>
            </div>
          </div>
        </section>

        {/* Security & Trust Section */}
        <section id="security" className="relative z-10 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-palette-golden" />
                <h2 className="text-3xl md:text-4xl font-bold text-palette-deep-red">
                  Security & Trust
                </h2>
              </div>
              <p className="text-lg text-palette-dark-teal max-w-2xl mx-auto">
                Your data is protected with enterprise-grade security measures
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <SecurityBadge
                icon={<Shield className="w-6 h-6" />}
                title="Firebase Security"
                description="Built on Google Firebase with industry-standard security practices and encrypted data transmission."
              />
              <SecurityBadge
                icon={<Lock className="w-6 h-6" />}
                title="App Check Protection"
                description="reCAPTCHA v3 integration prevents abuse and ensures only legitimate users can access the platform."
              />
              <SecurityBadge
                icon={<Eye className="w-6 h-6" />}
                title="Role-Based Access"
                description="Students see only their data. Teachers manage their students. Admins have platform-wide oversight."
              />
              <SecurityBadge
                icon={<Users className="w-6 h-6" />}
                title="Controlled Access"
                description="No self-registration. Only teachers and admins can create accounts, ensuring a secure, managed environment."
              />
            </div>
          </div>
        </section>

        {/* About Developers Section */}
        <section id="team" className="relative z-10 py-20 px-4 bg-gradient-to-b from-palette-light-cream to-palette-light-cream/50">
          <div className="max-w-5xl mx-auto w-full flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-palette-deep-red mb-4 text-center">
              About the Developers
            </h2>
            <p className="text-palette-dark-teal mb-12 text-center max-w-2xl">
              Built with passion by a dedicated team of developers and designers
            </p>
            
            <div className="flex flex-col md:flex-row gap-16 w-full justify-center items-stretch relative mb-12">
              <div className="absolute inset-0 bg-gradient-to-br from-palette-golden/5 via-palette-deep-red/3 to-palette-light-cream/0 rounded-3xl -z-10"></div>
              
              <FlippableCard
                className="relative flex-1 min-h-[320px] md:w-[480px] w-full"
                style={{ maxWidth: '100%' }}
                frontContent={
                  <div className="flex flex-col md:flex-row bg-card-elevated rounded-2xl shadow-2xl border border-palette-golden/50 h-full overflow-hidden">
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
                      <p className="text-palette-dark-teal text-sm">
                        Backend architecture, Firebase integration, and system design
                      </p>
                    </div>
                  </div>
                }
                backContent={
                  <div className="flex items-center justify-center bg-card-elevated rounded-2xl shadow-2xl border border-palette-golden/50 h-full">
                    <a 
                      href="https://github.com/sudo-Harshk" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center justify-center p-8 transition-all duration-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <svg 
                          className="w-24 h-24 text-palette-dark-red group-hover:text-palette-golden transition-all duration-500 group-hover:rotate-12" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <div className="absolute inset-0 bg-palette-golden/20 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500"></div>
                      </div>
                      <span className="text-palette-dark-red font-semibold mt-6 group-hover:text-palette-golden transition-colors duration-500 text-lg">
                        View on GitHub
                      </span>
                      <div className="mt-2 w-16 h-0.5 bg-palette-golden scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
                    </a>
                  </div>
                }
              />
              
              <FlippableCard
                className="relative flex-1 min-h-[320px] md:w-[480px] w-full"
                style={{ maxWidth: '100%' }}
                frontContent={
                  <div className="flex flex-col md:flex-row bg-card-elevated rounded-2xl shadow-2xl border border-palette-golden/50 h-full overflow-hidden">
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
                      <p className="text-palette-dark-teal text-sm">
                        User interface design, theme system, and user experience optimization
                      </p>
                    </div>
                  </div>
                }
                backContent={
                  <div className="flex items-center justify-center bg-card-elevated rounded-2xl shadow-2xl border border-palette-golden/50 h-full">
                    <a 
                      href="https://github.com/sahasramandadi" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center justify-center p-8 transition-all duration-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <svg 
                          className="w-24 h-24 text-palette-dark-red group-hover:text-palette-golden transition-all duration-500 group-hover:rotate-12" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <div className="absolute inset-0 bg-palette-golden/20 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500"></div>
                      </div>
                      <span className="text-palette-dark-red font-semibold mt-6 group-hover:text-palette-golden transition-colors duration-500 text-lg">
                        View on GitHub
                      </span>
                      <div className="mt-2 w-16 h-0.5 bg-palette-golden scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"></div>
                    </a>
                  </div>
                }
              />
            </div>
            
            <LiveQuote />
          </div>
        </section>

        {/* Final CTA Section */}
        <section id="cta" className="relative z-10 py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-palette-golden/10 via-palette-deep-red/5 to-palette-light-cream rounded-2xl p-8 md:p-12 border border-palette-golden/30 shadow-xl">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-palette-dark-red mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-lg text-palette-dark-teal mb-8 max-w-2xl mx-auto">
                  Join teachers and students who are already using Ledger to streamline their attendance management. 
                  Experience the difference of a beautifully designed, thoughtfully built platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    className="bg-palette-deep-red hover:bg-palette-dark-red text-white font-semibold py-4 px-10 rounded-lg shadow-lg transition-all text-lg focus:outline-none focus:ring-2 focus:ring-palette-golden focus:ring-offset-2"
                    onClick={() => navigate('/login')}
                  >
                    Sign In Now
                  </button>
                  <button
                    className="border-2 border-palette-golden text-palette-dark-red hover:bg-palette-golden/10 font-semibold py-4 px-10 rounded-lg transition-all text-lg focus:outline-none focus:ring-2 focus:ring-palette-golden focus:ring-offset-2"
                    onClick={() => {
                      const featuresSection = document.getElementById('features');
                      featuresSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Explore Features
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
