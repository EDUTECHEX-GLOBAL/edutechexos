'use client';

import LandingNav from './components/LandingNav';
import LandingHero from './components/LandingHero';
import LandingCTA from './components/LandingCTA';
import LandingFooter from './components/LandingFooter';
import ClientOnlyEffects from './components/ClientOnlyEffects';
import { DecoStyles, DecoDivider } from './components/LandingDeco';
import LandingTrustedBy from './components/LandingTrustedBy';
import LandingFeatures from './components/LandingFeatures';
import LandingHowItWorks from './components/LandingHowItWorks';

export default function LandingPageContent() {
  return (
    <div className="relative min-h-screen bg-background">
      <DecoStyles />
      <ClientOnlyEffects />
      <LandingNav />
      <main className="relative z-10">
        <LandingHero />
        <DecoDivider label="Capabilities" background="#E4E6F8" />
        <LandingTrustedBy />
        <DecoDivider label="What lives inside" background="#E3E8FC" />
        <LandingFeatures />
        <DecoDivider label="How it works" background="#E9EBF7" />
        <LandingHowItWorks />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
