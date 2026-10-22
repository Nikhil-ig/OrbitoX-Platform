import {
  ImportedProject,
  ImportedSection,
  ImportedNode,
  ImportedPage,
} from '../types/ImportIR';
import {
  TargetTemplateSchema,
  TargetSceneDefinition,
  TargetSceneGraph,
  TargetSceneGraphNode,
  TargetPageDefinition,
  TargetDesignTokens,
} from '../types/TargetSchema';
import { TokenExtractor } from '../pipeline/TokenExtractor';
import { SecuritySanitizer } from '../pipeline/SecuritySanitizer';

export class SceneGraphCompiler {
  /**
   * Compiles an entire ImportedProject with success wrapper
   */
  static compile(project: ImportedProject): { success: boolean; schema: TargetTemplateSchema } {
    try {
      const schema = this.compileProject(project);
      return { success: true, schema };
    } catch (err: any) {
      const schema = this.compileProject(project);
      return { success: false, schema };
    }
  }

  /**
   * Compiles an entire ImportedProject into a complete TargetTemplateSchema
   */
  static compileProject(project: ImportedProject): TargetTemplateSchema {
    const slug = this.generateSlug(project.metadata.title || 'imported-project');
    const designTokens = TokenExtractor.compileDesignTokens(project.designTokens);

    const pages: TargetPageDefinition[] = [];
    const scenes: TargetSceneDefinition[] = [];

    for (const page of project.pages) {
      const sectionIds: string[] = [];

      for (const section of page.sections) {
        const compiledScene = this.compileSection(section, slug);
        scenes.push(compiledScene);
        sectionIds.push(compiledScene.id);
      }

      pages.push({
        id: page.id || `page_${pages.length + 1}`,
        name: page.name || `Page ${pages.length + 1}`,
        route: page.route || (pages.length === 0 ? '/' : `/${page.name.toLowerCase().replace(/\s+/g, '-')}`),
        sectionIds,
        isHome: page.isHome ?? (pages.length === 0),
      });
    }

    return {
      id: `tmpl_${slug}_${Date.now().toString(36)}`,
      slug,
      name: project.metadata.title || 'Imported Project',
      category: 'website',
      status: 'DRAFT',
      version: '1.0.0',
      designTokens,
      pages,
      scenes,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Compiles a single ImportedSection into a native TargetSceneDefinition
   */
  static compileSection(section: ImportedSection, parentSlug: string = 'project'): TargetSceneDefinition {
    const sceneId = section.id || `scene_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    const slug = `${parentSlug}-${this.generateSlug(section.name || 'section')}`;

    const nodes: Record<string, TargetSceneGraphNode> = {};
    const rootNodeId = section.rootNodeId || Object.keys(section.nodes)[0] || 'root';

    for (const [nodeId, importedNode] of Object.entries(section.nodes)) {
      nodes[nodeId] = this.compileNode(importedNode);
    }

    // Build hierarchical render order
    const renderOrder = this.buildRenderOrder(nodes, rootNodeId);

    const sceneGraph: TargetSceneGraph = {
      schemaVersion: 1,
      rootNodeId,
      nodes,
      renderOrder,
    };

    return {
      id: sceneId,
      slug,
      name: section.name || 'Imported Section',
      archetype: section.archetype || 'custom',
      renderMode: 'graph',
      sceneGraph,
      customizationLevel: 'FLEXIBLE',
    };
  }

  /**
   * Compiles a single ImportedNode into a TargetSceneGraphNode
   */
  static compileNode(node: ImportedNode): TargetSceneGraphNode {
    const kind = this.mapNodeKind(node.kind);

    const geometry = {
      position: (node.layout.mode === 'absolute' ? 'absolute' : 'flow') as 'flow' | 'absolute',
      x: node.geometry.x ?? 0,
      y: node.geometry.y ?? 0,
      width: node.geometry.width ?? '100%',
      height: node.geometry.height ?? 'auto',
      minWidth: node.geometry.minWidth,
      maxWidth: node.geometry.maxWidth,
      minHeight: node.geometry.minHeight,
      maxHeight: node.geometry.maxHeight,
      rotation: node.geometry.rotation ?? 0,
      scaleX: 1,
      scaleY: 1,
      opacity: node.geometry.opacity ?? 1,
      zIndex: node.geometry.zIndex ?? 1,
    };

    const style = this.compileStyle(node);

    const layoutConfig = node.layout ? {
      direction: node.layout.direction || 'vertical',
      gap: typeof node.layout.gap === 'number' ? `${node.layout.gap}px` : (node.layout.gap || '0px'),
      padding: {
        top: node.layout.padding?.top ? `${node.layout.padding.top}px` : '0px',
        right: node.layout.padding?.right ? `${node.layout.padding.right}px` : '0px',
        bottom: node.layout.padding?.bottom ? `${node.layout.padding.bottom}px` : '0px',
        left: node.layout.padding?.left ? `${node.layout.padding.left}px` : '0px',
      },
      alignment: {
        primary: node.layout.justifyContent || 'start',
        cross: node.layout.alignItems || 'stretch',
      },
      wrap: node.layout.wrap || false,
      gridTemplateColumns: node.layout.gridColumns,
      gridTemplateRows: node.layout.gridRows,
    } : undefined;

    const targetNode: TargetSceneGraphNode = {
      id: node.id,
      kind,
      name: node.name || `${kind}_${node.id.substr(0, 6)}`,
      parentId: node.parentId,
      children: [...node.children],
      geometry,
      layoutMode: node.layout.mode === 'absolute' ? 'freeform' : node.layout.mode === 'flow' ? 'auto' : node.layout.mode,
      layoutConfig,
      style,
      responsive: node.responsiveOverrides,
      locked: false,
      hidden: false,
      customerEditable: true,
      customizationLevel: 'FLEXIBLE',
    };

    if (node.content?.text) {
      targetNode.textContent = SecuritySanitizer.sanitizeHtml(node.content.text);
    }

    if (node.content?.buttonHref) {
      targetNode.props = {
        ...(targetNode.props || {}),
        href: node.content.buttonHref,
        target: node.content.buttonTarget || '_self',
      };
    }

    if (node.content?.imageRef) {
      targetNode.props = {
        ...(targetNode.props || {}),
        src: node.content.imageRef,
        alt: node.content.altText || '',
      };
    }

    if (node.content?.vectorSvgPath) {
      targetNode.props = {
        ...(targetNode.props || {}),
        vectorPath: SecuritySanitizer.sanitizeSvg(node.content.vectorSvgPath),
      };
    }

    if (node.dataBinding) {
      targetNode.binding = {
        model: node.dataBinding.model,
        field: node.dataBinding.field,
        expression: node.dataBinding.expression,
      };
    }

    if (node.dataBinding?.repeaterCollection) {
      targetNode.repeater = {
        collection: node.dataBinding.repeaterCollection,
        itemAlias: 'item',
      };
    }

    return targetNode;
  }

  private static mapNodeKind(importedKind: string): string {
    switch (importedKind) {
      case 'heading':
      case 'paragraph':
      case 'text':
        return 'text';
      case 'frame':
        return 'frame';
      case 'stack':
        return 'stack';
      case 'grid':
        return 'grid';
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'audio';
      case 'button':
        return 'button';
      case 'icon':
        return 'icon';
      case 'vector_path':
        return 'shape';
      case 'divider':
        return 'divider';
      case 'repeater':
        return 'stack'; // Repeaters render as dynamic stacks
      default:
        return 'container';
    }
  }

  private static compileStyle(node: ImportedNode): any {
    const style: any = {};

    // Background Fill
    if (node.style.fills && node.style.fills.length > 0) {
      const fill = node.style.fills[0]!;
      if (fill.type === 'solid' && fill.color) {
        style.background = {
          type: 'solid',
          color: { type: 'solid', value: fill.color },
        };
      } else if (fill.type.startsWith('gradient')) {
        style.background = {
          type: 'gradient',
          gradient: fill.gradient,
        };
      }
    }

    // Border & Radius
    if (node.style.strokes && node.style.strokes.length > 0) {
      const stroke = node.style.strokes[0]!;
      style.border = {
        width: `${stroke.width}px`,
        style: stroke.style,
        color: { type: 'solid', value: stroke.color },
        radius: typeof node.style.borderRadius === 'number' ? `${node.style.borderRadius}px` : undefined,
      };
    } else if (node.style.borderRadius) {
      style.border = {
        radius: typeof node.style.borderRadius === 'number' ? `${node.style.borderRadius}px` : undefined,
      };
    }

    // Typography
    if (node.typography) {
      style.typography = {
        fontFamily: { type: 'literal', value: node.typography.fontFamily },
        fontSize: `${node.typography.fontSize}px`,
        fontWeight: node.typography.fontWeight,
        lineHeight: node.typography.lineHeight,
        letterSpacing: typeof node.typography.letterSpacing === 'number' ? `${node.typography.letterSpacing}px` : node.typography.letterSpacing,
        textAlign: node.typography.textAlign || 'left',
        color: { type: 'solid', value: node.typography.color },
        textTransform: node.typography.textTransform || 'none',
      };
    }

    // Effects & Shadow
    if (node.style.boxShadow && node.style.boxShadow.length > 0) {
      style.effects = {
        shadow: node.style.boxShadow.map(s => ({
          x: s.x,
          y: s.y,
          blur: s.blur,
          spread: s.spread,
          color: s.color,
          inset: s.inset,
        })),
        backdropBlur: node.style.backdropFilter,
      };
    }

    return style;
  }

  private static buildRenderOrder(nodes: Record<string, TargetSceneGraphNode>, rootId: string): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      order.push(id);

      const node = nodes[id];
      if (node && node.children) {
        for (const childId of node.children) {
          traverse(childId);
        }
      }
    };

    if (nodes[rootId]) {
      traverse(rootId);
    }

    // Include any detached or orphan nodes at the end to guarantee no node is dropped
    for (const id of Object.keys(nodes)) {
      if (!visited.has(id)) {
        traverse(id);
      }
    }

    return order;
  }

  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'imported-project';
  }
}
