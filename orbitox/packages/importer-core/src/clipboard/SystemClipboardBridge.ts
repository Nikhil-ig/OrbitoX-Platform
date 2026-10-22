/**
 * OrbitoX Universal Importer - Professional Multi-MIME System Clipboard Bridge
 * Package: @orbitox-io/importer-core
 * 
 * Spec: docs/P26_CLIPBOARD_ARCHITECTURE.md
 * Handles OS-level clipboard interoperability:
 * - Multi-MIME exports (application/vnd.orbitox.scenegraph+json, text/html, image/svg+xml, text/plain)
 * - Ingestion sniffing (Native JSON, SVG vector, HTML snippet, Plain text, Image blob)
 * - Paste Special handlers (Paste to Replace, Paste into Selection, Paste Styles Only, Paste at Coordinates)
 * - Copy as Code generators (React JSX, HTML5/CSS, SVG Vector, JSON AST)
 */

import { SvgOptimizer } from '../pipeline/SvgOptimizer';
import { SecuritySanitizer } from '../pipeline/SecuritySanitizer';
import { HtmlAdapter } from '../adapters/HtmlAdapter';

export const ORBITOX_MIME_TYPE = 'application/vnd.orbitox.scenegraph+json';

export interface SystemClipboardData {
  orbitoxJson: string;
  html: string;
  svg: string;
  plainText: string;
}

export interface NativeClipboardPayload {
  orbitox: true;
  schemaVersion: '1.0';
  rootIds: string[];
  nodes: Record<string, any>;
  copiedAt: string;
  sourceOrigin?: string;
}

export interface ClipboardIngestResult {
  format: 'orbitox_native' | 'svg' | 'html' | 'text';
  rootIds: string[];
  nodes: Record<string, any>;
  warnings: string[];
}

export interface PasteSpecialOptions {
  insertIndex?: number;
  preserveGeometry?: boolean;
  preserveDimensions?: boolean;
}

export class SystemClipboardBridge {
  // ─────────────────────────────────────────────────────────────
  // 1. MULTI-MIME SERIALIZATION & CLIPBOARD WRITE
  // ─────────────────────────────────────────────────────────────

  /**
   * Generates a multi-MIME payload from a set of nodes
   */
  public static serializeToMultiMime(
    rootIds: string[],
    nodes: Record<string, any>,
    sourceOrigin = 'orbitox-studio-zero'
  ): SystemClipboardData {
    // 1. Native Orbitox JSON payload
    const nativePayload: NativeClipboardPayload = {
      orbitox: true,
      schemaVersion: '1.0',
      rootIds,
      nodes,
      copiedAt: new Date().toISOString(),
      sourceOrigin,
    };
    const orbitoxJson = JSON.stringify(nativePayload, null, 2);

    // 2. Clean W3C HTML5 with inline styles
    const html = this.generateHtmlPreview(rootIds, nodes);

    // 3. Standalone SVG representation
    const svg = this.generateSvgPreview(rootIds, nodes);

    // 4. Plain text representation
    const plainText = this.generatePlainText(rootIds, nodes);

    return {
      orbitoxJson,
      html,
      svg,
      plainText,
    };
  }

