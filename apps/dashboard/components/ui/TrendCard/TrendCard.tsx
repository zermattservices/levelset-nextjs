import * as React from 'react';
import sty from './TrendCard.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Inline arrow icons to avoid Plasmic dependency
function ArrowUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
      height="1em"
      className={classNames("plasmic-default__svg", className)}
      style={style}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M10 15.833V4.167m0 0L4.167 10M10 4.167 15.833 10"
      />
    </svg>
  );
}

function ArrowDownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
      height="1em"
      className={classNames("plasmic-default__svg", className)}
      style={style}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M10 4.167v11.666m0 0L15.833 10M10 15.833 4.167 10"
      />
    </svg>
  );
}

export interface TrendCardProps {
  className?: string;
  text3?: React.ReactNode;
  value?: string;
  negative?: boolean | 'negative';
}

export function TrendCard({ className, text3, value, negative }: TrendCardProps) {
  const isNegative = negative === true || negative === 'negative';

  return (
    <div
      className={classNames(
        projectcss.all,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        sty.root,
        className
      )}
    >
      <div className={classNames(projectcss.all, sty.change, isNegative && sty.changenegative)}>
        <ArrowUpIcon
          className={classNames(
            projectcss.all,
            sty.svg___1K5Ie,
            isNegative && sty.svgnegative___1K5IeBpiLs
          )}
        />
        <ArrowDownIcon
          className={classNames(
            projectcss.all,
            sty.svg__t2LFa,
            isNegative && sty.svgnegative__t2LFaBpiLs
          )}
        />
        <span className={classNames(sty.slotTargetText3, isNegative && sty.slotTargetText3negative)}>
          {text3 ?? value ?? '0'}
        </span>
        <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text, isNegative && sty.textnegative)}>
          %
        </div>
      </div>
    </div>
  );
}

export default TrendCard;
