interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
  /** Render on a dark background (adjusts frame color) */
  dark?: boolean;
}

/**
 * iPhone 15-style phone frame rendered entirely in CSS.
 *
 * Aspect ratio:  The inner viewport is 9:19.5 (iPhone 14/15 proportions).
 *                Wrap a screenshot captured at 1170×2532 (or any 9:19.5 image)
 *                and it will fill perfectly.
 *
 * Usage:
 *   <PhoneMockup>
 *     <img src="/screenshots/mobile-chat.png" alt="..." className="w-full h-auto" />
 *   </PhoneMockup>
 */
export function PhoneMockup({ children, className = '', dark = false }: PhoneMockupProps) {
  const frameColor = dark ? '#1a1a1a' : '#1a1a1a';
  const frameBorder = dark ? 'border-neutral-700/50' : 'border-neutral-300/80';

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div
        className={`relative rounded-[3rem] border-[6px] ${frameBorder} shadow-2xl shadow-black/15`}
        style={{
          backgroundColor: frameColor,
          padding: '14px 6px',
          width: '280px',
        }}
      >
        {/* Dynamic Island */}
        <div
          className="absolute top-[10px] left-1/2 -translate-x-1/2 z-10"
          style={{
            width: '84px',
            height: '22px',
            borderRadius: '100px',
            backgroundColor: frameColor,
          }}
        />

        {/* Screen viewport — 9:19.5 aspect ratio */}
        <div
          className="relative overflow-hidden bg-white"
          style={{
            borderRadius: '2.25rem',
            aspectRatio: '9 / 19.5',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Multi-phone layout ───────────────────────────────────────────── */

interface PhoneGalleryProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Lays out 1–3 PhoneMockup instances side-by-side with slight overlap
 * and staggered vertical offset for visual interest.
 */
export function PhoneGallery({ children, className = '' }: PhoneGalleryProps) {
  return (
    <div className={`flex items-center justify-center gap-[-20px] ${className}`}>
      {children}
    </div>
  );
}
