/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DatabaseOffIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DatabaseOffIcon(props: DatabaseOffIconProps) {
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
          "M12.983 8.978C16.938 8.796 20 7.532 20 6c0-1.657-3.582-3-8-3-1.661 0-3.204.19-4.483.515M4.734 4.743C4.263 5.125 4 5.551 4 6c0 1.22 1.944 2.271 4.734 2.74"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4 6v6c0 1.657 3.582 3 8 3 .986 0 1.93-.067 2.802-.19m3.187-.82C19.24 13.46 20 12.762 20 12V6"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4 12v6c0 1.657 3.582 3 8 3 3.217 0 5.991-.712 7.261-1.74M20 16v-4M3 3l18 18"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DatabaseOffIcon;
/* prettier-ignore-end */
