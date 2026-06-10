'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (!POSTHOG_KEY || initialized || typeof window === 'undefined') return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug();
    },
  });
  initialized = true;
}

export function identifyUser(email: string, name?: string) {
  if (!POSTHOG_KEY) return;
  initPostHog();
  posthog.identify(email, { name, email });
}

export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, props);
}

export function resetUser() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
