'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type PrototypeViewerProps = {
  title: string;
  tagline: string;
  embedPath: string;
};

export function PrototypeViewer({ title, tagline, embedPath }: PrototypeViewerProps) {
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameWrapRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      frameWrapRef.current?.requestFullscreen();
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* Header strip — orange eyebrow, title, back link, in the
          site's design language. */}
      <header className="shrink-0 bg-bg-elevated border-b border-brand">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-1">
              פרוטוטייפ · {tagline}
            </div>
            <h1 className="font-display font-bold text-lg sm:text-xl text-accent-hover leading-tight">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center px-4 py-2 rounded-md font-medium text-sm border border-accent/40 text-accent-hover hover:bg-accent/10 transition-colors"
            >
              {isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
            </button>
            <Link
              href="/#prototypes"
              className="inline-flex items-center px-4 py-2 rounded-md font-medium text-sm border border-accent/40 text-accent-hover hover:bg-accent/10 transition-colors"
            >
              חזרה לעמוד הבית
            </Link>
          </div>
        </div>
      </header>

      {/* The prototype itself — fills the entire remaining viewport
          below the header, edge to edge, so the simulator reads as a
          full-screen rectangular canvas. */}
      <div ref={frameWrapRef} className="flex-1 min-h-0 bg-black">
        <iframe
          src={embedPath}
          title={title}
          className="block w-full h-full border-0"
          allow="fullscreen; accelerometer; gyroscope"
        />
      </div>
    </div>
  );
}
