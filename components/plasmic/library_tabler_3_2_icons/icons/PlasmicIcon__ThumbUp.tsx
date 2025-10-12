/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ThumbUpIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ThumbUpIcon(props: ThumbUpIconProps) {
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
          "M7 11v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0a4 4 0 004-4V6a2 2 0 114 0v5h3a2 2 0 012 2l-1 5c-.144.613-.417 1.14-.777 1.501-.361.36-.79.536-1.223.499h-7a3 3 0 01-3-3"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ThumbUpIcon;
/* prettier-ignore-end */
