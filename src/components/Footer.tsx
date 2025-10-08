import React, { useState, useEffect } from 'react';
import ReactCountryFlag from 'react-country-flag';

const TIMEZONE_OPTIONS = [
  { label: 'India', countryCode: 'IN', tz: 'Asia/Kolkata', abbr: 'IST', short: 'IN' },
  { label: 'USA', countryCode: 'US', tz: 'America/New_York', abbr: 'EST', short: 'US' },
  { label: 'UK', countryCode: 'GB', tz: 'Europe/London', abbr: 'GMT', short: 'UK' },
  { label: 'Japan', countryCode: 'JP', tz: 'Asia/Tokyo', abbr: 'JST', short: 'JP' },
];

const SegmentedControl: React.FC<{
  value: string;
  onChange: (tz: string) => void;
}> = ({ value, onChange }) => (
  <div className="flex gap-2">
    {TIMEZONE_OPTIONS.map(opt => (
      <button
        key={opt.tz}
        className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-palette-golden text-base select-none
          ${value === opt.tz
            ? 'bg-palette-golden/10 text-palette-deep-red border border-palette-golden shadow'
            : 'bg-card-elevated text-palette-dark-teal border border-palette-golden/30 hover:bg-card-base'}
        `}
        onClick={() => onChange(opt.tz)}
        aria-pressed={value === opt.tz}
        aria-label={opt.label}
        title={opt.label}
        tabIndex={0}
      >
        <ReactCountryFlag
          countryCode={opt.countryCode}
          svg
          style={{ width: '1.5em', height: '1.5em' }}
          aria-label={opt.label}
        />
        <span className="font-semibold tracking-wide">{opt.short}</span>
      </button>
    ))}
  </div>
);

const FooterClock: React.FC<{ timezone: string }> = ({ timezone }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const opt = TIMEZONE_OPTIONS.find(o => o.tz === timezone);
  const abbr = opt?.abbr || '';
  const timeString = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone });
  return (
    <div className="flex items-center gap-1 text-base font-mono font-bold text-palette-deep-red ml-4">
      <span>{timeString}</span>
      <span className="text-xs font-semibold ml-1">{abbr}</span>
    </div>
  );
};

interface FooterProps {
  hideTimeAndControl?: boolean;
  timezone?: string;
  setTimezone?: (tz: string) => void;
  showClock?: boolean;
}

const Footer: React.FC<FooterProps> = ({ hideTimeAndControl, timezone, setTimezone, showClock = true }) => {
  const [internalTimezone, setInternalTimezone] = useState('Asia/Kolkata');
  const tz = timezone ?? internalTimezone;
  const onChange = setTimezone ?? setInternalTimezone;

  if (hideTimeAndControl) {
    return (
      <footer className="w-full flex items-center justify-center px-4 h-20 md:h-16 border-t border-palette-dark-teal bg-palette-light-cream mt-auto z-10 relative overflow-hidden">
        <div className="text-palette-dark-teal text-sm text-center w-full">&copy; {new Date().getFullYear()} Ledger App. Inspired by Japanese design.</div>
      </footer>
    );
  }
  return (
    <footer className="w-full flex flex-col md:flex-row md:items-center md:justify-between px-4 h-20 md:h-16 border-t border-palette-dark-teal bg-palette-light-cream mt-auto z-10 relative gap-2 overflow-hidden">
      <div className="text-palette-dark-teal text-sm text-left w-full md:w-auto">&copy; {new Date().getFullYear()} Ledger App. Inspired by Japanese design.</div>
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
        <SegmentedControl value={tz} onChange={onChange} />
        {showClock && <FooterClock timezone={tz} />}
      </div>
    </footer>
  );
};

export default Footer;
