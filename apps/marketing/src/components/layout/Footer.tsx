import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a] text-white/70">
      <div className="max-w-content mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Image
              src="/logos/Levelset White no margin.png"
              alt="Levelset"
              width={140}
              height={34}
              className="h-8 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed max-w-sm">
              Positional ratings, discipline tracking, and complete team management
              — built exclusively for Chick-fil-A operators.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-medium text-sm mb-4 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/#about" className="text-sm hover:text-white transition-colors duration-200">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white transition-colors duration-200">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium text-sm mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-white transition-colors duration-200">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {currentYear} Levelset. All rights reserved.
          </p>
          <p className="text-xs text-white/40">
            Built for operators, by operators.
          </p>
        </div>
      </div>
    </footer>
  );
}
