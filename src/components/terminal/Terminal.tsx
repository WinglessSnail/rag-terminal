import { useEffect, useRef, useState } from 'react';
import Output from './Output';
import Prompt from './Prompt';
import useSessionThreadId from '@/hooks/useSessionThreadId';
import appendLinesUtil from '@/utils/terminal/appendLines';
import sendQueryUtil from '@/utils/terminal/sendQuery';
import runCommandUtil from '@/utils/terminal/runCommand';
import runSetUrlUtil from '@/utils/terminal/runSetUrl';

export default function Terminal() {
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const threadIdRef = useSessionThreadId();
  const [history, setHistory] = useState<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const draftRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const append = (newLines: string[]) => appendLinesUtil(setLines, newLines);

  const sendQuery = async (query: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    await sendQueryUtil(query, threadIdRef.current, controller, append, setIsSending);
  };

  const runCommand = async (cmd: string) => {
    return runCommandUtil(cmd, { append });
  };

  const runSetUrl = async (url: string) => {
    await runSetUrlUtil(url, append);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    const onDocKeyDownCapture = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || (e as any).metaKey;
      if (isCtrlOrMeta && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        e.stopPropagation();
        setLines([]);
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onDocKeyDownCapture, { capture: true });
    return () =>
      document.removeEventListener('keydown', onDocKeyDownCapture, { capture: true } as any);
  }, []);

  const onContainerKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCtrlOrMeta = e.ctrlKey || (e as any).metaKey;
    if (isCtrlOrMeta && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      e.stopPropagation();
      setLines([]);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="h-full p-0" onKeyDownCapture={onContainerKeyDownCapture}>
      <Output
        lines={lines}
        onContainerClick={() => {
          inputRef.current?.focus();
        }}
        ref={bottomRef as any}
      >
        <Prompt
          value={input}
          placeholder={
            isSending ? 'Working… (Ctrl+C to cancel)' : 'Type and press Enter (Ctrl+L to clear)'
          }
          disabled={false}
          onChange={setInput}
          onKeyDown={async e => {
            const isCtrlOrMeta = e.ctrlKey || (e as any).metaKey;
            const key = e.key.toLowerCase();
            if (key === 'l' && isCtrlOrMeta) {
              e.preventDefault();
              setLines([]);
              return;
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              const trimmed = input.trim();
              if (!trimmed || isSending) return;

              if (/^(clear|cls)$/i.test(trimmed)) {
                setLines([]);
                setHistory(prev => (prev[prev.length - 1] === trimmed ? prev : [...prev, trimmed]));
                historyIndexRef.current = -1;
                draftRef.current = '';
                setInput('');
                return;
              }

              const didRun = await runCommand(trimmed);
              if (!didRun) {
                const m = trimmed.match(/^seturl\((.*)\)$/i);
                if (m) {
                  const arg = m[1].trim().replace(/^['"]|['"]$/g, '');
                  if (arg) await runSetUrl(arg);
                } else {
                  void sendQuery(trimmed);
                }
              }
              setHistory(prev => (prev[prev.length - 1] === trimmed ? prev : [...prev, trimmed]));
              historyIndexRef.current = -1;
              draftRef.current = '';
              setInput('');
            } else if (key === 'c' && isCtrlOrMeta) {
              if (isSending) {
                e.preventDefault();
                if (abortRef.current) abortRef.current.abort();
                append(['^C']);
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (history.length === 0) return;
              if (historyIndexRef.current === -1) {
                draftRef.current = input;
                historyIndexRef.current = history.length - 1;
              } else if (historyIndexRef.current > 0) {
                historyIndexRef.current -= 1;
              }
              const nextVal = history[historyIndexRef.current] ?? draftRef.current;
              setInput(nextVal);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (history.length === 0) return;
              if (historyIndexRef.current === -1) return;
              if (historyIndexRef.current < history.length - 1) {
                historyIndexRef.current += 1;
                setInput(history[historyIndexRef.current]);
              } else {
                historyIndexRef.current = -1;
                setInput(draftRef.current);
              }
            }
          }}
          inputRef={inputRef}
        />
      </Output>
    </div>
  );
}
