import React from 'react';
import { Hash, Bot, CheckSquare, Newspaper, Database, Users } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const features = [
  {
    id: 'feat-channels',
    icon: Hash,
    title: 'Project Channels',
    description:
      'Dedicated channels for every project — #skillnaav, #edutechexassessa, and more. Context stays where work happens.',
  },
  {
    id: 'feat-ai',
    icon: Bot,
    title: 'Embedded AI Agent',
    description:
      'Claude 3.5 lives inside your workspace. Ask it anything about your projects and get answers cited from actual channel history.',
  },
  {
    id: 'feat-tasks',
    icon: CheckSquare,
    title: 'Auto Task Extraction',
    description:
      'The AI reads every message and surfaces actionable tasks automatically — no manual ticket creation, no missed follow-ups.',
  },
  {
    id: 'feat-digest',
    icon: Newspaper,
    title: 'Daily Digest',
    description:
      'A morning summary of what happened yesterday across all channels, generated before your team logs in.',
  },
  {
    id: 'feat-kb',
    icon: Database,
    title: 'Org Knowledge Base',
    description:
      'Every decision, design doc, and discussion becomes searchable org memory. The AI retrieves it when you need it.',
  },
  {
    id: 'feat-onboarding',
    icon: Users,
    title: 'Member Onboarding',
    description:
      'New team members get instant context from the org knowledge base. No onboarding doc maintenance required.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-24 px-6 lg:px-10 max-w-screen-xl mx-auto">
      {/* Section tag */}
      <div className="flex items-center gap-4 mb-10 animate-fade-in-left">
        <span className="font-mono text-xs font-600 tracking-[0.15em] text-muted-foreground uppercase">
          [02 / FEATURES]
        </span>
        <div className="h-px flex-1 bg-border max-w-24" />
      </div>
      {/* Heading */}
      <div className="mb-14 animate-fade-in-up delay-150">
        <h2 className="font-display font-700 text-4xl md:text-5xl tracking-tight text-foreground leading-tight">
          What lives inside.
        </h2>
        <p className="text-muted-foreground text-lg mt-4 max-w-xl leading-relaxed">
          Six tightly integrated capabilities that replace five disconnected tools.
        </p>
      </div>
      {/* 2×3 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
        {features?.map((feat, i) => {
          const Icon = feat?.icon;
          return (
            <div
              key={feat?.id}
              className="feature-card group hover-glow animate-fade-in-up"
              style={{ animationDelay: `${200 + i * 70}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                >
                  <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                </div>
                <div className="flex flex-col gap-2 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground/60">0{i + 1}</span>
                    <h3 className="font-display font-600 text-base text-foreground group-hover:text-primary transition-colors duration-200">{feat?.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat?.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}