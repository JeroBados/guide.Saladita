declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackCtaClick(placeId: string, type: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'cta_click', { place: placeId, type });
}
