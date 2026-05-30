import LandingNav from './components/LandingNav';
import LandingHero from './components/LandingHero';
import LandingMarquee from './components/LandingMarquee';
import LandingStats from './components/LandingStats';
import LandingTrustedBy from './components/LandingTrustedBy';
import LandingFeatures from './components/LandingFeatures';
import LandingHowItWorks from './components/LandingHowItWorks';
import LandingCTA from './components/LandingCTA';
import LandingFooter from './components/LandingFooter';
import ClientOnlyEffects from './components/ClientOnlyEffects';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <ClientOnlyEffects />
      <LandingNav />
      <main className="relative z-10">
        <LandingHero />
        <LandingMarquee />
        <LandingStats />
        <LandingTrustedBy />
        <LandingMarquee />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
