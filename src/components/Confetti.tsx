import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger?: any; // Change this prop to trigger the confetti
}

export const Confetti = ({ trigger }: ConfettiProps) => {
  useEffect(() => {
    if (!trigger) return;
    const end = Date.now() + 1.5 * 1000; // 3 seconds
    
    // Get colors from CSS variables dynamically
    const getComputedColor = (varName: string): string => {
      const cssVar = getComputedStyle(document.documentElement)
        .getPropertyValue(varName);
      // Convert HSL string to hex
      const [h, s, l] = cssVar.trim().split(' ');
      const hue = parseInt(h);
      const sat = parseInt(s) / 100;
      const light = parseInt(l) / 100;
      
      const c = (1 - Math.abs(2 * light - 1)) * sat;
      const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
      const m = light - c / 2;
      
      let r = 0, g = 0, b = 0;
      
      if (hue >= 0 && hue < 60) { r = c; g = x; b = 0; }
      else if (hue >= 60 && hue < 120) { r = x; g = c; b = 0; }
      else if (hue >= 120 && hue < 180) { r = 0; g = c; b = x; }
      else if (hue >= 180 && hue < 240) { r = 0; g = x; b = c; }
      else if (hue >= 240 && hue < 300) { r = x; g = 0; b = c; }
      else if (hue >= 300 && hue < 360) { r = c; g = 0; b = x; }
      
      const toHex = (num: number) => {
        const hex = Math.round((num + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };
    
    const colors = [
      getComputedColor('--confetti-1'),
      getComputedColor('--confetti-2'),
      getComputedColor('--confetti-3'),
      getComputedColor('--confetti-4')
    ];

    const frame = () => {
      if (Date.now() > end) return;
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
      });
      requestAnimationFrame(frame);
    };
    frame();
    // Only run when trigger changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
};
