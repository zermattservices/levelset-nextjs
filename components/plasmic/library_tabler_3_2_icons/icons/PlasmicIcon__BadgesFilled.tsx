/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BadgesFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BadgesFilledIcon(props: BadgesFilledIconProps) {
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
          "M16.486 12.143L12 14.833l-4.486-2.69A1 1 0 006 13v4a1 1 0 00.486.857l5 3a1 1 0 001.028 0l5-3A1 1 0 0018 17v-4a1 1 0 00-1.514-.857z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M16.486 3.143L12 5.833l-4.486-2.69A1 1 0 006 4v4a1 1 0 00.486.857l5 3a1 1 0 001.028 0l5-3A1 1 0 0018 8V4a1 1 0 00-1.514-.857z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default BadgesFilledIcon;
/* prettier-ignore-end */
