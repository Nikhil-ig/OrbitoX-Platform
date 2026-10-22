import { SceneGraph, SceneGraphNode } from '../engine/SceneGraphTypes';
import { TemplateSchema, TemplateSceneDefinition, DeviceBreakpoint } from '../types/TemplateSchema';
import { TemplateEditorCommand } from '../engine/TemplateEditorCommands';

export interface SmartDesignSuggestion {
  id: string;
  category: 'layout' | 'alignment' | 'typography' | 'performance' | 'tokens';
  title: string;
  description: string;
  severity: 'suggestion' | 'warning' | 'info';
  sceneId: string;
  nodeId?: string;
  previewLabel: string;
  fixCommand: TemplateEditorCommand;
}

export class SmartDesignAssistance {
  /**
   * Run all smart assistant audits against the current schema and active scene.
   */
  static analyze(
    schema: TemplateSchema,
    activeSceneId: string,
    device: DeviceBreakpoint = 'desktop'
  ): SmartDesignSuggestion[] {
    const suggestions: SmartDesignSuggestion[] = [];
    const scene = schema.scenes.find((s) => s.id === activeSceneId);
    if (!scene) return suggestions;

    const graph = scene.sceneGraph;

    if (graph && graph.nodes) {
      // 1. Mobile Safe Area Check (Prompt #46)
      if (device === 'mobile') {
        const mobileWidth = 390;
        Object.values(graph.nodes).forEach((node) => {
          if (node.geometry.position === 'absolute') {
            const x = typeof node.geometry.x === 'number' ? node.geometry.x : parseFloat(String(node.geometry.x) || '0');
            const w = typeof node.geometry.width === 'number' ? node.geometry.width : parseFloat(String(node.geometry.width) || '0');
            if (x + w > mobileWidth || x < 0) {
              suggestions.push({
                id: `sug_safe_area_${node.id}`,
                category: 'layout',
                title: 'Mobile content exceeds safe area',
                description: `Node '${node.name}' extends beyond the mobile viewport (${x + w}px > ${mobileWidth}px).`,
                severity: 'warning',
                sceneId: scene.id,
                nodeId: node.id,
                previewLabel: 'Clamp width to 100% and center X',
                fixCommand: {
                  type: 'SG_UPDATE_GEOMETRY',
                  sceneId: scene.id,
                  nodeId: node.id,
                  patch: { x: 0, width: '100%' },
                },
              });
            }
          }
        });
      }

      // 2. Alignment Inconsistency Check (e.g. 2 portraits unevenly aligned)
      const portraitNodes = Object.values(graph.nodes).filter(
        (n) => n.kind === 'person' || n.name.toLowerCase().includes('portrait') || n.id.includes('portrait')
      );
      if (portraitNodes.length >= 2) {
        const p1 = portraitNodes[0]!;
        const p2 = portraitNodes[1]!;
        const y1 = typeof p1.geometry.y === 'number' ? p1.geometry.y : parseFloat(String(p1.geometry.y) || '0');
        const y2 = typeof p2.geometry.y === 'number' ? p2.geometry.y : parseFloat(String(p2.geometry.y) || '0');
        const diff = Math.abs(y1 - y2);

        if (diff > 0 && diff <= 30) {
          suggestions.push({
            id: `sug_align_${p1.id}_${p2.id}`,
            category: 'alignment',
            title: 'Two portraits are unevenly aligned',
            description: `'${p1.name}' (y: ${y1}px) and '${p2.name}' (y: ${y2}px) differ by ${Math.round(diff)}px.`,
            severity: 'suggestion',
            sceneId: scene.id,
            nodeId: p2.id,
            previewLabel: `Snap '${p2.name}' Y to ${y1}px`,
            fixCommand: {
              type: 'SG_UPDATE_GEOMETRY',
              sceneId: scene.id,
              nodeId: p2.id,
              patch: { y: y1 },
            },
          });
        }
      }

      // 3. Typography Consistency Check (Prompt #46)
      const textNodes = Object.values(graph.nodes).filter(
        (n) => n.kind === 'text' || n.kind === 'richtext'
      );
      const displayFont = schema.designTokens?.typography?.displayFont || 'Cinzel';
      const nonStandardFontNodes = textNodes.filter((n) => {
        const f = n.style.typography?.fontFamily;
        return f && !f.includes(displayFont) && !f.includes('var(');
      });

      if (nonStandardFontNodes.length >= 2) {
        suggestions.push({
          id: `sug_typo_inconsistent_${scene.id}`,
          category: 'typography',
          title: `${nonStandardFontNodes.length} text nodes use inconsistent heading style`,
          description: `Multiple text elements override font family away from the design token '${displayFont}'.`,
          severity: 'info',
          sceneId: scene.id,
          nodeId: nonStandardFontNodes[0]?.id,
          previewLabel: `Align to design system token '${displayFont}'`,
          fixCommand: {
            type: 'SG_UPDATE_STYLE',
            sceneId: scene.id,
            nodeId: nonStandardFontNodes[0]!.id,
            patch: {
              typography: {
                ...nonStandardFontNodes[0]!.style.typography,
                fontFamily: `var(--orbitox-font-display, '${displayFont}')`,
              },
            },
          },
        });
      }
    }

    // 4. Mobile Animation Performance Check (Prompt #46)
    if (scene.motionPreset === 'cinematic' || scene.motionPreset === 'expressive') {
      if (!scene.motionConfig?.reducedMotionFallback) {
        suggestions.push({
          id: `sug_motion_perf_${scene.id}`,
          category: 'performance',
          title: 'Selected animation may be expensive on mobile',
          description: `Scene '${scene.name}' uses '${scene.motionPreset}' motion without a lightweight reduced-motion fallback.`,
          severity: 'suggestion',
          sceneId: scene.id,
          previewLabel: 'Set reduced motion fallback to static fade',
          fixCommand: {
            type: 'UPDATE_SCENE',
            sceneId: scene.id,
            patch: {
              motionConfig: {
                ...(scene.motionConfig || {
                  entryDuration: 1.0,
                  entryDelay: 0.1,
                  parallaxDepth: 0.5,
                  staggerDelay: 0.1,
                  easing: 'ease-out',
                }),
                reducedMotionFallback: 'fade',
              },
            },
          },
        });
      }
    }

    // 5. Unused Token Check (Prompt #46)
    const colorTokens = schema.designTokens?.colors;
    if (colorTokens && graph) {
      const allStylesJson = JSON.stringify(graph.nodes);
      if (colorTokens.accentSecondary && !allStylesJson.includes('accentSecondary')) {
        suggestions.push({
          id: `sug_unused_token_accentSec`,
          category: 'tokens',
          title: 'Unused token detected: colors.accentSecondary',
          description: `Token 'accentSecondary' (${colorTokens.accentSecondary}) is defined in design system tokens but not used by any node.`,
          severity: 'info',
          sceneId: scene.id,
          previewLabel: 'Bind accentSecondary to scene ambient glow',
          fixCommand: {
            type: 'UPDATE_DESIGN_TOKENS',
            patch: {
              colors: {
                ...colorTokens,
                accentGlow: colorTokens.accentSecondary,
              },
            },
          },
        });
      }
    }

    return suggestions;
  }
}
