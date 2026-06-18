'use client';
import dynamic from 'next/dynamic';

const SplashScreen = dynamic(() => import('./SplashScreen'), { ssr: false });
const ScrollProgressBar = dynamic(() => import('./ScrollProgressBar'), { ssr: false });
const ScrollIndicator = dynamic(
  () => import('./ScrollProgressBar').then((m) => ({ default: m.ScrollIndicator })),
  { ssr: false }
);
const FloatingOrbs = dynamic(() => import('./FloatingOrbs'), { ssr: false });
const DynamicBackground = dynamic(() => import('./GradientBackground'), { ssr: false });
const ParticleField = dynamic(() => import('./ParticleField'), { ssr: false });

export default function ClientOnlyEffects() {
  return (
    <>
      <SplashScreen />
      <DynamicBackground />
      <ParticleField />
      <FloatingOrbs />
      <ScrollProgressBar />
      <ScrollIndicator />
    </>
  );
}
