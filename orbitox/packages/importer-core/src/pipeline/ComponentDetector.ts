import {
  ImportedProject,
  ImportedNode,
  ImportedComponent,
} from '../types/ImportIR';
import * as crypto from 'crypto';

export interface ComponentCluster {
  hash: string;
  representativeNodeId: string;
  rootNodes: Array<{ pageId: string; sectionId: string; nodeId: string }>;
  depth: number;
}

export class ComponentDetector {
  /**
   * Scan project and extract repeating structural subtree patterns into Master Components and Instances
   */
  static detectAndSynthesize(
    project: ImportedProject,
    options: { minOccurrences?: number; minDepth?: number } = {}
  ): ImportedProject {
    const minOccurrences = options.minOccurrences ?? 2;
    const minDepth = options.minDepth ?? 2;

    const clusters = new Map<string, ComponentCluster>();

    // 1. Compute structural hashes for all non-leaf nodes
    for (const page of project.pages || []) {
      for (const section of page.sections || []) {
        const nodes = section.nodes || {};

        for (const [nodeId, node] of Object.entries(nodes)) {
          if (!node.children || node.children.length === 0) continue;

          const depth = this.calculateDepth(node, nodes);
          if (depth < minDepth) continue;

          const hash = this.computeStructuralHash(node, nodes);
          const existing = clusters.get(hash);

          if (existing) {
            existing.rootNodes.push({ pageId: page.id, sectionId: section.id, nodeId });
          } else {
            clusters.set(hash, {
              hash,
              representativeNodeId: nodeId,
              rootNodes: [{ pageId: page.id, sectionId: section.id, nodeId }],
              depth,
            });
          }
        }
      }
    }

    // 2. Filter clusters that meet the occurrence threshold
    const eligibleClusters = Array.from(clusters.values()).filter(
      (c) => c.rootNodes.length >= minOccurrences
    );

    if (eligibleClusters.length === 0) {
      return project;
    }

    project.globalComponents = project.globalComponents || {};

    let compCounter = Object.keys(project.globalComponents).length + 1;

    for (const cluster of eligibleClusters) {
      // Find the representative node and section
      const rep = cluster.rootNodes[0]!;
      const repPage = (project.pages || []).find((p) => p.id === rep.pageId);
      const repSection = repPage?.sections?.find((s) => s.id === rep.sectionId);
      if (!repSection || !repSection.nodes) continue;

      const targetId = cluster.representativeNodeId || rep.nodeId;
      const repNode = repSection.nodes[targetId];
      if (!repNode) continue;

      // Deep clone the subtree to create the Master Component
      const masterId = `comp_master_${compCounter++}`;
      const masterName = `${this.capitalize(repNode.kind)} Component ${compCounter - 1}`;
      const masterNodes: Record<string, ImportedNode> = {};

      const collectNodes = (id: string) => {
        const n = repSection.nodes[id];
        if (!n) return;
        masterNodes[id] = JSON.parse(JSON.stringify(n));
        for (const childId of n.children || []) {
          collectNodes(childId);
        }
      };

      collectNodes(targetId);

      const masterComponent: ImportedComponent = {
        id: masterId,
        name: masterName,
        description: `Synthesized reusable master component with ${cluster.rootNodes.length} instances.`,
        rootNodeId: targetId,
        nodes: masterNodes,
        propertySchema: {
          title: { type: 'text', default: repNode.name || 'Component Title', label: 'Title' },
        },
      };

      project.globalComponents[masterId] = masterComponent;

      // 3. Mark instances in the project
      for (const instanceInfo of cluster.rootNodes) {
        const page = (project.pages || []).find((p) => p.id === instanceInfo.pageId);
        const section = page?.sections?.find((s) => s.id === instanceInfo.sectionId);
        if (!section || !section.nodes) continue;

        const targetNode = section.nodes[instanceInfo.nodeId];
        if (targetNode) {
          targetNode.sourceNodeId = targetNode.sourceNodeId || masterId;
          // Note: Keep kind or mark component_instance
          if (instanceInfo.nodeId !== targetId) {
            targetNode.kind = 'component_instance';
          }
        }
      }
    }

    return project;
  }

  /**
   * Compute structural hash of node and children, masking out localized text and image contents
   */
  static computeStructuralHash(
    node: ImportedNode,
    nodeMap: Record<string, ImportedNode>,
    depth = 0
  ): string {
    if (depth > 12) return 'max_depth';

    const childSignatures: string[] = [];
    for (const childId of node.children || []) {
      const child = nodeMap[childId];
      if (child) {
        childSignatures.push(this.computeStructuralHash(child, nodeMap, depth + 1));
      }
    }

    const structure = [
      node.kind,
      node.layout?.mode || 'none',
      node.layout?.direction || 'none',
      node.children?.length || 0,
      childSignatures.join('|'),
    ].join(':');

    return crypto.createHash('md5').update(structure).digest('hex').substring(0, 16);
  }

  private static calculateDepth(
    node: ImportedNode,
    nodeMap: Record<string, ImportedNode>,
    currentDepth = 1
  ): number {
    if (!node.children || node.children.length === 0) {
      return currentDepth;
    }
    let max = currentDepth;
    for (const childId of node.children) {
      const child = nodeMap[childId];
      if (child) {
        const d = this.calculateDepth(child, nodeMap, currentDepth + 1);
        if (d > max) max = d;
      }
    }
    return max;
  }

  private static capitalize(str: string): string {
    if (!str) return 'Custom';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
