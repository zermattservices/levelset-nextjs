/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BrandTopbuzzIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BrandTopbuzzIcon(props: BrandTopbuzzIconProps) {
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
          "M4.417 8.655a.524.524 0 01-.405-.622l.986-4.617a.524.524 0 01.626-.404l14.958 3.162c.285.06.467.339.406.622l-.987 4.618a.523.523 0 01-.625.404l-4.345-.92c-.198-.04-.315.024-.353.197l-2.028 9.49a.527.527 0 01-.625.404l-4.642-.982a.527.527 0 01-.406-.622l2.028-9.493c.037-.17-.031-.274-.204-.31l-4.384-.927z"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BrandTopbuzzIcon;
/* prettier-ignore-end */
