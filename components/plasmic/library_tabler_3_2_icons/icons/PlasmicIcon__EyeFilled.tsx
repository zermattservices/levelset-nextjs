/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type EyeFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeFilledIcon(props: EyeFilledIconProps) {
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
          "M12 4c4.29 0 7.863 2.429 10.665 7.154l.22.379.045.1.03.083.014.055.014.082.011.1v.11l-.014.111a.987.987 0 01-.026.11l-.039.108-.036.075-.016.03c-2.764 4.836-6.3 7.38-10.555 7.499L12 20c-4.396 0-8.037-2.549-10.868-7.504a1 1 0 010-.992C3.963 6.549 7.604 4 12 4zm0 5a3 3 0 100 6 3 3 0 000-6z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default EyeFilledIcon;
/* prettier-ignore-end */
