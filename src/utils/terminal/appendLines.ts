import { Dispatch, SetStateAction } from 'react';

export function appendLines(setLines: Dispatch<SetStateAction<string[]>>, newLines: string[]) {
  if (!newLines || newLines.length === 0) return;
  setLines(prev => [...prev, ...newLines]);
}

export default appendLines;
