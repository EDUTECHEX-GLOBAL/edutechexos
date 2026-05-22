import React from 'react';

const testimonials = [
  {
    quote: "EduTechExOS completely changed how our engineering team operates. We no longer lose track of decisions in endless chat threads. The AI agent surfaces context instantly.",
    author: "Sarah Jenkins",
    role: "VP of Engineering, CloudScale",
    avatar: "SJ"
  },
  {
    quote: "The Daily Digest feature alone saves me an hour every morning. I wake up, read the digest, and know exactly what the team accomplished while I was offline.",
    author: "David Chen",
    role: "Product Lead, InnovateTech",
    avatar: "DC"
  },
  {
    quote: "Onboarding used to take weeks. Now, new hires just ask the embedded AI about past projects, and they are up to speed in days. It's like having a dedicated mentor.",
    author: "Elena Rodriguez",
    role: "HR Director, EduFuture",
    avatar: "ER"
  }
];

export default function LandingTestimonials() {
  return (
    <section className="py-24 px-6 lg:px-10 max-w-screen-xl mx-auto bg-muted/30 border-y border-border/50">
      <div className="flex flex-col items-center text-center mb-16 animate-fade-in-up">
        <span className="font-mono text-xs font-600 tracking-[0.15em] text-primary uppercase mb-4">
          [ USER SUCCESS ]
        </span>
        <h2 className="font-display font-700 text-3xl md:text-4xl tracking-tight text-foreground max-w-2xl">
          Don't just take our word for it. See how teams are evolving.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 stagger-children">
        {testimonials.map((testimonial, i) => (
          <div 
            key={`testimonial-${i}`}
            className="feature-card flex flex-col justify-between p-8 hover-glow bg-background"
            style={{ animationDelay: `${150 * i}ms` }}
          >
            <div>
              {/* Quote marks */}
              <div className="text-4xl text-primary/20 font-serif leading-none mb-4">"</div>
              <p className="text-foreground text-lg leading-relaxed mb-8 font-medium">
                {testimonial.quote}
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-display font-bold text-primary border border-primary/20">
                {testimonial.avatar}
              </div>
              <div className="flex flex-col">
                <span className="font-display font-600 text-sm text-foreground">{testimonial.author}</span>
                <span className="text-xs text-muted-foreground">{testimonial.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
