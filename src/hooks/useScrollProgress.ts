'use client';
import { useState, useEffect } from 'react';

export function useScrollProgress() {
  const [scrollY, setScrollY] = useState(0);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [sectionProgress, setSectionProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    let lastY = 0;
    const handler = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollY(y);
      setProgress(max > 0 ? Math.min(y / max, 1) : 0);
      setDirection(y > lastY + 2 ? 'down' : y < lastY - 2 ? 'up' : direction);
      lastY = y;
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [direction]);

  useEffect(() => {
    const sections = ['hero', 'trusted', 'features', 'how-it-works', 'testimonials', 'cta'];
    const observer = new IntersectionObserver(
      (entries) => {
        const updates: Record<string, number> = {};
        entries.forEach((entry) => {
          updates[entry.target.id] = Math.min(entry.intersectionRatio, 1);
        });
        setSectionProgress((prev) => ({ ...prev, ...updates }));
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return { scrollY, progress, direction, sectionProgress };
}

export function useActiveSection(sectionIds: string[]) {
  const [active, setActive] = useState(sectionIds[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
            setActive(entry.target.id);
          }
        });
      },
      { threshold: [0.1, 0.25, 0.4], rootMargin: '-80px 0px 0px 0px' }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sectionIds]);

  return active;
}
