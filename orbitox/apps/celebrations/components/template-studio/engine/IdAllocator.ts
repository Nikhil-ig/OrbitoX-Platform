/**
 * ID ALLOCATOR SERVICE
 * 
 * Centralized, deterministic ID allocation owned by the Controller/Command layer.
 * 
 * Rules:
 * 1. Reducers MUST NEVER generate random IDs or call Date.now().
 * 2. All unique IDs (scenes, nodes, components) are allocated in the command creator
 *    before dispatching to the store.
 * 3. Supports deterministic seed mode for replay, CRDT, undo/redo, and automated tests.
 */

export class IdAllocator {
  private static counter = 0;
  private static isDeterministic = false;

  /**
   * Set allocator to deterministic mode (for replay, tests, or migration)
   */
  public static setDeterministic(enabled: boolean, startCounter = 0) {
    this.isDeterministic = enabled;
    this.counter = startCounter;
  }

  /**
   * Allocate a unique scene/section ID
   */
  public static allocateSceneId(prefix = 'scene', existingIds: string[] = []): string {
    let candidate = '';
    let attempt = 0;

    do {
      attempt++;
      if (this.isDeterministic) {
        this.counter++;
        candidate = `${prefix}_${this.counter}`;
      } else {
        const timePart = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 7);
        candidate = `${prefix}_${timePart}_${randomPart}`;
      }
    } while (existingIds.includes(candidate) && attempt < 100);

    return candidate;
  }

  /**
   * Allocate a unique node ID
   */
  public static allocateNodeId(kind = 'node', existingIds: string[] = []): string {
    let candidate = '';
    let attempt = 0;

    do {
      attempt++;
      if (this.isDeterministic) {
        this.counter++;
        candidate = `${kind}_${this.counter}`;
      } else {
        const timePart = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 7);
        candidate = `${kind}_${timePart}_${randomPart}`;
      }
    } while (existingIds.includes(candidate) && attempt < 100);

    return candidate;
  }

  /**
   * Clone a scene and recursively re-key all nodes deterministically
   */
  public static rekeyScene(
    scene: any,
    existingSceneIds: string[] = []
  ): { scene: any; idMap: Record<string, string> } {
    const newSceneId = this.allocateSceneId(scene.id ? `${scene.id}_copy` : 'scene', existingSceneIds);
    const idMap: Record<string, string> = {};
    const oldNodes = scene.sceneGraph?.nodes || {};

    // 1. Allocate fresh IDs for all nodes in the scene
    Object.keys(oldNodes).forEach((oldId) => {
      idMap[oldId] = this.allocateNodeId(oldNodes[oldId].kind || 'node');
    });

    // 2. Re-link parent, children, and root references
    const newNodes: Record<string, any> = {};
    Object.entries(oldNodes).forEach(([oldId, node]: [string, any]) => {
      const newId = idMap[oldId] || this.allocateNodeId(node?.kind || 'node');
      newNodes[newId] = {
        ...node,
        id: newId,
        parentId: node.parentId ? idMap[node.parentId] || node.parentId : undefined,
        children: (node.children || []).map((cId: string) => idMap[cId] || cId),
      };
    });

    const newRootId = scene.sceneGraph?.rootNodeId
      ? idMap[scene.sceneGraph.rootNodeId] || scene.sceneGraph.rootNodeId
      : '';

    const rekeyedScene = {
      ...scene,
      id: newSceneId,
      name: `${scene.name || 'Section'} (Copy)`,
      sceneGraph: scene.sceneGraph
        ? {
            ...scene.sceneGraph,
            rootNodeId: newRootId,
            nodes: newNodes,
          }
        : undefined,
    };

    return { scene: rekeyedScene, idMap };
  }
}
