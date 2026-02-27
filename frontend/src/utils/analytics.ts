type AnalyticsEvent = {
  name: string;
  timestamp: string;
  payload?: Record<string, unknown>;
};

const STORAGE_KEY = 'rrse-analytics-events';

export const trackEvent = (name: string, payload?: Record<string, unknown>) => {
  const event: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    payload,
  };

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const events = existing ? (JSON.parse(existing) as AnalyticsEvent[]) : [];
    events.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-200)));
  } catch {
    // Ignore storage errors (private browsing, disabled storage).
  }

  if (typeof window !== 'undefined' && (window as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as { gtag?: (...args: unknown[]) => void }).gtag?.('event', name, payload || {});
  } else {
    // Fallback to console for now.
    console.info(`[analytics] ${name}`, payload || {});
  }
};
