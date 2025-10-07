import React, { forwardRef, PropsWithChildren } from 'react';

export interface OutputProps {
  lines: string[];
  onContainerClick?: () => void;
}

export const Output = forwardRef<HTMLDivElement, PropsWithChildren<OutputProps>>(function Output(
  { lines, onContainerClick, children },
  ref
) {
  return (
    <div
      className="rounded-none crt crt-flicker text-green-400 p-3 text-sm font-mono h-full overflow-auto border-0"
      onClick={onContainerClick}
    >
      {lines.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-words crt-glow glow-text">
          {l}
        </div>
      ))}
      {children}
      <div ref={ref} />
    </div>
  );
});

export default Output;
