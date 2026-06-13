import ClientOnly from './components/ClientOnly';
import LandingPageContent from './LandingPageContent';

export default function LandingPage() {
  return (
    <ClientOnly>
      <LandingPageContent />
    </ClientOnly>
  );
}
