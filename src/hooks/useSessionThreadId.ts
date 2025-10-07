import { useEffect, useRef } from 'react';

export default function useSessionThreadId() {
  const threadIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const key = 'thread_id';
      const existing = window.localStorage.getItem(key);
      if (existing) {
        threadIdRef.current = existing;
      } else {
        const id = (globalThis.crypto?.randomUUID?.() ||
          Math.random().toString(36).slice(2)) as string;
        window.localStorage.setItem(key, id);
        threadIdRef.current = id;
      }
    } catch {}
  }, []);

  return threadIdRef;
}
