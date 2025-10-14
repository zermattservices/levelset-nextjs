/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type User022IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function User022Icon(props: User022IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 48 48"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"3"}
        d={
          "M24 30c-6.34 0-11.978 3.061-15.568 7.812-.773 1.022-1.159 1.534-1.146 2.225.01.533.345 1.207.765 1.536.543.427 1.297.427 2.803.427h26.291c1.507 0 2.26 0 2.804-.427.42-.33.756-1.003.765-1.536.013-.691-.373-1.203-1.146-2.225C35.978 33.062 30.34 30 24 30m0-6a9 9 0 1 0 0-18 9 9 0 0 0 0 18"
        }
      ></path>
    </svg>
  );
}

export default User022Icon;
/* prettier-ignore-end */
