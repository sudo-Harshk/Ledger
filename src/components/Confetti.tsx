import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger?: any; // Change this prop to trigger the confetti
}

export const Confetti = ({ trigger }: ConfettiProps) => {
  useEffect(() => {
    if (!trigger) return;
    const end = Date.now() + 1.5 * 1000; // 3 seconds
    const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];

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
