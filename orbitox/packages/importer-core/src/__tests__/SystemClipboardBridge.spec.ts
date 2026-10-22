import {
  SystemClipboardBridge,
  ORBITOX_MIME_TYPE,
} from '../clipboard/SystemClipboardBridge';

describe('SystemClipboardBridge (Phase P26.9)', () => {
  const sampleNodes: Record<string, any> = {
    card_root: {
      id: 'card_root',
      name: 'Celebration VIP Card',
      kind: 'frame',
      type: 'frame',
      parentId: null,
      children: ['heading_1', 'btn_rsvp'],
      geometry: { position: 'flow', x: 0, y: 0, width: 380, height: 260, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        fills: [{ type: 'solid', color: '#0F172A' }],
        borderRadius: 16,
      },
    },
    heading_1: {
      id: 'heading_1',
      name: 'Gala Title',
      kind: 'heading',
      type: 'text',
      parentId: 'card_root',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'full', height: 'auto', rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {},
      typography: {
        fontFamily: 'Cinzel',
        fontSize: 28,
        fontWeight: 700,
        color: '#DFBA6B',
      },
      content: { text: 'Golden Anniversary Gala' },
      textContent: 'Golden Anniversary Gala',
    },
    btn_rsvp: {
      id: 'btn_rsvp',
      name: 'RSVP Action',
      kind: 'button',
      type: 'button',
      parentId: 'card_root',
      children: [],
      geometry: { position: 'flow', x: 0, y: 0, width: 'auto', height: 48, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, zIndex: 1 },
      style: {
        fills: [{ type: 'solid', color: '#DFBA6B' }],
        borderRadius: 8,
      },
      content: { text: 'Confirm Attendance', buttonHref: '/rsvp' },
      textContent: 'Confirm Attendance',
    },
  };

  describe('1. Multi-MIME Serialization', () => {
    it('serializes nodes simultaneously into all 4 canonical MIME formats', () => {
      const mimeData = SystemClipboardBridge.serializeToMultiMime(['card_root'], sampleNodes);

      // 1. Native Orbitox JSON
      expect(mimeData.orbitoxJson).toBeDefined();
      const parsed = JSON.parse(mimeData.orbitoxJson);
      expect(parsed.orbitox).toBe(true);
      expect(parsed.schemaVersion).toBe('1.0');
      expect(parsed.rootIds).toEqual(['card_root']);
      expect(Object.keys(parsed.nodes)).toHaveLength(3);

      // 2. W3C HTML5 Preview
      expect(mimeData.html).toContain('Celebration VIP Card');
      expect(mimeData.html).toContain('<div');

      // 3. SVG Vector representation
      expect(mimeData.svg).toContain('<svg');
      expect(mimeData.svg).toContain('</svg>');

      // 4. Plain Text content
      expect(mimeData.plainText).toContain('Golden Anniversary Gala');
      expect(mimeData.plainText).toContain('Confirm Attendance');
    });

    it('exports ORBITOX_MIME_TYPE constant for browser clipboard interoperability', () => {
      expect(ORBITOX_MIME_TYPE).toBe('application/vnd.orbitox.scenegraph+json');
    });
  });

  describe('2. Ingestion & Sniffing Engine', () => {
    it('sniffs and ingests native Orbitox JSON with fresh collision-free IDs', async () => {
      const nativePayload = JSON.stringify({
        orbitox: true,
        schemaVersion: '1.0',
        rootIds: ['card_root'],
        nodes: sampleNodes,
        copiedAt: new Date().toISOString(),
      });

      const res = await SystemClipboardBridge.ingestClipboardData({
        orbitoxJson: nativePayload,
      });

      expect(res.format).toBe('orbitox_native');
      expect(res.rootIds).toHaveLength(1);
      const freshRootId = res.rootIds[0]!;
      expect(freshRootId).not.toBe('card_root');
      expect(res.nodes[freshRootId]).toBeDefined();

      // Check re-mapped children
      const rootNode = res.nodes[freshRootId]!;
      expect(rootNode.children).toHaveLength(2);
      for (const childId of rootNode.children) {
        expect(res.nodes[childId]).toBeDefined();
        expect(res.nodes[childId].parentId).toBe(freshRootId);
      }
    });

    it('sniffs and converts SVG vector data from clipboard into editable vector nodes', async () => {
      const svgCode = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 80 Q 52.5 10, 95 80 T 180 80" fill="none" stroke="#DFBA6B" stroke-width="2" />
      </svg>`;

      const res = await SystemClipboardBridge.ingestClipboardData({
        svg: svgCode,
      });

      expect(res.format).toBe('svg');
      expect(res.rootIds).toHaveLength(1);
      const vectorNode = res.nodes[res.rootIds[0]!]!;
      expect(vectorNode.kind).toBe('vector');
      expect(vectorNode.content?.vectorSvgPath).toContain('M10 80');
      expect(vectorNode.geometry.width).toBe(100);
      expect(vectorNode.geometry.height).toBe(100);
    });

    it('sniffs and compiles external HTML snippets into native SceneGraph nodes', async () => {
      const htmlSnippet = `<div class="p-6 bg-slate-900 rounded-xl text-white">
        <h2 class="text-2xl font-bold">External Web Snippet</h2>
        <p>Directly pasted from another application.</p>
      </div>`;

      const res = await SystemClipboardBridge.ingestClipboardData({
        html: htmlSnippet,
      });

      expect(res.format).toBe('html');
      expect(res.rootIds.length).toBeGreaterThan(0);
      const root = res.nodes[res.rootIds[0]!]!;
      expect(root).toBeDefined();
    });

    it('sniffs plain text and creates clean text node', async () => {
      const res = await SystemClipboardBridge.ingestClipboardData({
        plainText: 'Bespoke Invitation Header Text',
      });

      expect(res.format).toBe('text');
      expect(res.rootIds).toHaveLength(1);
      const textNode = res.nodes[res.rootIds[0]!]!;
      expect(textNode.kind).toBe('text');
      expect(textNode.content?.text).toBe('Bespoke Invitation Header Text');
    });
  });

  describe('3. Paste Special Operations', () => {
    it('paste: appends clipboard nodes into target parent', () => {
      const targetGraph = {
        nodes: {
          container_frame: {
            id: 'container_frame',
            name: 'Target Container',
            children: ['existing_child'],
            parentId: null,
          },
          existing_child: {
            id: 'existing_child',
            name: 'Existing Child',
            children: [],
            parentId: 'container_frame',
          },
        },
      };

      const res = SystemClipboardBridge.paste(
        targetGraph,
        'container_frame',
        sampleNodes,
        ['card_root']
      );

      const updatedParent = res.nodes['container_frame']!;
      expect(updatedParent.children).toHaveLength(2);
      expect(res.pastedRootIds).toHaveLength(1);
      const pastedId = res.pastedRootIds[0]!;
      expect(updatedParent.children[1]).toBe(pastedId);
      expect(res.nodes[pastedId]!.parentId).toBe('container_frame');
    });

    it('pasteToReplace: replaces target node in place preserving parent and sibling order', () => {
      const targetGraph = {
        nodes: {
          container_frame: {
            id: 'container_frame',
            children: ['node_a', 'node_b', 'node_c'],
            parentId: null,
          },
          node_a: { id: 'node_a', parentId: 'container_frame', children: [] },
          node_b: { id: 'node_b', parentId: 'container_frame', children: [], geometry: { width: 400, height: 200 } },
          node_c: { id: 'node_c', parentId: 'container_frame', children: [] },
        },
      };

      // Replace node_b with card_root
      const res = SystemClipboardBridge.pasteToReplace(
        targetGraph,
        'node_b',
        sampleNodes,
        ['card_root'],
        { preserveDimensions: true }
      );

      expect(res.replacedByRootId).toBeDefined();
      const newRootId = res.replacedByRootId!;

      const parent = res.nodes['container_frame']!;
      expect(parent.children).toEqual(['node_a', newRootId, 'node_c']);
      expect(res.nodes['node_b']).toBeUndefined(); // deleted
      expect(res.nodes[newRootId]!.geometry.width).toBe(400); // preserved
      expect(res.nodes[newRootId]!.geometry.height).toBe(200);
    });

    it('pasteStylesOnly: transfers style and typography to target without altering geometry or content', () => {
      const targetGraph = {
        nodes: {
          target_heading: {
            id: 'target_heading',
            name: 'Original Target Heading',
            kind: 'heading',
            geometry: { width: 500, height: 60, x: 20, y: 40 },
            content: { text: 'Untouched Target Text Content' },
            textContent: 'Untouched Target Text Content',
            style: { fills: [{ type: 'solid', color: '#111827' }] },
            typography: { fontFamily: 'Roboto', fontSize: 18, color: '#9CA3AF' },
          },
        },
      };

      // Source is heading_1 with Cinzel font and #DFBA6B color
      const res = SystemClipboardBridge.pasteStylesOnly(
        targetGraph,
        'target_heading',
        sampleNodes,
        ['heading_1']
      );

      expect(res.updatedNodeId).toBe('target_heading');
      const updated = res.nodes['target_heading']!;

      // Typography copied
      expect(updated.typography?.fontFamily).toBe('Cinzel');
      expect(updated.typography?.fontSize).toBe(28);
      expect(updated.typography?.color).toBe('#DFBA6B');

      // Geometry and Content untouched
      expect(updated.geometry.width).toBe(500);
      expect(updated.geometry.x).toBe(20);
      expect(updated.content?.text).toBe('Untouched Target Text Content');
    });

    it('pasteAtCoordinates: positions pasted root node at exact canvas x, y', () => {
      const targetGraph = {
        nodes: {
          canvas_root: {
            id: 'canvas_root',
            children: [],
            parentId: null,
          },
        },
      };

      const res = SystemClipboardBridge.pasteAtCoordinates(
        targetGraph,
        'canvas_root',
        sampleNodes,
        ['card_root'],
        340,
        520
      );

      const pastedId = res.pastedRootIds[0]!;
      const pasted = res.nodes[pastedId]!;
      expect(pasted.geometry.position).toBe('absolute');
      expect(pasted.geometry.x).toBe(340);
      expect(pasted.geometry.y).toBe(520);
    });
  });

  describe('4. Copy as Code Generators', () => {
    it('copyAsJsx: produces clean React functional component code', () => {
      const jsx = SystemClipboardBridge.copyAsJsx('card_root', sampleNodes);

      expect(jsx).toContain('export function CelebrationVipCard()');
      expect(jsx).toContain('<button');
      expect(jsx).toContain('Golden Anniversary Gala');
      expect(jsx).toContain('Confirm Attendance');
    });

    it('copyAsHtmlCss: produces semantic HTML5 with scoped CSS block', () => {
      const htmlCss = SystemClipboardBridge.copyAsHtmlCss('card_root', sampleNodes);

      expect(htmlCss).toContain('class="orbitox-celebration-vip-card"');
      expect(htmlCss).toContain('<style>');
      expect(htmlCss).toContain('.orbitox-celebration-vip-card');
      expect(htmlCss).toContain('Golden Anniversary Gala');
    });

    it('copyAsSvg: generates valid standalone SVG code', () => {
      const svg = SystemClipboardBridge.copyAsSvg('card_root', sampleNodes);

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
    });

    it('copyAsJson: generates formatted JSON AST', () => {
      const jsonStr = SystemClipboardBridge.copyAsJson('card_root', sampleNodes);

      const parsed = JSON.parse(jsonStr);
      expect(parsed.rootId).toBe('card_root');
      expect(parsed.nodes['card_root']).toBeDefined();
      expect(parsed.nodes['heading_1']).toBeDefined();
      expect(parsed.nodes['btn_rsvp']).toBeDefined();
    });
  });
});
