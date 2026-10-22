import { SceneGraph, SceneGraphNode } from './SceneGraphTypes';
import { SceneGraphEngine } from './SceneGraphEngine';
import { SystemClipboardBridge, ORBITOX_MIME_TYPE } from '@orbitox-io/importer-core';
import { AssetIngestionService } from '../services/AssetIngestionService';
import { IdAllocator } from './IdAllocator';

/**
 * Clipboard entry: a serializable snapshot of one or more subtrees,
 * ready to be pasted with fresh IDs.
 */
export interface ClipboardEntry {
  /** Root node IDs of the copied subtrees (in original order) */
  rootIds: string[];
  /** Flat map of all nodes in the clipboard (original IDs) */
  nodes: Record<string, SceneGraphNode>;
  /** Source sceneId the nodes were copied from */
  sourceSceneId: string;
  /** Timestamp of the copy operation */
  copiedAt: string;
}

const STORAGE_CLIPBOARD_KEY = 'orbitox_scenegraph_clipboard_snapshot';

/**
 * P26: Professional Multi-MIME & Paste-Special SceneGraph Clipboard Engine.
 * Handles deep clone, ID remapping, cross-tab sync, system clipboard bridge,
 * Paste Special (Replace, Styles, Coordinates), and Copy as Code.
 */
export class SceneGraphClipboard {
  private static clipboard: ClipboardEntry | null = null;

  // ─────────────────────────────────────────────────────────────
  // 1. COPY & CUT
  // ─────────────────────────────────────────────────────────────

  /**
   * Copy selected node IDs (and all their descendants) to clipboard.
   * Also synchronizes to localStorage for cross-tab persistence and OS system clipboard.
   */
  static copy(graph: SceneGraph, nodeIds: string[], sceneId: string): ClipboardEntry {
    const nodes: Record<string, SceneGraphNode> = {};

    const collectSubtree = (id: string) => {
      const node = graph.nodes[id];
      if (!node) return;
      nodes[id] = JSON.parse(JSON.stringify(node));
      for (const childId of node.children) {
        collectSubtree(childId);
      }
    };

    // Filter out nodes that are descendants of other selected nodes
    // to avoid double-copying
    const rootIds = nodeIds.filter((id) => {
      const node = graph.nodes[id];
      if (!node) return false;
      let current = node;
      while (current.parentId) {
        if (nodeIds.includes(current.parentId)) return false;
        const parent = graph.nodes[current.parentId];
        if (!parent) break;
        current = parent;
      }
      return true;
    });

    for (const id of rootIds) {
      collectSubtree(id);
    }

    const entry: ClipboardEntry = {
      rootIds,
      nodes,
      sourceSceneId: sceneId,
      copiedAt: new Date().toISOString(),
    };

    this.clipboard = entry;

    // Cross-tab synchronization via localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CLIPBOARD_KEY, JSON.stringify(entry));
      } catch (e) {
        console.warn('Failed to sync clipboard snapshot to localStorage', e);
      }

