/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UserLevelsetSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UserLevelsetSvgIcon(props: UserLevelsetSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 38 40"}
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
          "M19 26c-6.34 0-11.978 3.061-15.568 7.812-.773 1.022-1.159 1.534-1.146 2.225.01.533.345 1.207.765 1.536C3.594 38 4.348 38 5.854 38h26.291c1.507 0 2.26 0 2.804-.427.42-.33.755-1.003.765-1.536.013-.691-.373-1.203-1.146-2.225C30.978 29.062 25.34 26 19 26m0-6a9 9 0 1 0 0-18 9 9 0 0 0 0 18"
        }
      ></path>
    </svg>
  );
}

export default UserLevelsetSvgIcon;
/* prettier-ignore-end */
