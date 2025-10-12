/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MoodAnnoyedIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MoodAnnoyedIcon(props: MoodAnnoyedIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M12 21a9 9 0 110-18 9 9 0 010 18zm3-7c-2 0-3 1-3.5 2.05M9 10h-.01M15 10h-.01"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default MoodAnnoyedIcon;
/* prettier-ignore-end */
