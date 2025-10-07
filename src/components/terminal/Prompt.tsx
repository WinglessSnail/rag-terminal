import React, { useEffect, useRef } from 'react';

export interface PromptProps {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function Prompt({
  value,
  placeholder,
  disabled,
  onChange,
  onKeyDown,
  inputRef,
}: PromptProps) {
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const ghostRef = useRef<HTMLSpanElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const effectiveInputRef = inputRef ?? internalInputRef;

  const updateCursorPos = () => {
    if (!ghostRef.current || !cursorRef.current) return;
    const caretIndex = effectiveInputRef.current?.selectionStart ?? (value ? value.length : 0);
    ghostRef.current.textContent = (value || '').slice(0, Math.max(0, caretIndex));
    const width = ghostRef.current.offsetWidth;
    cursorRef.current.style.transform = `translateX(${width}px)`;
  };

  useEffect(() => {
    updateCursorPos();
  }, [value]);

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-green-500 select-none">&gt;</span>
      <div className="relative flex-1">
        <input
          ref={effectiveInputRef}
          className="w-full bg-transparent outline-none border-none text-green-400 placeholder-green-700/60 caret-hidden z-10"
          placeholder={placeholder}
          value={value}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
          data-enable-grammarly="false"
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            onKeyDown(e);
            setTimeout(updateCursorPos, 0);
          }}
          onKeyUp={updateCursorPos}
          onClick={updateCursorPos}
          onSelect={updateCursorPos}
          onFocus={updateCursorPos}
          disabled={disabled}
          autoFocus
        />
        <span
          ref={ghostRef}
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 left-0 invisible whitespace-pre font-mono text-sm pointer-events-none"
        />
        <div
          ref={cursorRef}
          className="cursor-block absolute top-1/2 -translate-y-1/2 left-0 pointer-events-none"
          style={{ transform: 'translateX(0)' }}
        />
      </div>
    </div>
  );
}
