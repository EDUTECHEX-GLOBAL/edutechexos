'use client';
import React, { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  parallax?: number;
  threshold?: number;
  distance?: number;
}

export default function AnimatedSection({
  children,
  className = '',
  id,
  delay = 0,
  direction = 'up',
  duration = 0.8,
  parallax = 0,
  threshold = 0.05,
  distance = 50,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -20px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    if (parallax === 0) return;
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [parallax]);

  const hiddenTransform =
    direction === 'up' ? `translateY(${distance}px)`
    : direction === 'down' ? `translateY(${-distance}px)`
    : direction === 'left' ? `translateX(${distance}px)`
    : direction === 'right' ? `translateX(${-distance}px)`
    : 'none';

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? parallax !== 0 ? `translateY(${(scrollY * parallax * 0.05)}px)` : 'none'
          : hiddenTransform,
        transition: `opacity ${duration}s cubic-bezier(0.22, 1, 0.36, 1), transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1)`,
        transitionDelay: `${isVisible ? 0 : delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
