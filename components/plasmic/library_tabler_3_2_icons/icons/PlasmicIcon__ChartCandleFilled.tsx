/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChartCandleFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChartCandleFilledIcon(props: ChartCandleFilledIconProps) {
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
          "M6 3a1 1 0 01.993.883L7 4v1a2 2 0 011.995 1.85L9 7v3a2 2 0 01-1.85 1.995L7 12v8a1 1 0 01-1.993.117L5 20v-8a2 2 0 01-1.995-1.85L3 10V7a2 2 0 011.85-1.995L5 5V4a1 1 0 011-1zm6 0a1 1 0 01.993.883L13 4v9a2 2 0 011.995 1.85L15 15v3a2 2 0 01-1.85 1.995L13 20a1 1 0 01-1.993.117L11 20l-.15-.005a2 2 0 01-1.844-1.838L9 18v-3a2 2 0 011.85-1.995L11 13V4a1 1 0 011-1zm6 0a1 1 0 01.993.883L19 4a2 2 0 011.995 1.85L21 6v4a2 2 0 01-1.85 1.995L19 12v8a1 1 0 01-1.993.117L17 20v-8a2 2 0 01-1.995-1.85L15 10V6a2 2 0 011.85-1.995L17 4a1 1 0 011-1z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ChartCandleFilledIcon;
/* prettier-ignore-end */
