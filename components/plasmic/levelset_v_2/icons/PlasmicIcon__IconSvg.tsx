/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type IconSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function IconSvgIcon(props: IconSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 40 43"}
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
          "M20.285 28c-6.827 0-12.9 3.316-16.765 8.463-.832 1.108-1.248 1.661-1.234 2.41.01.578.371 1.308.824 1.665C3.695 41 4.506 41 6.129 41h28.313c1.623 0 2.434 0 3.02-.462.452-.357.813-1.087.823-1.665.014-.749-.402-1.302-1.234-2.41C33.185 31.316 27.113 28 20.285 28m0-6.5c5.353 0 9.693-4.365 9.693-9.75S25.638 2 20.285 2s-9.692 4.365-9.692 9.75 4.34 9.75 9.692 9.75"
        }
      ></path>
    </svg>
  );
}

export default IconSvgIcon;
/* prettier-ignore-end */
