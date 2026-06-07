'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  return (
    <div className="w-full bg-[#F9F8F6] font-sans selection:bg-[#D4AF37]/30 selection:text-[#0A1128] overflow-hidden min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');

        .font-serif { font-family: 'Playfair Display', serif; }

        .font-sans { font-family: 'Inter', sans-serif; }

        .diagonal-split {
          clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%);
        }

        .reveal-item {
          opacity: 0;
          transform: translateY(20px);
          animation: reveal-up 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        @keyframes reveal-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dot-grid {
          background-image: radial-gradient(rgba(212, 175, 55, 0.12) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .ticker-animation {
          display: flex;
          width: fit-content;
          animation: ticker-loop 30s linear infinite;
        }

        @keyframes ticker-loop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @media (max-width: 1024px) {
          .diagonal-split {
            clip-path: none;
          }
        }
      `}</style>

      <main className="relative w-full min-h-screen flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Brand & Messaging */}
        <section className="relative w-full lg:w-[45%] bg-[#0A1128] lg:diagonal-split z-10 flex flex-col justify-center px-12 lg:px-24 py-20 lg:py-0 min-h-[400px] lg:h-auto">
          <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#D4AF37]/5 blur-[140px] pointer-events-none"></div>
          
          <div className="relative max-w-lg">
            <div className="reveal-item mb-8" style={{ animationDelay: '100ms' }}>
              <div className="h-[2px] w-16 bg-[#D4AF37]"></div>
            </div>

            <h1 className="reveal-item font-serif text-5xl lg:text-7xl text-white leading-[1.1] mb-8" style={{ animationDelay: '200ms' }}>
              Return to <br />
              <span className="italic font-normal text-[#D4AF37]">Excellence.</span>
            </h1>

            <p className="reveal-item text-white/50 text-lg lg:text-xl font-light leading-relaxed mb-12" style={{ animationDelay: '300ms' }}>
              Enter the secure gateway of EduTechEx. Continue your journey in developing world-class curriculum and academic intelligence.
            </p>

            <div className="reveal-item flex items-center gap-6" style={{ animationDelay: '400ms' }}>
              <div className="flex -space-x-3">
                <img src="https://i.pravatar.cc/100?u=dean1" className="w-10 h-10 rounded-full border-2 border-[#0A1128]" alt="Faculty" />
                <img src="https://i.pravatar.cc/100?u=tech2" className="w-10 h-10 rounded-full border-2 border-[#0A1128]" alt="Researcher" />
                <img src="https://i.pravatar.cc/100?u=admin3" className="w-10 h-10 rounded-full border-2 border-[#0A1128]" alt="Admin" />
              </div>
              <span className="text-white/40 text-xs font-bold tracking-widest uppercase">Verified Institution Access</span>
            </div>
          </div>

          <div className="absolute bottom-12 left-12 lg:left-24 reveal-item hidden lg:block" style={{ animationDelay: '500ms' }}>
            <p className="text-white/20 text-[10px] tracking-[0.3em] font-bold uppercase">System v2.4.0 • Secured Encryption</p>
          </div>
        </section>

        {/* Right Side: Form Area */}
        <section className="relative flex-1 bg-[#F9F8F6] flex flex-col items-center py-16 lg:py-20 h-auto lg:h-screen overflow-y-auto">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/natural-paper.png')" }}></div>

          {/* Logo */}
          <div className="w-full max-w-lg px-8 z-30 reveal-item" style={{ animationDelay: '100ms' }}>
            <Link href="/" className="flex items-center gap-4 group no-underline">
              <div className="w-14 h-14 bg-[#D4AF37] rounded-sm flex items-center justify-center shadow-xl shadow-[#D4AF37]/20 transition-transform group-hover:scale-105">
                <span className="text-[#0A1128] font-black text-xl">EX</span>
              </div>
              <div>
                <span className="font-serif text-3xl font-bold tracking-tight text-[#0A1128]">EduTechEx</span>
                <span className="block text-[9px] font-black text-[#0A1128]/50 tracking-[0.4em] uppercase mt-0.5">Institutional Portal</span>
              </div>
            </Link>
          </div>

          {/* Form Card Container */}
          <div className="w-full max-w-lg mt-12 px-8 relative z-20 reveal-item" style={{ animationDelay: '200ms' }}>
            <Suspense fallback={<div className="text-center text-xs py-8">Loading Portal…</div>}>
              <AuthCard />
            </Suspense>
          </div>

          {/* Academic Partners Ticker (Desktop only at bottom) */}
          <div className="mt-auto w-full py-10 bg-white/40 backdrop-blur-xl border-t border-[#0A1128]/5 overflow-hidden hidden lg:block">
            <div className="flex flex-col items-center mb-6 opacity-40">
              <span className="text-[#0A1128] text-[10px] font-black tracking-[0.5em] uppercase">Trusted Academic Partners</span>
            </div>
            
            <div className="relative w-full flex overflow-hidden">
              <div className="ticker-animation items-center gap-32 px-16">
                {[
                  { name: 'OXFORD', icon: 'ti-building-arch' },
                  { name: 'STAMFORD', icon: 'ti-award' },
                  { name: 'HARVARD', icon: 'ti-book' },
                  { name: 'PRINCETON', icon: 'ti-certificate' },
                  { name: 'CAMBRIDGE', icon: 'ti-library' },
                ].concat([
                  { name: 'OXFORD', icon: 'ti-building-arch' },
                  { name: 'STAMFORD', icon: 'ti-award' },
                  { name: 'HARVARD', icon: 'ti-book' },
                  { name: 'PRINCETON', icon: 'ti-certificate' },
                  { name: 'CAMBRIDGE', icon: 'ti-library' },
                ]).map((partner, i) => (
                  <div key={i} className="flex items-center gap-4 text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors cursor-default group/ticker">
                    <i className={`ti ${partner.icon} text-xl group-hover/ticker:scale-110 transition-transform`}></i>
                    <span className="font-serif text-lg font-bold tracking-tight">{partner.name}</span>
                  </div>
                ))}
              </div>
    
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
