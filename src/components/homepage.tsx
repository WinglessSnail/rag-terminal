'use client';

import Terminal from './terminal/Terminal';

export default function Homepage() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-5xl flex justify-center pt-8">
        <div className="w-[80vmin] h-[65vmin] border border-green-700 rounded-md shadow-lg bg-black/40 crt-faceplate screen-curvature bulge-effect retro-display convex-glass">
          <Terminal />
        </div>
      </div>
    </div>
  );
}
