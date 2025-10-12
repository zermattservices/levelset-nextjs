/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HexagonNumber8FilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HexagonNumber8FilledIcon(props: HexagonNumber8FilledIconProps) {
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
          "M10.425 1.414a3.33 3.33 0 013.216 0l6.775 3.995c.067.04.127.084.18.133l.008.007.107.076a3.222 3.222 0 011.284 2.39l.005.203v7.284c0 1.175-.643 2.256-1.623 2.793l-6.804 4.302c-.98.538-2.166.538-3.2-.032l-6.695-4.237A3.225 3.225 0 012 15.502V8.217a3.21 3.21 0 011.65-2.808l6.775-3.995zM13 7h-2l-.15.005a2 2 0 00-1.844 1.838L9 9v2l.005.15c.018.236.077.46.17.667l.075.152.018.03-.018.032c-.133.24-.218.509-.243.795L9 13v2l.005.15a2 2 0 001.838 1.844L11 17h2l.15-.005a2 2 0 001.844-1.838L15 15v-2l-.005-.15a1.99 1.99 0 00-.17-.667l-.075-.152-.019-.032.02-.03c.135-.245.218-.516.242-.795L15 11V9l-.005-.15a2 2 0 00-1.838-1.844L13 7zm0 6v2h-2v-2h2zm0-4v2h-2V9h2z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default HexagonNumber8FilledIcon;
/* prettier-ignore-end */