  /**
   * Writes multi-MIME payload to the OS clipboard (when running in browser)
   */
  public static async writeToClipboard(
    rootIds: string[],
    nodes: Record<string, any>,
    sourceOrigin = 'orbitox-studio-zero'
  ): Promise<boolean> {
    const data = this.serializeToMultiMime(rootIds, nodes, sourceOrigin);

    if (typeof navigator !== 'undefined' && navigator.clipboard?.write) {
      try {
        const itemRecord: Record<string, Blob> = {
          [ORBITOX_MIME_TYPE]: new Blob([data.orbitoxJson], { type: ORBITOX_MIME_TYPE }),
          'text/html': new Blob([data.html], { type: 'text/html' }),
          'image/svg+xml': new Blob([data.svg], { type: 'image/svg+xml' }),
          'text/plain': new Blob([data.plainText], { type: 'text/plain' }),
        };

        await navigator.clipboard.write([new ClipboardItem(itemRecord)]);
        return true;
      } catch {
        // Fallback for browsers with restricted custom MIME policies
        try {
          await navigator.clipboard.writeText(data.orbitoxJson);
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EXTERNAL CLIPBOARD INGESTION & SNIFFING
  // ─────────────────────────────────────────────────────────────

  /**
   * Sniffs clipboard MIME data and parses into normalized scene nodes with fresh IDs
   */
  public static async ingestClipboardData(
    items: {
      orbitoxJson?: string;
      svg?: string;
      html?: string;
      plainText?: string;
    }
  ): Promise<ClipboardIngestResult> {
    const warnings: string[] = [];

    // Priority 1: Native Orbitox JSON
    if (items.orbitoxJson || (items.plainText && this.isNativeOrbitoxJson(items.plainText))) {
      const raw = items.orbitoxJson || items.plainText!;
      try {
        const parsed: NativeClipboardPayload = JSON.parse(raw);
        if (parsed.rootIds && parsed.nodes) {
          const { rootIds, nodes } = this.remapNodeIds(parsed.rootIds, parsed.nodes);
          return {
            format: 'orbitox_native',
            rootIds,
            nodes,
            warnings,
          };
        }
      } catch (e: any) {
        warnings.push(`Failed to parse native Orbitox clipboard JSON: ${e.message}`);
      }
    }

    // Priority 2: SVG Vector Data
    const svgCandidate = items.svg || (items.plainText && this.isSvgCode(items.plainText) ? items.plainText : undefined);
    if (svgCandidate) {
      try {
        const optimized = SvgOptimizer.optimize(svgCandidate);
        const rootId = `node_vector_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const vectorPath = optimized.paths.map((p) => p.d).join(' ');

        const node = {
          id: rootId,
          name: 'Imported SVG Vector',
          type: 'vector',
          kind: 'vector',
          parentId: null,
          children: [],
          geometry: {
            position: 'flow',
            x: 0,
            y: 0,
            width: optimized.viewBox.width || 120,
            height: optimized.viewBox.height || 120,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            zIndex: 1,
          },
          style: {
            fills: [{ type: 'solid', color: optimized.primaryFill || '#DFBA6B' }],
            strokes: optimized.primaryStroke
              ? [{ color: optimized.primaryStroke, width: 2, style: 'solid' }]
              : [],
          },
          content: {
            vectorSvgPath: vectorPath,
          },
          props: {
            vectorPath,
            viewBox: `${optimized.viewBox.x} ${optimized.viewBox.y} ${optimized.viewBox.width} ${optimized.viewBox.height}`,
          },
        };

        return {
          format: 'svg',
          rootIds: [rootId],
          nodes: { [rootId]: node },
          warnings,
        };
      } catch (e: any) {
        warnings.push(`Failed to optimize SVG from clipboard: ${e.message}`);
      }
    }

    // Priority 3: HTML Snippet
    if (items.html && items.html.trim().length > 0) {
      try {
        const htmlAdapter = new HtmlAdapter();
        const parseRes = await htmlAdapter.parse(items.html);
        if (parseRes.success && parseRes.projectIR.pages[0]?.sections[0]) {
          const section = parseRes.projectIR.pages[0].sections[0];
          const { rootIds, nodes } = this.remapNodeIds([section.rootNodeId], section.nodes);
          return {
            format: 'html',
            rootIds,
            nodes,
            warnings,
          };
        }
      } catch (e: any) {
        warnings.push(`Failed to ingest HTML snippet from clipboard: ${e.message}`);
      }
    }

    // Priority 4: Plain Text
    const textContent = (items.plainText || '').trim();
    if (textContent.length > 0) {
      const textId = `node_text_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const node = {
        id: textId,
        name: 'Pasted Text',
        type: 'text',
        kind: 'text',
        parentId: null,
        children: [],
        geometry: {
          position: 'flow',
          x: 0,
          y: 0,
          width: 'full',
          height: 'auto',
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          zIndex: 1,
        },
        style: {},
        typography: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.5,
          color: '#FFFFFF',
        },
        content: {
          text: textContent,
        },
        textContent,
      };

      return {
        format: 'text',
        rootIds: [textId],
        nodes: { [textId]: node },
        warnings,
      };
    }

    return {
      format: 'text',
      rootIds: [],
      nodes: {},
      warnings: ['Clipboard empty or unrecognizable MIME payload'],
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PASTE SPECIAL OPERATIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * Standard Paste: appends clipboard subtree into target parent container
   */
  public static paste(
    graph: { nodes: Record<string, any>; rootNodeId?: string },
    targetParentId: string,
    clipboardNodes: Record<string, any>,
    clipboardRootIds: string[],
    options: PasteSpecialOptions = {}
  ): { nodes: Record<string, any>; pastedRootIds: string[] } {
    const parentNode = graph.nodes[targetParentId];
    if (!parentNode) {
      return { nodes: graph.nodes, pastedRootIds: [] };
    }

    const { rootIds: pastedRootIds, nodes: remappedNodes } = this.remapNodeIds(
      clipboardRootIds,
      clipboardNodes
    );

    const updatedNodes: Record<string, any> = { ...graph.nodes, ...remappedNodes };
    const updatedParent = { ...parentNode, children: [...(parentNode.children || [])] };

    for (const rId of pastedRootIds) {
      const node = updatedNodes[rId];
      if (node) {
        node.parentId = targetParentId;
      }
    }

    if (typeof options.insertIndex === 'number' && options.insertIndex >= 0) {
      updatedParent.children.splice(options.insertIndex, 0, ...pastedRootIds);
    } else {
      updatedParent.children.push(...pastedRootIds);
    }

    updatedNodes[targetParentId] = updatedParent;

    return {
      nodes: updatedNodes,
      pastedRootIds,
    };
  }

  /**
   * Paste to Replace: replaces targetNodeId entirely with the clipboard root subtree,
   * preserving its exact parent and sibling position index.
   */
  public static pasteToReplace(
    graph: { nodes: Record<string, any>; rootNodeId?: string },
    targetNodeId: string,
    clipboardNodes: Record<string, any>,
    clipboardRootIds: string[],
    options: PasteSpecialOptions = {}
  ): { nodes: Record<string, any>; replacedByRootId: string | null } {
    const targetNode = graph.nodes[targetNodeId];
    if (!targetNode || !targetNode.parentId) {
      return { nodes: graph.nodes, replacedByRootId: null };
    }

    const parentNode = graph.nodes[targetNode.parentId];
    if (!parentNode) {
      return { nodes: graph.nodes, replacedByRootId: null };
    }

    const targetIndex = parentNode.children.indexOf(targetNodeId);
    if (targetIndex === -1) {
      return { nodes: graph.nodes, replacedByRootId: null };
    }

    const { rootIds: pastedRootIds, nodes: remappedNodes } = this.remapNodeIds(
      clipboardRootIds,
      clipboardNodes
    );

    if (pastedRootIds.length === 0) {
      return { nodes: graph.nodes, replacedByRootId: null };
    }

    const primaryRootId = pastedRootIds[0]!;
    const primaryRootNode = remappedNodes[primaryRootId]!;

    // Optional: inherit geometry dimension constraints
    if (options.preserveDimensions && targetNode.geometry) {
      primaryRootNode.geometry = {
        ...primaryRootNode.geometry,
        width: targetNode.geometry.width,
        height: targetNode.geometry.height,
      };
    }

    // Build clean graph with target node and descendants removed
    const nodesWithoutTarget = this.deleteSubtree(graph.nodes, targetNodeId);
    const updatedNodes: Record<string, any> = { ...nodesWithoutTarget, ...remappedNodes };

    // Update parent's children array
    const updatedParent = { ...parentNode, children: [...parentNode.children] };
    updatedParent.children.splice(targetIndex, 1, ...pastedRootIds);

    for (const rId of pastedRootIds) {
      if (updatedNodes[rId]) {
        updatedNodes[rId].parentId = targetNode.parentId;
      }
    }

    updatedNodes[targetNode.parentId] = updatedParent;

    return {
      nodes: updatedNodes,
      replacedByRootId: primaryRootId,
    };
  }

  /**
   * Paste into Selection: force-inserts clipboard items as children inside selected container
   */
  public static pasteIntoSelection(
    graph: { nodes: Record<string, any>; rootNodeId?: string },
    selectedContainerId: string,
    clipboardNodes: Record<string, any>,
    clipboardRootIds: string[]
  ): { nodes: Record<string, any>; pastedRootIds: string[] } {
    return this.paste(graph, selectedContainerId, clipboardNodes, clipboardRootIds);
  }

  /**
   * Paste Styles Only: copies fills, strokes, borderRadius, boxShadow, and typography
   * from clipboard root node to target node without modifying target geometry or content.
   */
  public static pasteStylesOnly(
    graph: { nodes: Record<string, any>; rootNodeId?: string },
    targetNodeId: string,
    clipboardNodes: Record<string, any>,
    clipboardRootIds: string[]
  ): { nodes: Record<string, any>; updatedNodeId: string | null } {
    const targetNode = graph.nodes[targetNodeId];
    if (!targetNode || clipboardRootIds.length === 0) {
      return { nodes: graph.nodes, updatedNodeId: null };
    }

    const sourceRootId = clipboardRootIds[0]!;
    const sourceNode = clipboardNodes[sourceRootId];
    if (!sourceNode) {
      return { nodes: graph.nodes, updatedNodeId: null };
    }

    const updatedNode = {
      ...targetNode,
      style: {
        ...(targetNode.style || {}),
        ...(sourceNode.style || {}),
      },
      typography: sourceNode.typography
        ? {
            ...(targetNode.typography || {}),
            ...sourceNode.typography,
          }
        : targetNode.typography,
    };

    return {
      nodes: {
        ...graph.nodes,
        [targetNodeId]: updatedNode,
      },
      updatedNodeId: targetNodeId,
    };
  }

  /**
   * Paste at Coordinates: inserts clipboard items at exact (x, y) canvas position
   */
  public static pasteAtCoordinates(
    graph: { nodes: Record<string, any>; rootNodeId?: string },
    targetParentId: string,
    clipboardNodes: Record<string, any>,
    clipboardRootIds: string[],
    x: number,
    y: number
  ): { nodes: Record<string, any>; pastedRootIds: string[] } {
    const { nodes: pastedNodes, pastedRootIds } = this.paste(
      graph,
      targetParentId,
      clipboardNodes,
      clipboardRootIds
    );

    const updatedNodes = { ...pastedNodes };
    for (const rId of pastedRootIds) {
      const node = updatedNodes[rId];
      if (node && node.geometry) {
        updatedNodes[rId] = {
          ...node,
          geometry: {
            ...node.geometry,
            position: 'absolute',
            x: Math.round(x),
            y: Math.round(y),
          },
        };
      }
    }

    return {
      nodes: updatedNodes,
      pastedRootIds,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. COPY AS CODE GENERATORS
  // ─────────────────────────────────────────────────────────────

  /**
   * Copy as React JSX: Generates clean React functional component code with Tailwind classes
   */
  public static copyAsJsx(nodeId: string, nodes: Record<string, any>): string {
    const root = nodes[nodeId];
    if (!root) return '';

    const componentName = this.toPascalCase(root.name || 'Component');
    const jsxBody = this.renderJsxNode(root, nodes, 2);

    return `export function ${componentName}() {
  return (
${jsxBody}
  );
}`;
  }

  /**
   * Copy as HTML / CSS: Generates semantic HTML5 with scoped <style> block
   */
  public static copyAsHtmlCss(nodeId: string, nodes: Record<string, any>): string {
    const root = nodes[nodeId];
    if (!root) return '';

    const className = `orbitox-${this.toKebabCase(root.name || 'node')}`;
    const htmlBody = this.renderHtmlNode(root, nodes, 0);

    const cssRules = this.generateCssRules(root, nodes);

    return `<div class="${className}">
${htmlBody}
</div>

<style>
${cssRules}
</style>`;
  }

  /**
   * Copy as SVG Vector: Generates standalone valid SVG code
   */
  public static copyAsSvg(nodeId: string, nodes: Record<string, any>): string {
    const node = nodes[nodeId];
    if (!node) return '';

    if (node.content?.vectorSvgPath || node.props?.vectorPath) {
      const path = node.content?.vectorSvgPath || node.props?.vectorPath;
      const fill = node.style?.fills?.[0]?.color || '#DFBA6B';
      const width = typeof node.geometry?.width === 'number' ? node.geometry.width : 100;
      const height = typeof node.geometry?.height === 'number' ? node.geometry.height : 100;

      return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${path}" fill="${fill}" />
</svg>`;
    }

    const w = typeof node.geometry?.width === 'number' ? node.geometry.width : 200;
    const h = typeof node.geometry?.height === 'number' ? node.geometry.height : 100;
    const bg = node.style?.fills?.[0]?.color || '#0B0F19';
    const rx = typeof node.style?.borderRadius === 'number' ? node.style.borderRadius : 8;

    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" rx="${rx}" fill="${bg}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="14">${node.name || 'Node'}</text>
</svg>`;
  }

  /**
   * Copy as JSON AST: Generates serialized SceneGraph subtree
   */
  public static copyAsJson(nodeId: string, nodes: Record<string, any>): string {
    const root = nodes[nodeId];
    if (!root) return '{}';

    const subtreeNodes: Record<string, any> = {};
    const collect = (id: string) => {
      const n = nodes[id];
      if (!n) return;
      subtreeNodes[id] = n;
      for (const cid of n.children || []) {
        collect(cid);
      }
    };
    collect(nodeId);

    return JSON.stringify(
      {
        rootId: nodeId,
        nodes: subtreeNodes,
      },
      null,
      2
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. INTERNAL RE-ID & HELPER UTILITIES
  // ─────────────────────────────────────────────────────────────

  public static remapNodeIds(
    rootIds: string[],
    nodes: Record<string, any>
  ): { rootIds: string[]; nodes: Record<string, any> } {
    const idMap = new Map<string, string>();
    const remappedNodes: Record<string, any> = {};

    // 1. Generate fresh unique IDs
    for (const oldId of Object.keys(nodes)) {
      const freshId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      idMap.set(oldId, freshId);
    }

    // 2. Clone and rewire parent/child pointers
    for (const [oldId, oldNode] of Object.entries(nodes)) {
      const newId = idMap.get(oldId)!;
      const cloned = JSON.parse(JSON.stringify(oldNode));
      cloned.id = newId;

      if (cloned.parentId && idMap.has(cloned.parentId)) {
        cloned.parentId = idMap.get(cloned.parentId)!;
      }

      if (Array.isArray(cloned.children)) {
        cloned.children = cloned.children
          .filter((cid: string) => idMap.has(cid))
          .map((cid: string) => idMap.get(cid)!);
      }

      remappedNodes[newId] = cloned;
    }

    const remappedRootIds = rootIds.map((rid) => idMap.get(rid) || rid);

    return {
      rootIds: remappedRootIds,
      nodes: remappedNodes,
    };
  }

  private static deleteSubtree(
    nodes: Record<string, any>,
    targetNodeId: string
  ): Record<string, any> {
    const idsToDelete = new Set<string>();
    const collect = (id: string) => {
      idsToDelete.add(id);
      const node = nodes[id];
      if (node?.children) {
        for (const cid of node.children) {
          collect(cid);
        }
      }
    };
    collect(targetNodeId);

    const remaining: Record<string, any> = {};
    for (const [id, node] of Object.entries(nodes)) {
      if (!idsToDelete.has(id)) {
        remaining[id] = node;
      }
    }
    return remaining;
  }

  private static isNativeOrbitoxJson(text: string): boolean {
    const trimmed = text.trim();
    return (
      (trimmed.startsWith('{') && trimmed.includes('"orbitox":') && trimmed.includes('"nodes":')) ||
      (trimmed.startsWith('{') && trimmed.includes('"rootIds":') && trimmed.includes('"nodes":'))
    );
  }

  private static isSvgCode(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith('<svg') && trimmed.endsWith('</svg>');
  }

  private static generateHtmlPreview(rootIds: string[], nodes: Record<string, any>): string {
    const parts = rootIds
      .map((id) => nodes[id])
      .filter(Boolean)
      .map((n) => `<div style="font-family:Inter,sans-serif;padding:12px;background:#0B0F19;color:#FFFFFF;border-radius:8px;">${n.name || 'OrbitoX Node'}</div>`);
    return parts.join('\n');
  }

  private static generateSvgPreview(rootIds: string[], nodes: Record<string, any>): string {
    const firstRoot = rootIds[0] ? nodes[rootIds[0]] : null;
    if (firstRoot?.content?.vectorSvgPath) {
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="${firstRoot.content.vectorSvgPath}" fill="#DFBA6B"/></svg>`;
    }
    return `<svg viewBox="0 0 200 60" width="200" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="60" rx="8" fill="#0B0F19"/><text x="20" y="35" fill="#DFBA6B" font-family="sans-serif" font-size="14">OrbitoX Node</text></svg>`;
  }

  private static generatePlainText(rootIds: string[], nodes: Record<string, any>): string {
    const lines: string[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = nodes[id];
      if (!node) return;

      if (node.content?.text) lines.push(node.content.text);
      else if (node.textContent) lines.push(node.textContent);
      else if (node.name && (!node.children || node.children.length === 0)) lines.push(node.name);

      if (Array.isArray(node.children)) {
        for (const cid of node.children) {
          traverse(cid);
        }
      }
    };

    for (const id of rootIds) {
      traverse(id);
    }
    return lines.join('\n');
  }

  private static renderJsxNode(node: any, nodes: Record<string, any>, indent: number): string {
    const sp = ' '.repeat(indent);
    const kind = node.kind || node.type || 'frame';

    if (kind === 'text' || kind === 'heading' || kind === 'paragraph') {
      const text = node.content?.text || node.textContent || 'Text Content';
      const tag = kind === 'heading' ? 'h2' : 'p';
      return `${sp}<${tag} className="text-white">${text}</${tag}>`;
    }

    if (kind === 'button') {
      const text = node.content?.text || node.textContent || 'Click Here';
      return `${sp}<button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg">\n${sp}  ${text}\n${sp}</button>`;
    }

    if (kind === 'image') {
      const src = node.content?.imageRef || 'https://images.unsplash.com/photo-1519741497674-611481863552';
      const alt = node.content?.altText || 'Image';
      return `${sp}<img src="${src}" alt="${alt}" className="rounded-xl w-full object-cover" />`;
    }

    // Container / frame
    const childrenJsx = (node.children || [])
      .map((cid: string) => nodes[cid] ? this.renderJsxNode(nodes[cid], nodes, indent + 2) : '')
      .filter(Boolean)
      .join('\n');

    return `${sp}<div className="flex flex-col gap-4 p-6 bg-slate-950 rounded-2xl border border-slate-800">\n${childrenJsx}\n${sp}</div>`;
  }

  private static renderHtmlNode(node: any, nodes: Record<string, any>, indent: number): string {
    const sp = ' '.repeat(indent);
    const kind = node.kind || node.type || 'frame';

    if (kind === 'text' || kind === 'heading' || kind === 'paragraph') {
      const text = node.content?.text || node.textContent || 'Text Content';
      return `${sp}<p style="margin:0;font-size:16px;">${text}</p>`;
    }

    if (kind === 'button') {
      const text = node.content?.text || node.textContent || 'Click Here';
      return `${sp}<button style="padding:10px 20px;background:#DFBA6B;color:#060B1A;border:none;border-radius:8px;font-weight:600;cursor:pointer;">${text}</button>`;
    }

    const childrenHtml = (node.children || [])
      .map((cid: string) => nodes[cid] ? this.renderHtmlNode(nodes[cid], nodes, indent + 2) : '')
      .filter(Boolean)
      .join('\n');

    return `${sp}<div style="display:flex;flex-direction:column;gap:16px;padding:24px;background:#0A0F1D;border-radius:12px;">\n${childrenHtml}\n${sp}</div>`;
  }

  private static generateCssRules(root: any, nodes: Record<string, any>): string {
    return `.orbitox-${this.toKebabCase(root.name || 'node')} {
  box-sizing: border-box;
  font-family: Inter, system-ui, sans-serif;
  color: #FFFFFF;
}`;
  }

  private static toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('') || 'Component';
  }

  private static toKebabCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'node';
  }
}
