/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type KeyframeAlignCenterFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function KeyframeAlignCenterFilledIcon(
  props: KeyframeAlignCenterFilledIconProps
) {
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
          "M12 19a1 1 0 01.993.883L13 20v2a1 1 0 01-1.993.117L11 22v-2a1 1 0 011-1zm0-13c-.629 0-1.214.301-1.606.807l-2.908 3.748a2.395 2.395 0 00-.011 2.876l2.919 3.762c.39.505.977.807 1.606.807.629 0 1.214-.301 1.606-.807l2.908-3.748a2.395 2.395 0 00.011-2.876l-2.919-3.762A2.032 2.032 0 0012 6zm0-5a1 1 0 01.993.883L13 2v2a1 1 0 01-1.993.117L11 4V2a1 1 0 011-1zM5 11a1 1 0 01.117 1.993L5 13H3a1 1 0 01-.117-1.993L3 11h2zm16 0a1 1 0 01.117 1.993L21 13h-2a1 1 0 01-.117-1.993L19 11h2z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default KeyframeAlignCenterFilledIcon;
/* prettier-ignore-end */
