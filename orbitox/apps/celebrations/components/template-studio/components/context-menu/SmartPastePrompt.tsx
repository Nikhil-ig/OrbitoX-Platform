import React, { useEffect, useRef } from 'react';
import { Sparkles, Layout, Code, X } from 'lucide-react';

export type SmartPasteMode = 'native' | 'section' | 'embed';

interface SmartPastePromptProps {
  x: number;
  y: number;
  htmlSnippet: string;
  onSelect: (mode: SmartPasteMode) => void;
  onDismiss: () => void;
}

export const SmartPastePrompt: React.FC<SmartPastePromptProps> = ({
  x,
  y,
  htmlSnippet,
  onSelect,
  onDismiss,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
      if (e.key === '1') onSelect('native');
      if (e.key === '2') onSelect('section');
      if (e.key === '3') onSelect('embed');
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss, onSelect]);

  // Clamp coordinates within window
  const left = Math.min(Math.max(16, x), window.innerWidth - 340);
  const top = Math.min(Math.max(16, y), window.innerHeight - 200);

  const snippetPreview = htmlSnippet
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 45);

  return (
    <div
      ref={containerRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-[9999] w-80 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-xl shadow-2xl shadow-indigo-950/60 p-3.5 text-white animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">Smart Paste HTML</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          title="Dismiss (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {snippetPreview && (
        <p className="text-[11px] text-slate-400 font-mono truncate mb-2.5 px-2 py-1 bg-slate-950/60 rounded border border-slate-800/80">
          "{snippetPreview}..."
        </p>
      )}

      <div className="space-y-1.5">
        <button
          onClick={() => onSelect('native')}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-medium text-slate-100">Paste as Native Elements</div>
              <div className="text-[10px] text-slate-400">Full editable vector SceneGraph nodes</div>
            </div>
          </div>
          <kbd className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            1
          </kbd>
        </button>

        <button
          onClick={() => onSelect('section')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 text-left transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Layout className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-medium text-slate-200">Paste as New Section</div>
              <div className="text-[10px] text-slate-400">Wraps layout into independent block</div>
            </div>
          </div>
          <kbd className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            2
          </kbd>
        </button>

        <button
          onClick={() => onSelect('embed')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 text-left transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Code className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-xs font-medium text-slate-200">Paste as HTML Embed</div>
              <div className="text-[10px] text-slate-400">Sandboxed iframe / raw HTML container</div>
            </div>
          </div>
          <kbd className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            3
          </kbd>
        </button>
      </div>
    </div>
  );
};
