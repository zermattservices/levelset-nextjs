'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { FeaturesDropdown, FeaturesMenuItems } from './FeaturesDropdown';
import { useTrialModal } from '@/components/cta/TrialModalProvider';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const featuresTimeout = useRef<NodeJS.Timeout | null>(null);
  const { openModal } = useTrialModal();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close features dropdown when clicking outside
  useEffect(() => {
    if (!featuresOpen) return;
    const handleClick = () => setFeaturesOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [featuresOpen]);

  const linkClass = `text-sm font-medium transition-colors duration-200 ${
    scrolled ? 'text-text-secondary hover:text-brand' : 'text-white/70 hover:text-white'
  }`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-border/50 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={scrolled ? '/logos/Levelset no margin.png' : '/logos/Levelset White no margin.png'}
            alt="Levelset"
            width={130}
            height={32}
            className="h-7 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={() => {
              if (featuresTimeout.current) clearTimeout(featuresTimeout.current);
              setFeaturesOpen(true);
            }}
            onMouseLeave={() => {
              featuresTimeout.current = setTimeout(() => setFeaturesOpen(false), 150);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`${linkClass} flex items-center gap-1`}
              onClick={() => setFeaturesOpen(!featuresOpen)}
            >
              Features
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${featuresOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <FeaturesDropdown
              open={featuresOpen}
              onClose={() => setFeaturesOpen(false)}
              scrolled={scrolled}
            />
          </div>

          <Link href="/pricing" className={linkClass}>
            Pricing
          </Link>
          <Link href="/integrations" className={linkClass}>
            Integrations
          </Link>
          <Link href="/about" className={linkClass}>
            About
          </Link>
          <Link href="/contact" className={linkClass}>
            Contact
          </Link>
          <button
            onClick={openModal}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              scrolled
                ? 'bg-[#31664A] text-white hover:bg-[#264D38]'
                : 'bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm'
            }`}
          >
            Get Started
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden p-2 transition-colors ${scrolled ? 'text-text-secondary' : 'text-white/80'}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-border/50 shadow-lg max-h-[80vh] overflow-y-auto">
          <nav className="max-w-content mx-auto px-6 py-4 flex flex-col gap-1">
            {/* Features section */}
            <div className="py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-3">
                Features
              </span>
              <FeaturesMenuItems onItemClick={() => setMobileOpen(false)} />
            </div>

            <div className="border-t border-neutral-100 my-2" />

            <Link href="/pricing" className="py-2.5 px-3 text-text-secondary hover:text-brand transition-colors font-medium" onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
            <Link href="/integrations" className="py-2.5 px-3 text-text-secondary hover:text-brand transition-colors font-medium" onClick={() => setMobileOpen(false)}>
              Integrations
            </Link>
            <Link href="/about" className="py-2.5 px-3 text-text-secondary hover:text-brand transition-colors font-medium" onClick={() => setMobileOpen(false)}>
              About
            </Link>
            <Link href="/contact" className="py-2.5 px-3 text-text-secondary hover:text-brand transition-colors font-medium" onClick={() => setMobileOpen(false)}>
              Contact
            </Link>
            <button
              className="mt-2 px-5 py-2.5 rounded-lg bg-[#31664A] text-white font-semibold text-sm hover:bg-[#264D38] transition-colors"
              onClick={() => {
                setMobileOpen(false);
                openModal();
              }}
            >
              Get Started
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
