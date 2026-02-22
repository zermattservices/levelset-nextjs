'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          <Link
            href="/#about"
            className={`text-sm font-medium transition-colors duration-200 ${
              scrolled ? 'text-text-secondary hover:text-brand' : 'text-white/70 hover:text-white'
            }`}
          >
            About
          </Link>
          <Link
            href="/#faq"
            className={`text-sm font-medium transition-colors duration-200 ${
              scrolled ? 'text-text-secondary hover:text-brand' : 'text-white/70 hover:text-white'
            }`}
          >
            FAQ
          </Link>
          <Link
            href="/contact"
            className={`text-sm font-medium transition-colors duration-200 ${
              scrolled ? 'text-text-secondary hover:text-brand' : 'text-white/70 hover:text-white'
            }`}
          >
            Contact
          </Link>
          <button
            onClick={() => {
              const el = document.getElementById('waitlist');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.location.href = '/#waitlist';
              }
            }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              scrolled
                ? 'bg-[#31664A] text-white hover:bg-[#264D38]'
                : 'bg-white/15 text-white border border-white/25 hover:bg-white/25 backdrop-blur-sm'
            }`}
          >
            Join Waitlist
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
        <div className="md:hidden bg-white border-t border-neutral-border/50 shadow-lg">
          <nav className="max-w-content mx-auto px-6 py-4 flex flex-col gap-3">
            <Link href="/#about" className="py-2 text-text-secondary hover:text-brand transition-colors" onClick={() => setMobileOpen(false)}>
              About
            </Link>
            <Link href="/#faq" className="py-2 text-text-secondary hover:text-brand transition-colors" onClick={() => setMobileOpen(false)}>
              FAQ
            </Link>
            <Link href="/contact" className="py-2 text-text-secondary hover:text-brand transition-colors" onClick={() => setMobileOpen(false)}>
              Contact
            </Link>
            <button
              className="mt-2 px-5 py-2.5 rounded-lg bg-[#31664A] text-white font-semibold text-sm hover:bg-[#264D38] transition-colors"
              onClick={() => {
                setMobileOpen(false);
                const el = document.getElementById('waitlist');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.location.href = '/#waitlist';
                }
              }}
            >
              Join Waitlist
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
