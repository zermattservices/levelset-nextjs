'use client';

import { useEffect, useRef, useState } from 'react';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 2, suffix: '+', label: 'Operators' },
  { value: 3, suffix: '+', label: 'Locations' },
  { value: 3783, suffix: '+', label: 'Ratings Submitted' },
];

function animateCount(
  target: number,
  setCount: (v: number) => void
) {
  // For small numbers, just set immediately
  if (target <= 10) {
    setCount(target);
    return;
  }
  const duration = 1500;
  const steps = 40;
  const increment = target / steps;
  let current = 0;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      setCount(target);
      clearInterval(timer);
    } else {
      setCount(Math.floor(current));
    }
  }, duration / steps);
}

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const startAnimation = () => {
      if (hasAnimated) return;
      setHasAnimated(true);
      animateCount(target, setCount);
    };

    // Try IntersectionObserver first
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && ref.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startAnimation();
            observer?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(ref.current);
    }

    // Fallback: animate after 2s regardless (handles edge cases)
    const fallback = setTimeout(startAnimation, 2000);

    return () => {
      observer?.disconnect();
      clearTimeout(fallback);
    };
  }, [target, hasAnimated]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="py-20 md:py-24 bg-white border-y border-[#31664A]/10">
      <div className="max-w-content mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-[#31664A]/10">
          {stats.map((stat, index) => (
            <div key={index} className="text-center px-4">
              <div className="text-5xl md:text-6xl font-heading font-bold text-[#31664A] mb-2">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-text-secondary font-medium uppercase tracking-wider text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
