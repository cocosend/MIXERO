export const triggerHaptic = (pattern: number | number[] = [35, 25, 45]) => {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration restricted
    }
  }
};
