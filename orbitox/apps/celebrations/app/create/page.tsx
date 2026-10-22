'use client';

import React, { Suspense } from 'react';
import { CelebrationStudio } from '@/components/studio/CelebrationStudio';

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#070709] text-amber-400 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
          <span className="text-xs font-mono tracking-widest uppercase text-zinc-500">
            Initializing Celebration Studio...
          </span>
        </div>
      }
    >
      <CelebrationStudio />
    </Suspense>
  );
}
