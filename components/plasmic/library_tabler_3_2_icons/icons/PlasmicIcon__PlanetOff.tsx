/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PlanetOffIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PlanetOffIcon(props: PlanetOffIconProps) {
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
          "M18.816 13.58c1.956 1.825 3.157 3.449 3.184 4.445m-3.428.593c-2.098-.634-4.944-2.03-7.919-3.976-5.47-3.579-9.304-7.664-8.56-9.123.32-.628 1.591-.6 3.294-.113"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M7.042 7.059a7 7 0 009.908 9.89m1.581-2.425A7 7 0 009.474 5.47M3 3l18 18"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PlanetOffIcon;
/* prettier-ignore-end */
