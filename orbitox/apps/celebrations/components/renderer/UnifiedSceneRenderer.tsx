'use client';

import React, { useMemo } from 'react';
import { SceneGraph } from '../template-studio/engine/SceneGraphTypes';
import { SceneGraphRenderer } from './SceneGraphRenderer';
import { bindDataToGraph } from '../template-studio/engine/GraphDataBinder';
import { CelebrationState } from '@/components/studio/StudioData';
import { TemplateDesignTokens, DeviceBreakpoint } from '../template-studio/types/TemplateSchema';

export interface UnifiedSceneRendererProps {
  sceneGraph: SceneGraph;
  device: DeviceBreakpoint;
  tokens: TemplateDesignTokens;
  celebrationState: CelebrationState;
  minHeight?: string;
}

export function UnifiedSceneRenderer({ 
  sceneGraph, 
  device, 
  tokens, 
  celebrationState,
  minHeight = '100vh',
}: UnifiedSceneRendererProps) {
  const boundGraph = useMemo(() => {
    return bindDataToGraph(sceneGraph, celebrationState);
  }, [sceneGraph, celebrationState]);

  return (
    <section style={{ width: '100%', position: 'relative', minHeight }}>
      <SceneGraphRenderer
        sceneGraph={boundGraph}
        device={device}
        tokens={tokens}
        isEditorMode={false}
        resolvedState={celebrationState}
      />
    </section>
  );
}
