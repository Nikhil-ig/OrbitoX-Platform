/**
 * AIDesignEngine.ts
 * 
 * Direct SceneGraph AST Generative Design Engine.
 * Translates natural language design prompts into deterministic, atomic
 * commands that directly mutate the living SceneGraph AST.
 */

import { TemplateSchema } from '../types/TemplateSchema';
import { SceneGraphNode } from './SceneGraphTypes';

export interface AIDesignPlan {
  summary: string;
  themeUniverse?: string;
  tokensPatch?: Record<string, any>;
  nodePatches: Array<{
    nodeId: string;
    sceneId: string;
    patch: Partial<SceneGraphNode>;
  }>;
}

export class AIDesignEngine {
  /**
   * Analyzes user prompt and generates an atomic execution plan
   */
  public static planPrompt(
    prompt: string,
    schema: TemplateSchema,
    selectedNodeId?: string | null,
    activeSceneId?: string | null
  ): AIDesignPlan {
    const p = prompt.toLowerCase();
    const plan: AIDesignPlan = {
      summary: '',
      nodePatches: [],
    };

    // 1. Theme Universe & Global Aesthetics
    if (p.includes('luxury') || p.includes('gold') || p.includes('champagne') || p.includes('editorial')) {
      plan.summary = 'Applied Luxury Editorial Aesthetic: Tuscan gold accents, refined serif typography, and balanced letter spacing.';
      plan.themeUniverse = 'editorial';
      plan.tokensPatch = {
        'colors.accentPrimary': '#D4AF37',
        'colors.accentSecondary': '#F3E5AB',
        'typography.fontFamilyHeading': 'Playfair Display, serif',
      };
    } else if (p.includes('cinematic') || p.includes('noir') || p.includes('dark')) {
      plan.summary = 'Applied Cinematic Noir Aesthetic: High-contrast dark backgrounds, subtle vignette, and obsidian accents.';
      plan.themeUniverse = 'noir';
      plan.tokensPatch = {
        'colors.backgroundPrimary': '#08080A',
        'colors.surfacePrimary': '#121316',
        'colors.textPrimary': '#FFFFFF',
        'colors.accentPrimary': '#6366F1',
      };
    } else if (p.includes('cyber') || p.includes('neon') || p.includes('futuristic')) {
      plan.summary = 'Applied Cyber Neon Aesthetic: High-intensity cyan/magenta glowing accents with geometric sans fonts.';
      plan.themeUniverse = 'cyberpunk';
      plan.tokensPatch = {
        'colors.accentPrimary': '#06B6D4',
        'colors.accentSecondary': '#EC4899',
      };
    } else if (p.includes('minimal') || p.includes('clean') || p.includes('swiss')) {
      plan.summary = 'Applied Minimal Swiss Aesthetic: Clean monochrome palette, generous whitespace, and objective typography.';
      plan.themeUniverse = 'minimal';
      plan.tokensPatch = {
        'colors.accentPrimary': '#111827',
        'typography.fontFamilyHeading': 'Inter, sans-serif',
      };
    } else if (p.includes('celestial') || p.includes('starlight') || p.includes('astral')) {
      plan.summary = 'Applied Celestial Odyssey Aesthetic: Midnight sapphire, astral starlight gold, and Cinzel typography.';
      plan.themeUniverse = 'celestial';
      plan.tokensPatch = {
        'colors.accentPrimary': '#F59E0B',
        'colors.accentSecondary': '#3B82F6',
        'typography.fontFamilyHeading': 'Cinzel, serif',
      };
    } else if (p.includes('royal') || p.includes('regal') || p.includes('monarch')) {
      plan.summary = 'Applied Royal Monarch Aesthetic: Imperial deep gold, rich burgundy accents, and stately serif headings.';
      plan.themeUniverse = 'royal';
      plan.tokensPatch = {
        'colors.accentPrimary': '#E5A93C',
        'colors.accentSecondary': '#991B1B',
        'typography.fontFamilyHeading': 'Cinzel Decorative, serif',
      };
    }

    // 2. Targeted Node & SceneGraph Mutations
    const targetScene = schema.scenes.find((s) => s.id === activeSceneId) || schema.scenes[0];
    if (targetScene && targetScene.sceneGraph && targetScene.sceneGraph.nodes) {
      const nodes = targetScene.sceneGraph.nodes;

      // If a specific node is selected
      if (selectedNodeId && nodes[selectedNodeId]) {
        const node = nodes[selectedNodeId];

        // Glassmorphism & Frosted Glass
        if (p.includes('glass') || p.includes('frosted')) {
          plan.summary = plan.summary || `Applied frosted glassmorphism to layer "${node.name}"`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              style: {
                ...node.style,
                background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.08)' } },
                border: { width: '1px', style: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.2)' }, radius: '16px' },
                shadow: { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' },
                effects: { backdropBlur: '16px' },
              },
            },
          });
        }