      // Synchronize to OS System Clipboard asynchronously
      this.writeToSystemClipboard(entry).catch((err) => {
        // Fallback silently if system clipboard permissions not granted
        console.debug('System clipboard write deferred or unsupported:', err);
      });
    }

    return entry;
  }

  static cut(
    graph: SceneGraph,
    nodeIds: string[],
    sceneId: string
  ): { entry: ClipboardEntry; graph: SceneGraph } {
    const entry = this.copy(graph, nodeIds, sceneId);

    // Delete all root-level selected nodes (descendants go with them)
    let g = graph;
    for (const id of entry.rootIds) {
      g = SceneGraphEngine.deleteNode(g, id);
    }

    return { entry, graph: g };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PASTE & PASTE SPECIAL
  // ─────────────────────────────────────────────────────────────

  /**
   * Paste clipboard contents into a target parent, remapping all IDs.
   */
  static paste(
    graph: SceneGraph,
    targetParentId: string,
    insertIndex?: number
  ): { graph: SceneGraph; pastedRootIds: string[] } {
    const entry = this.getClipboard();
    if (!entry) return { graph, pastedRootIds: [] };

    const idMap = new Map<string, string>();
    const newNodes: Record<string, SceneGraphNode> = {};

    // Generate fresh IDs for every node in the clipboard
    for (const oldId of Object.keys(entry.nodes)) {
      const freshId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(oldId, freshId);
    }

    // Clone all nodes with remapped IDs
    for (const [oldId, oldNode] of Object.entries(entry.nodes)) {
      const newId = idMap.get(oldId)!;
      const cloned: SceneGraphNode = JSON.parse(JSON.stringify(oldNode));
      cloned.id = newId;
      cloned.name = `${cloned.name}`;

      // Remap parentId
      if (cloned.parentId && idMap.has(cloned.parentId)) {
        cloned.parentId = idMap.get(cloned.parentId)!;
      } else if (entry.rootIds.includes(oldId)) {
        cloned.parentId = targetParentId;
      }

      // Remap children
      cloned.children = cloned.children
        .map((childId) => idMap.get(childId))
        .filter((id): id is string => !!id);

      newNodes[newId] = cloned;
    }

    // Merge into graph
    const mergedNodes = { ...graph.nodes, ...newNodes };

    // Add pasted roots to target parent's children
    const pastedRootIds = entry.rootIds
      .map((id) => idMap.get(id))
      .filter((id): id is string => !!id);

    if (mergedNodes[targetParentId]) {
      const parentChildren = [...mergedNodes[targetParentId].children];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= parentChildren.length) {
        parentChildren.splice(insertIndex, 0, ...pastedRootIds);
      } else {
        parentChildren.push(...pastedRootIds);
      }
      mergedNodes[targetParentId] = {
        ...mergedNodes[targetParentId],
        children: parentChildren,
      };
    }

    return {
      graph: {
        ...graph,
        nodes: mergedNodes,
        renderOrder: this.buildRenderOrder(mergedNodes, graph.rootNodeId),
      },
      pastedRootIds,
    };
  }

  /**
   * Paste to Replace: Replaces targetNodeId with the clipboard root subtree,
   * retaining original position, parent, and sibling index.
   */
  static pasteToReplace(
    graph: SceneGraph,
    targetNodeId: string
  ): { graph: SceneGraph; replacedWithId: string | null } {
    const targetNode = graph.nodes[targetNodeId];
    if (!targetNode || !targetNode.parentId) return { graph, replacedWithId: null };

    const parentNode = graph.nodes[targetNode.parentId];
    if (!parentNode) return { graph, replacedWithId: null };

    const siblingIndex = parentNode.children.indexOf(targetNodeId);

    // Delete existing target node
    const deletedGraph = SceneGraphEngine.deleteNode(graph, targetNodeId);

    // Paste into same parent at same sibling index
    const { graph: finalGraph, pastedRootIds } = this.paste(
      deletedGraph,
      targetNode.parentId,
      siblingIndex >= 0 ? siblingIndex : undefined
    );

    return {
      graph: finalGraph,
      replacedWithId: pastedRootIds[0] || null,
    };
  }

  /**
   * Paste Styles Only: Copies visual styling (background, border, typography, effects)
   * from the clipboard root node onto targetNodeId without altering geometry or content.
   */
  static pasteStylesOnly(graph: SceneGraph, targetNodeId: string): SceneGraph {
    const entry = this.getClipboard();
    if (!entry || entry.rootIds.length === 0) return graph;

    const sourceRootId = entry.rootIds[0]!;
    const sourceNode = entry.nodes[sourceRootId];
    const targetNode = graph.nodes[targetNodeId];

    if (!sourceNode || !targetNode) return graph;

    const updatedNode: SceneGraphNode = {
      ...targetNode,
      style: JSON.parse(JSON.stringify(sourceNode.style || {})),
    };

    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [targetNodeId]: updatedNode,
      },
    };
  }

  /**
   * Paste at specific canvas coordinates
   */
  static pasteAtCoordinates(
    graph: SceneGraph,
    targetParentId: string,
    x: number,
    y: number
  ): { graph: SceneGraph; pastedRootIds: string[] } {
    const { graph: pastedGraph, pastedRootIds } = this.paste(graph, targetParentId);
    if (pastedRootIds.length === 0) return { graph: pastedGraph, pastedRootIds };

    const updatedNodes = { ...pastedGraph.nodes };
    for (const rootId of pastedRootIds) {
      const node = updatedNodes[rootId];
      if (node) {
        updatedNodes[rootId] = {
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
      graph: {
        ...pastedGraph,
        nodes: updatedNodes,
      },
      pastedRootIds,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SYSTEM CLIPBOARD & COPY AS CODE
  // ─────────────────────────────────────────────────────────────

  /**
   * Writes multi-MIME payload to OS System Clipboard via SystemClipboardBridge
   */
  static async writeToSystemClipboard(entry: ClipboardEntry): Promise<void> {
    if (typeof navigator === 'undefined') return;
    try {
      await SystemClipboardBridge.writeToClipboard(entry.rootIds, entry.nodes);
    } catch (err) {
      console.debug('System clipboard write deferred or unsupported:', err);
    }
  }

  /**
   * Asynchronously reads from the OS system clipboard and ingests into target parent
   */
  static async pasteFromSystemClipboard(
    graph: SceneGraph,
    targetParentId: string
  ): Promise<{ graph: SceneGraph; pastedRootIds: string[] }> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return this.paste(graph, targetParentId);
    }

    try {
      let orbitoxJson: string | undefined;
      let html: string | undefined;
      let svg: string | undefined;
      let plainText: string | undefined;

      if (navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            // 1. Binary image paste (PNG/JPEG/WebP)
            const imageMime = item.types.find(
              (t) => t.startsWith('image/') && t !== 'image/svg+xml'
            );
            if (imageMime) {
              const blob = await item.getType(imageMime);
              const ext = imageMime.split('/')[1] || 'png';
              const file = new File([blob], `pasted_image_${Date.now()}.${ext}`, { type: imageMime });
              const ingested = await AssetIngestionService.ingestFile(file);

              const imgW = ingested.dimensions?.width ? Math.min(ingested.dimensions.width, 600) : 320;
              const imgH = ingested.dimensions?.height && ingested.dimensions?.width
                ? Math.round(imgW * (ingested.dimensions.height / ingested.dimensions.width))
                : 240;

              const { graph: gWithNode, newNodeId } = SceneGraphEngine.createNode(
                graph,
                'image',
                targetParentId,
                {
                  name: `Pasted ${ingested.name}`,
                  geometry: {
                    position: 'flow',
                    x: 0,
                    y: 0,
                    width: `${imgW}px`,
                    height: `${imgH}px`,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    opacity: 1,
                    zIndex: 0,
                  },
                  style: {
                    objectFit: 'contain',
                  },
                  props: {
                    src: ingested.objectUrl,
                    alt: ingested.name,
                    width: ingested.dimensions?.width,
                    height: ingested.dimensions?.height,
                  },
                }
              );

              return {
                graph: gWithNode,
                pastedRootIds: [newNodeId],
              };
            }

            if (item.types.includes(ORBITOX_MIME_TYPE)) {
              const blob = await item.getType(ORBITOX_MIME_TYPE);
              orbitoxJson = await blob.text();
            }
            if (item.types.includes('image/svg+xml')) {
              const blob = await item.getType('image/svg+xml');
              svg = await blob.text();
            }
            if (item.types.includes('text/html')) {
              const blob = await item.getType('text/html');
              html = await blob.text();
            }
            if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              plainText = await blob.text();
            }
          }
        } catch {
          // Fallback to readText if read() is not permitted
        }
      }

      if (!orbitoxJson && !html && !svg && !plainText && navigator.clipboard.readText) {
        plainText = await navigator.clipboard.readText();
      }

      if (orbitoxJson || html || svg || plainText) {
        const ingestRes = await SystemClipboardBridge.ingestClipboardData({
          orbitoxJson,
          html,
          svg,
          plainText,
        });

        if (ingestRes.rootIds.length > 0) {
          const { nodes: updatedNodes, pastedRootIds } = SystemClipboardBridge.paste(
            graph,
            targetParentId,
            ingestRes.nodes,
            ingestRes.rootIds
          );

          return {
            graph: {
              ...graph,
              nodes: updatedNodes as Record<string, SceneGraphNode>,
            },
            pastedRootIds,
          };
        }
      }
    } catch (e) {
      console.warn('System clipboard read failed, falling back to internal clipboard:', e);
    }

    return this.paste(graph, targetParentId);
  }

  /**
   * Generate code string representation of a node via SystemClipboardBridge
   */
  static copyAsCode(
    graph: SceneGraph,
    nodeId: string,
    format: 'jsx' | 'html' | 'svg' | 'json'
  ): string {
    const node = graph.nodes[nodeId];
    if (!node) return '';

    let code = '';
    switch (format) {
      case 'json':
        code = SystemClipboardBridge.copyAsJson(nodeId, graph.nodes);
        break;
      case 'html':
        code = SystemClipboardBridge.copyAsHtmlCss(nodeId, graph.nodes);
        break;
      case 'jsx':
        code = SystemClipboardBridge.copyAsJsx(nodeId, graph.nodes);
        break;
      case 'svg':
        code = SystemClipboardBridge.copyAsSvg(nodeId, graph.nodes);
        break;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }

    return code;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. UTILITIES & RECOVERY
  // ─────────────────────────────────────────────────────────────

  static hasClipboard(): boolean {
    return this.getClipboard() !== null;
  }

  static getClipboard(): ClipboardEntry | null {
    if (this.clipboard) return this.clipboard;

    // Recover from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_CLIPBOARD_KEY);
        if (stored) {
          this.clipboard = JSON.parse(stored);
          return this.clipboard;
        }
      } catch {
        // Ignored
      }
    }
    return null;
  }

  static clearClipboard(): void {
    this.clipboard = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_CLIPBOARD_KEY);
      } catch {
        // Ignored
      }
    }
  }

  private static buildRenderOrder(nodes: Record<string, SceneGraphNode>, rootId: string): string[] {
    const order: string[] = [];
    const traverse = (id: string) => {
      order.push(id);
      const node = nodes[id];
      if (node?.children) {
        for (const childId of node.children) {
          traverse(childId);
        }
      }
    };
    traverse(rootId);
    return order;
  }

  private static generateHtmlPreview(entry: ClipboardEntry): string {
    const rootNodes = entry.rootIds.map((id) => entry.nodes[id]).filter(Boolean);
    return rootNodes.map((n) => `<div style="font-family:sans-serif;padding:8px;">${n?.name || 'Node'}</div>`).join('');
  }

  private static generatePlainText(entry: ClipboardEntry): string {
    const texts: string[] = [];
    for (const node of Object.values(entry.nodes)) {
      if (node.textContent) texts.push(node.textContent);
      else if (node.name) texts.push(node.name);
    }
    return texts.join('\n');
  }

  private static nodeToHtml(node: SceneGraphNode, graph: SceneGraph): string {
    const tag = node.kind === 'button' ? 'button' : node.kind === 'image' ? 'img' : 'div';
    const content = node.textContent || (node.children.map(cid => this.nodeToHtml(graph.nodes[cid]!, graph)).join(''));
    return `<${tag} class="orbitox-${node.kind}" style="display:flex;">${content}</${tag}>`;
  }

  private static nodeToJsx(node: SceneGraphNode, graph: SceneGraph): string {
    const tag = node.kind === 'button' ? 'button' : node.kind === 'image' ? 'img' : 'div';
    const content = node.textContent ? `{\`${node.textContent}\`}` : (node.children.map(cid => this.nodeToJsx(graph.nodes[cid]!, graph)).join('\n'));
    return `<${tag} className="flex flex-col">${content}</${tag}>`;
  }

  private static nodeToSvg(node: SceneGraphNode): string {
    if (node.props?.vectorPath) {
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="${node.props.vectorPath}" fill="currentColor"/></svg>`;
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="8" fill="#3B82F6"/></svg>`;
  }
}
