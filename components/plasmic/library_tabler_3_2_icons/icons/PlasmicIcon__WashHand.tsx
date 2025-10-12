/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WashHandIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WashHandIcon(props: WashHandIconProps) {
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
          "M3.486 8.965c.168.02.34.033.514.035.79.009 1.539-.178 2-.5.426-.296.777-.5 1.5-.5h1M16 8l.615.034c.552.067 1.046.23 1.385.466.461.322 1.21.509 2 .5.17 0 .339-.014.503-.034M14 10.5l.586.578a1.516 1.516 0 002 0c.476-.433.55-1.112.176-1.622L15 7c-.37-.506-1.331-1-2-1H9.883a1 1 0 00-.992.876l-.499 3.986A3.857 3.857 0 0011 15a2.28 2.28 0 003-2.162V10.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M3 6l1.721 10.329A2 2 0 006.694 18h10.612a2 2 0 001.973-1.671L21 6"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WashHandIcon;
/* prettier-ignore-end */