        // Parallax & Depth Plane
        if (p.includes('parallax') || p.includes('depth')) {
          plan.summary = plan.summary || `Assigned 3D parallax depth plane to layer "${node.name}"`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              style: {
                ...node.style,
                depthPlane: 3,
              },
              motion: {
                ...node.motion,
                parallax: { depthPlane: 3, direction: 'vertical', factor: 0.24 },
              },
            },
          });
        }

        // Spring Dynamics & Bounce
        if (p.includes('animate') || p.includes('bounce') || p.includes('spring')) {
          plan.summary = plan.summary || `Configured spring physics motion dynamics for layer "${node.name}"`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              motion: {
                ...(node.motion || {}),
                in: {
                  ...(node.motion?.in || { type: 'fade', duration: 800, delay: 0 }),
                  easing: 'spring',
                  spring: { damping: 14, stiffness: 220, mass: 1.2 },
                },
              },
            },
          });
        }

        // Copywriting & Headline Refinement
        if (p.includes('headline') || p.includes('copy') || p.includes('romantic') || p.includes('poetic') || p.includes('text')) {
          const romanticHeadlines = [
            'Together Under The Royal Celestial Starlight',
            'An Everlasting Symphony of Eternal Love',
            'In Witness of Eternity & Starlight',
            'A Gathering of Hearts in Sacred Celebration',
          ];
          const chosen = romanticHeadlines[Math.floor(Math.random() * romanticHeadlines.length)];
          plan.summary = plan.summary || `Refined poetic copywriting for text layer "${node.name}"`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              name: chosen,
              props: {
                ...(node.props || {}),
                text: chosen,
              },
              style: {
                ...(node.style || {}),
                typography: {
                  ...(node.style?.typography || {}),
                  fontFamily: 'Cinzel, serif',
                  letterSpacing: '0.08em',
                },
              },
            },
          });
        }

        // Corner Rounding & Soften
        if (p.includes('round') || p.includes('pill') || p.includes('soften')) {
          plan.summary = plan.summary || `Softened corners with smooth 24px curvature on layer "${node.name}"`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              style: {
                ...node.style,
                border: {
                  ...(node.style?.border || {}),
                  radius: '24px',
                },
              },
            },
          });
        }

        // Glowing Accent
        if (p.includes('glow') || p.includes('neon') || p.includes('highlight')) {
          plan.summary = plan.summary || `Added radiant glowing halo to layer "${node.name}"`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              style: {
                ...node.style,
                shadow: {
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
                },
              },
            },
          });
        }

        // Mobile-First / Responsive Adaptation on selected layer
        if (p.includes('mobile-first') || p.includes('mobile') || p.includes('responsive')) {
          plan.summary = plan.summary || `Optimized layer "${node.name}" for mobile viewports`;
          plan.nodePatches.push({
            nodeId: selectedNodeId,
            sceneId: targetScene.id,
            patch: {
              responsive: {
                ...(node.responsive || {}),
                mobile: {
                  ...(node.responsive?.mobile || {}),
                  style: {
                    ...(node.responsive?.mobile?.style || {}),
                    typography: { fontSize: '20px', lineHeight: 1.3 },
                    padding: '12px 16px',
                  },
                  geometry: {
                    ...(node.responsive?.mobile?.geometry || {}),
                    width: '100%',
                  },
                },
              },
            },
          });
        }
      } else {
        // Document-wide or section-wide transformations
        if (p.includes('spacing') || p.includes('breathing room')) {
          plan.summary = plan.summary || 'Expanded layout spacing and container padding across section';
          Object.values(nodes).forEach((n: SceneGraphNode) => {
            if ((n.kind === 'container' || n.kind === 'frame' || n.kind === 'stack') && n.layoutConfig) {
              plan.nodePatches.push({
                nodeId: n.id,
                sceneId: targetScene.id,
                patch: {
                  layoutConfig: {
                    ...(n.layoutConfig as any),
                    gap: 32,
                  },
                },
              });
            }
          });
        }

        if (p.includes('round') || p.includes('soften')) {
          plan.summary = plan.summary || 'Applied 20px rounded pill borders across all interactive elements';
          Object.values(nodes).forEach((n: SceneGraphNode) => {
            if (n.kind === 'button' || n.kind === 'image' || n.kind === 'frame') {
              plan.nodePatches.push({
                nodeId: n.id,
                sceneId: targetScene.id,
                patch: {
                  style: {
                    ...n.style,
                    border: {
                      ...(n.style?.border || {}),
                      radius: '20px',
                    },
                  },
                },
              });
            }
          });
        }

        if (p.includes('mobile-first') || p.includes('mobile') || p.includes('responsive')) {
          plan.summary = plan.summary || 'Generated optimized mobile-first responsive breakpoints across section';
          Object.values(nodes).forEach((n: SceneGraphNode) => {
            if (n.kind === 'text') {
              plan.nodePatches.push({
                nodeId: n.id,
                sceneId: targetScene.id,
                patch: {
                  responsive: {
                    ...(n.responsive || {}),
                    mobile: {
                      ...(n.responsive?.mobile || {}),
                      style: {
                        ...(n.responsive?.mobile?.style || {}),
                        typography: { fontSize: '20px', lineHeight: 1.3 },
                        padding: '12px 16px',
                      },
                      geometry: {
                        ...(n.responsive?.mobile?.geometry || {}),
                        width: '100%',
                      },
                    },
                  },
                },
              });
            }
          });
        }
      }
    }

    if (!plan.summary) {
      plan.summary = `Processed AI instruction: "${prompt}"`;
    }

    return plan;
  }
}
