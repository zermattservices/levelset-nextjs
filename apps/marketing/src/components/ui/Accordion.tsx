'use client';

import { useState } from 'react';

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="border border-neutral-border rounded-xl overflow-hidden transition-all duration-200 hover:border-brand/30 bg-white"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between px-6 py-5 text-left bg-white hover:bg-neutral-foreground/50 transition-colors duration-200"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-text-primary pr-4">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 text-muted flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="mx-6 mb-5 pt-4 border-t border-neutral-border/60 text-text-secondary text-[15px] leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
