import React from 'react';

const steps = [
  {
    id: 'step-connect',
    number: '01',
    title: 'Connect your team.',
    description:
      'Invite team members, assign roles, and set up project channels in under two minutes. No configuration overhead.',
  },
  {
    id: 'step-communicate',
    number: '02',
    title: 'Communicate in channels.',
    description:
      'Use dedicated channels for each project. Every message is indexed in real time and fed into the AI context window.',
  },
  {
    id: 'step-ai',
    number: '03',
    title: 'AI handles the rest.',
    description:
      'Claude 3.5 extracts tasks, generates the morning digest, answers questions, and keeps the knowledge base current — automatically.',
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 lg:px-10 max-w-screen-xl mx-auto border-t border-border">
      {/* Section tag */}
      <div className="flex items-center gap-4 mb-10 animate-fade-in-left">
        <span className="font-mono text-xs font-600 tracking-[0.15em] text-muted-foreground uppercase">
          [03 / HOW IT WORKS]
        </span>
        <div className="h-px flex-1 bg-border max-w-24" />
      </div>
      {/* Heading */}
      <div className="mb-14 animate-fade-in-up delay-150">
        <h2 className="font-display font-700 text-4xl md:text-5xl tracking-tight text-foreground leading-tight">
          Three steps to<br />full team context.
        </h2>
      </div>
      {/* Steps */}
      <div className="flex flex-col lg:flex-row items-start gap-0 lg:gap-0">
        {steps?.map((step, i) => (
          <React.Fragment key={step?.id}>
            <div
              className="flex-1 flex flex-col gap-5 py-8 lg:py-0 lg:pr-10 animate-fade-in-up"
              style={{ animationDelay: `${200 + i * 150}ms` }}
            >
              {/* Step number */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-5xl font-800 text-foreground leading-none transition-colors duration-300 hover:text-primary">
                  {step?.number}
                </span>
                <div className="w-8 h-px bg-foreground" />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-3">
                <h3 className="font-display font-700 text-xl text-foreground leading-snug">{step?.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{step?.description}</p>
              </div>

              {/* Decorative box */}
              <div className="w-full h-32 border border-border rounded-lg bg-muted/30 flex items-center justify-center mt-2 hover-glow transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 animate-border-dance" style={{ animationDelay: `${500 + i * 150}ms` }}>
                {i === 0 && (
                  <div className="flex gap-2">
                    {['VK', 'RA', 'TM', 'SA']?.map((init, idx) => (
                      <div
                        key={`init-${init}`}
                        className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center animate-scale-in"
                        style={{ animationDelay: `${400 + idx * 80}ms` }}
                      >
                        <span className="text-xs font-700 text-background font-mono">{init}</span>
                      </div>
                    ))}
                  </div>
                )}
                {i === 1 && (
                  <div className="flex flex-col gap-1.5 w-48">
                    {['#skillnaav', '#edutechexassessa', '#general']?.map((ch, idx) => (
                      <div
                        key={`ch-${ch}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 rounded-md border border-border animate-fade-in-left"
                        style={{ animationDelay: `${400 + idx * 80}ms` }}
                      >
                        <span className="text-primary font-mono text-xs font-600">#</span>
                        <span className="text-xs font-500 text-foreground">{ch?.replace('#', '')}</span>
                      </div>
                    ))}
                  </div>
                )}
                {i === 2 && (
                  <div className="flex flex-col gap-2 w-52">
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/8 border border-primary/20 rounded-md animate-scale-in delay-400">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 animate-pulse-glow">
                        <span className="text-white text-xs font-700">AI</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Extracted 3 tasks from #skillnaav</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border border-border rounded-md animate-scale-in delay-500">
                      <span className="text-xs">📋</span>
                      <span className="text-xs text-muted-foreground">Morning digest ready — 6 May</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow between steps */}
            {i < steps?.length - 1 && (
              <div className="hidden lg:flex items-center self-center pb-8">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="animate-fade-in-right" style={{ animationDelay: `${350 + i * 150}ms` }}>
                  <path
                    d="M6 16h16M16 8l8 8-8 8"
                    stroke="#d4d4d8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}