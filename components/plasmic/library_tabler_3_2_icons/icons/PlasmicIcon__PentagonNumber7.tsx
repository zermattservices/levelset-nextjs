/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PentagonNumber7IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PentagonNumber7Icon(props: PentagonNumber7IconProps) {
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
          "M13.163 2.168l8.021 5.828c.694.504.984 1.397.719 2.212l-3.064 9.43a1.978 1.978 0 01-1.881 1.367H7.042a1.978 1.978 0 01-1.881-1.367l-3.064-9.43a1.978 1.978 0 01.719-2.212l8.021-5.828a1.978 1.978 0 012.326 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M10 8h4l-2 8"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PentagonNumber7Icon;
/* prettier-ignore-end */
