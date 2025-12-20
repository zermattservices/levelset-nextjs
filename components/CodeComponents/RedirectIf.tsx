import React from 'react';

export interface RedirectIfProps {
  children?: React.ReactNode;
  className?: string;
  condition?: boolean;
  onFalse?: () => void;
}

export function RedirectIf(props: RedirectIfProps) {
  const { children, className, onFalse, condition } = props;

  React.useEffect(() => {
    if (!onFalse || condition) {
      return;
    }
    onFalse();
  }, [condition, onFalse]);

  // Validation
  if (typeof condition === 'undefined') {
    return (
      <p>
        Condition needs to be a boolean prop. Try to add exclamation marks to
        the value.
      </p>
    );
  }

  return <div className={className}>{children}</div>;
}
