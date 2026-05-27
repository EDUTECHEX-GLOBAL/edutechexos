import LandingNav from './components/LandingNav';
import LandingHero from './components/LandingHero';
import LandingTrustedBy from './components/LandingTrustedBy';
import LandingFeatures from './components/LandingFeatures';
import LandingHowItWorks from './components/LandingHowItWorks';
import LandingFooter from './components/LandingFooter';
import ClientOnlyEffects from './components/ClientOnlyEffects';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <ClientOnlyEffects />
      <LandingNav />
      <main className="relative z-10">
        <LandingHero />
        <LandingTrustedBy />
        <LandingFeatures />
        <LandingHowItWorks />
      </main>
      <LandingFooter />
    </div>
  );
}
