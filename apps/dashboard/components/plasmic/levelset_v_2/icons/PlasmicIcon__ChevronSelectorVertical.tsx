/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChevronSelectorVerticalIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChevronSelectorVerticalIcon(
  props: ChevronSelectorVerticalIconProps
) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.67"}
        d={"M5.833 12.5 10 16.667l4.167-4.167m-8.334-5L10 3.333 14.167 7.5"}
      ></path>
    </svg>
  );
}

export default ChevronSelectorVerticalIcon;
/* prettier-ignore-end */
