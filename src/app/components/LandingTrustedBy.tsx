import React from 'react';

const companies = [
  { name: 'Acme Corp', logo: 'A' },
  { name: 'Globex', logo: 'G' },
  { name: 'Initech', logo: 'I' },
  { name: 'Soylent', logo: 'S' },
  { name: 'Umbrella', logo: 'U' },
];

export default function LandingTrustedBy() {
  return (
    <section className="border-y border-border/50 bg-muted/20 py-10 px-6 lg:px-10 overflow-hidden">
      <div className="max-w-screen-xl mx-auto flex flex-col items-center gap-6">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest text-center">
          Trusted by innovative teams worldwide
        </p>
        
        {/* Simple static row for logos (using text placeholders for now to keep it clean) */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {companies.map((company) => (
            <div key={company.name} className="flex items-center gap-2 group cursor-default">
              <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center font-display font-bold text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {company.logo}
              </div>
              <span className="font-display font-600 text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">
                {company.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
