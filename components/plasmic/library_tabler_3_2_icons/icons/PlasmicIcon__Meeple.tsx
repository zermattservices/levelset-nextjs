/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MeepleIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MeepleIcon(props: MeepleIconProps) {
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
          "M9 20H4a1 1 0 01-1-1c0-2 3.378-4.907 4-6-1 0-4-.5-4-2 0-2 4-3.5 6-4 0-1.5.5-4 3-4s3 2.5 3 4c2 .5 6 2 6 4 0 1.5-3 2-4 2 .622 1.093 4 4 4 6a1 1 0 01-1 1h-5c-1 0-2-4-3-4s-2 4-3 4z"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default MeepleIcon;
/* prettier-ignore-end */
