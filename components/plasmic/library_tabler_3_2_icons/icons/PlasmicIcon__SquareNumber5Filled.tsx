/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SquareNumber5FilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareNumber5FilledIcon(props: SquareNumber5FilledIconProps) {
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
          "M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005.195v12.666c0 1.96-1.537 3.56-3.472 3.662l-.195.005H5.667a3.667 3.667 0 01-3.662-3.472L2 18.333V5.667c0-1.96 1.537-3.56 3.472-3.662L5.667 2h12.666zM14 7h-4a1 1 0 00-.993.883L9 8v4a1 1 0 00.883.993L10 13h3v2h-2l-.007-.117A1 1 0 009 15a2 2 0 001.85 1.995L11 17h2a2 2 0 001.995-1.85L15 15v-2a2 2 0 00-1.85-1.995L13 11h-2V9h3a1 1 0 00.993-.883L15 8a1 1 0 00-.883-.993L14 7z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SquareNumber5FilledIcon;
/* prettier-ignore-end */
