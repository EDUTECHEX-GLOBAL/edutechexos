import LandingNav from './components/LandingNav';
import LandingHero from './components/LandingHero';
import LandingTrustedBy from './components/LandingTrustedBy';
import LandingFeatures from './components/LandingFeatures';
import LandingHowItWorks from './components/LandingHowItWorks';
import LandingTestimonials from './components/LandingTestimonials';
import LandingCTA from './components/LandingCTA';
import LandingFooter from './components/LandingFooter';
import SplashScreen from './components/SplashScreen';
import ScrollProgressBar from './components/ScrollProgressBar';
import { ScrollIndicator } from './components/ScrollProgressBar';
import FloatingOrbs from './components/FloatingOrbs';
import DynamicBackground from './components/GradientBackground';
import ParticleField from './components/ParticleField';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <SplashScreen />
      <DynamicBackground />
      <ParticleField />
      <FloatingOrbs />
      <ScrollProgressBar />
      <ScrollIndicator />
      <LandingNav />
      <main className="relative z-10">
        <LandingHero />
        <LandingTrustedBy />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingTestimonials />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
