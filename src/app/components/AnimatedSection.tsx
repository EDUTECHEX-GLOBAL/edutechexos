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
}

export default function AnimatedSection({
  children,
  className = '',
  id,
  delay = 0,
  direction = 'up',
  duration = 0.9,
  parallax = 0,
  threshold = 0.08,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [offsetTop, setOffsetTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(el);
    setOffsetTop(el.offsetTop);
    return () => observer.disconnect();
  }, [delay, threshold]);

  useEffect(() => {
    if (parallax === 0) return;
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, [parallax]);

  const dist = 40;
  const hiddenTransform = direction === 'up' ? `translateY(${dist}px)`
    : direction === 'down' ? `translateY(${-dist}px)`
    : direction === 'left' ? `translateX(${dist}px)`
    : direction === 'right' ? `translateX(${-dist}px)`
    : 'none';

  const parallaxOffset = parallax !== 0 && offsetTop
    ? (scrollY - offsetTop + window.innerHeight * 0.5) * parallax * 0.05
    : 0;

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? `translateY(${parallaxOffset}px)`
          : hiddenTransform,
        transition: `opacity ${duration}s cubic-bezier(0.22, 1, 0.36, 1), transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1)`,
        transitionDelay: isVisible ? '0s' : `${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
