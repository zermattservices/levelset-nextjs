import * as React from 'react';
import Link from 'next/link';
import sty from './LevelsetButton.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';

type ColorVariant = 
  | 'blue' 
  | 'green' 
  | 'brand' 
  | 'red' 
  | 'sand' 
  | 'white' 
  | 'softBlue' 
  | 'softGreen' 
  | 'softYellow' 
  | 'softRed' 
  | 'softSand' 
  | 'clear' 
  | 'brandOutline';

type SizeVariant = 'compact' | 'minimal';
type ShapeVariant = 'rounded' | 'round' | 'sharp';

export interface LevelsetButtonProps {
  className?: string;
  children?: React.ReactNode;
  color?: ColorVariant;
  size?: SizeVariant;
  shape?: ShapeVariant;
  isDisabled?: boolean;
  showStartIcon?: boolean;
  showEndIcon?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  link?: string;
  submitsForm?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function LevelsetButton({
  className,
  children,
  color,
  size,
  shape,
  isDisabled,
  showStartIcon,
  showEndIcon,
  startIcon,
  endIcon,
  link,
  submitsForm,
  onClick,
}: LevelsetButtonProps) {
  
  const rootClasses = classNames(
    projectcss.all,
    projectcss.button,
    projectcss.root_reset,
    projectcss.plasmic_default_styles,
    projectcss.plasmic_mixins,
    projectcss.plasmic_tokens,
    sty.root,
    color === 'blue' && sty.rootcolor_blue,
    color === 'green' && sty.rootcolor_green,
    color === 'brand' && sty.rootcolor_brand,
    color === 'red' && sty.rootcolor_red,
    color === 'sand' && sty.rootcolor_sand,
    color === 'white' && sty.rootcolor_white,
    color === 'softBlue' && sty.rootcolor_softBlue,
    color === 'softGreen' && sty.rootcolor_softGreen,
    color === 'softYellow' && sty.rootcolor_softYellow,
    color === 'softRed' && sty.rootcolor_softRed,
    color === 'softSand' && sty.rootcolor_softSand,
    color === 'clear' && sty.rootcolor_clear,
    color === 'brandOutline' && sty.rootcolor_brandOutline,
    size === 'compact' && sty.rootsize_compact,
    size === 'minimal' && sty.rootsize_minimal,
    shape === 'rounded' && sty.rootshape_rounded,
    shape === 'round' && sty.rootshape_round,
    shape === 'sharp' && sty.rootshape_sharp,
    isDisabled && sty.rootisDisabled,
    showStartIcon && sty.rootshowStartIcon,
    showEndIcon && sty.rootshowEndIcon,
    className
  );

  const contentClasses = classNames(
    projectcss.all,
    sty.contentContainer
  );

  const childrenClasses = classNames(
    sty.slotTargetChildren,
    color === 'blue' && sty.slotTargetChildrencolor_blue,
    color === 'green' && sty.slotTargetChildrencolor_green,
    color === 'brand' && sty.slotTargetChildrencolor_brand,
    color === 'red' && sty.slotTargetChildrencolor_red,
    color === 'sand' && sty.slotTargetChildrencolor_sand,
    color === 'white' && sty.slotTargetChildrencolor_white,
    color === 'softBlue' && sty.slotTargetChildrencolor_softBlue,
    color === 'softGreen' && sty.slotTargetChildrencolor_softGreen,
    color === 'softYellow' && sty.slotTargetChildrencolor_softYellow,
    color === 'softRed' && sty.slotTargetChildrencolor_softRed,
    color === 'softSand' && sty.slotTargetChildrencolor_softSand,
    color === 'clear' && sty.slotTargetChildrencolor_clear,
    color === 'brandOutline' && sty.slotTargetChildrencolor_brandOutline
  );

  const content = (
    <>
      {showStartIcon && startIcon && (
        <div className={classNames(projectcss.all, sty.startIconContainer, sty.startIconContainershowStartIcon)}>
          {startIcon}
        </div>
      )}
      <div className={contentClasses}>
        <span className={childrenClasses}>
          {children}
        </span>
      </div>
      {showEndIcon && endIcon && (
        <div className={classNames(projectcss.all, sty.endIconContainer, sty.endIconContainershowEndIcon)}>
          {endIcon}
        </div>
      )}
    </>
  );

  // If link is provided, render as anchor
  if (link) {
    return (
      <Link href={link} className={rootClasses} onClick={onClick}>
        {content}
      </Link>
    );
  }

  // Otherwise render as button
  return (
    <button
      className={rootClasses}
      disabled={isDisabled}
      type={submitsForm ? 'submit' : 'button'}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export default LevelsetButton;
