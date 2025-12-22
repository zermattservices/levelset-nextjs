import * as React from 'react';
import Link from 'next/link';
import sty from './DashboardSubmenu.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { LevelsetButton } from '../LevelsetButton/LevelsetButton';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface DashboardSubmenuProps {
  className?: string;
}

export function DashboardSubmenu({ className }: DashboardSubmenuProps) {
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
      <div className={classNames(projectcss.all, sty.freeBox__lx5Gj)}>
        <div className={classNames(projectcss.all, sty.freeBox___5Vowa)}>
          {/* Pathway - disabled */}
          <LevelsetButton
            className={sty.levelsetButton__ouwyl}
            color="softSand"
            isDisabled={true}
            size="compact"
          >
            <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__akSkk)}>
              Pathway
            </div>
          </LevelsetButton>

          {/* Positional Excellence - active link */}
          <LevelsetButton
            className={sty.levelsetButton__fzAcG}
            color="clear"
            link="/positional-excellence"
            size="compact"
          >
            <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__i5EJo)}>
              Positional Excellence
            </div>
          </LevelsetButton>

          {/* Evaluations - disabled */}
          <LevelsetButton
            className={sty.levelsetButton__elre}
            color="softSand"
            isDisabled={true}
            size="compact"
          >
            <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__vkIxh)}>
              Evaluations
            </div>
          </LevelsetButton>

          {/* Discipline - active link */}
          <LevelsetButton
            className={sty.levelsetButton__tGzU}
            color="clear"
            link="/discipline"
            size="compact"
          >
            <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__tyFVx)}>
              Discipline
            </div>
          </LevelsetButton>

          {/* WHED - disabled */}
          <LevelsetButton
            className={sty.levelsetButton___3Cma9}
            color="softSand"
            isDisabled={true}
            size="compact"
          >
            <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__b1N0E)}>
              WHED
            </div>
          </LevelsetButton>

          {/* 360° Overview - disabled */}
          <LevelsetButton
            className={sty.levelsetButton__flfMl}
            color="softSand"
            isDisabled={true}
            size="compact"
          >
            <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__rin15)}>
              360°&nbsp;Overview
            </div>
          </LevelsetButton>
        </div>
      </div>
    </div>
  );
}

export default DashboardSubmenu;
