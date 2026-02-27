interface BrowserMockupProps {
  children: React.ReactNode;
  url?: string;
  className?: string;
}

export function BrowserMockup({
  children,
  url = 'app.levelset.io',
  className = '',
}: BrowserMockupProps) {
  return (
    <div
      className={`
        rounded-xl overflow-hidden
        border border-gray-200/80
        shadow-xl shadow-black/8
        ${className}
      `}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#f8f9fa] border-b border-gray-200/80">
        {/* Traffic light dots */}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>

        {/* Address bar */}
        <div className="flex-1 flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-md bg-white border border-gray-200/80 text-xs text-gray-400 select-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={10}
              height={10}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-300"
              aria-hidden="true"
            >
              <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{url}</span>
          </div>
        </div>

        {/* Spacer to balance the dots */}
        <div className="w-[52px]" />
      </div>

      {/* Content area */}
      <div className="bg-white">{children}</div>
    </div>
  );
}
