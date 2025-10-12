/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BrandGolangIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BrandGolangIcon(props: BrandGolangIconProps) {
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
          "M15.695 14.305c1.061 1.06 2.953.888 4.226-.384 1.272-1.273 1.444-3.165.384-4.226-1.061-1.06-2.953-.888-4.226.384-1.272 1.273-1.444 3.165-.384 4.226zM12.68 9.233c-1.084-.497-2.545-.191-3.591.846-1.284 1.273-1.457 3.165-.388 4.226 1.07 1.06 2.978.888 4.261-.384A3.67 3.67 0 0014 12h-2.427M5.5 15H4m2-6H4m1 3H2"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BrandGolangIcon;
/* prettier-ignore-end */
