import { Suspense } from 'react';
import AuthCard from './components/AuthCard';
import { Sparkles } from 'lucide-react';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-green-surface/40 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-primary/8 via-lavender/4 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-lavender/6 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 z-10 glass-nav">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-14 flex items-center">
          <a href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-green-light flex items-center justify-center shadow-md shadow-primary/20">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-base tracking-[-0.02em] text-foreground">
              EduTechEx<span className="text-primary">OS</span>
            </span>
          </a>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="mt-14 w-full max-w-md card-premium p-8 text-sm font-medium text-ink-light animate-pulse-soft">
            Loading sign in...
          </div>
        }
      >
        <AuthCard />
      </Suspense>
    </div>
  );
}
