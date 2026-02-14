import * as React from "react";
import {
  PlasmicLevelsetButton,
  DefaultLevelsetButtonProps
} from "./plasmic/levelset_tabs/PlasmicLevelsetButton";

import {
  ButtonRef,
  HtmlAnchorOnlyProps,
  HtmlButtonOnlyProps
} from "@plasmicapp/react-web";

export interface LevelsetButtonProps extends DefaultLevelsetButtonProps {
  // Feel free to add any additional props that this component should receive
}
function LevelsetButton_(props: LevelsetButtonProps, ref: ButtonRef) {
  const { plasmicProps } =
    PlasmicLevelsetButton.useBehavior<LevelsetButtonProps>(props, ref);
  return <PlasmicLevelsetButton {...plasmicProps} />;
}

export type ButtonComponentType = {
  (
    props: Omit<LevelsetButtonProps, HtmlAnchorOnlyProps> & {
      ref?: React.Ref<HTMLButtonElement>;
    }
  ): React.ReactElement;
  (
    props: Omit<LevelsetButtonProps, HtmlButtonOnlyProps> & {
      ref?: React.Ref<HTMLAnchorElement>;
    }
  ): React.ReactElement;
};
const LevelsetButton = React.forwardRef(
  LevelsetButton_
) as any as ButtonComponentType;

export default Object.assign(LevelsetButton, { __plumeType: "button" });
