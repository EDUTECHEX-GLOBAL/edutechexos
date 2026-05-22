import LandingNav from './components/LandingNav';
import LandingHero from './components/LandingHero';
import LandingTrustedBy from './components/LandingTrustedBy';
import LandingFeatures from './components/LandingFeatures';
import LandingHowItWorks from './components/LandingHowItWorks';
import LandingTestimonials from './components/LandingTestimonials';
import LandingCTA from './components/LandingCTA';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="graph-paper-bg min-h-screen">
      <LandingNav />
      <main>
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