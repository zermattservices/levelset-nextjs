/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DiscOffIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DiscOffIcon(props: DiscOffIconProps) {
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
          "M20.044 16.04A9 9 0 007.962 3.955M5.629 5.643A9 9 0 0012 21c2.491 0 4.73-1 6.36-2.631m-7.062-7.081a1 1 0 101.402 1.427"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M7 12c0-1.38.559-2.629 1.462-3.534m2.607-1.38C11.371 7.03 11.682 7 12 7m0 10a4.987 4.987 0 003.551-1.48m1.362-2.587c.057-.302.087-.614.087-.933M3 3l18 18"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DiscOffIcon;
/* prettier-ignore-end */
