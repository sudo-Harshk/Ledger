import { Toaster } from 'react-hot-toast';
import React from 'react';

// Get CSS variable values
const getCSSVariable = (varName: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  }
  return '';
};

// Convert HSL to hex
const hslToHex = (hsl: string): string => {
  const [h, s, l] = hsl.split(' ').map(val => parseFloat(val));
  const hue = h;
  const sat = s / 100;
  const light = l / 100;
  
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
  
  const toHex = (num: number): string => {
    const hex = Math.round((num + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const ToastProvider: React.FC = () => {
  const toastBg = hslToHex(getCSSVariable('--toast-bg'));
  const toastText = hslToHex(getCSSVariable('--toast-text'));
  const toastSuccess = hslToHex(getCSSVariable('--toast-success'));
  const toastError = hslToHex(getCSSVariable('--toast-error'));

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: toastBg,
          color: toastText,
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: toastSuccess,
            secondary: toastText,
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: toastError,
            secondary: toastText,
          },
        },
      }}
    />
  );
};

export default ToastProvider;
