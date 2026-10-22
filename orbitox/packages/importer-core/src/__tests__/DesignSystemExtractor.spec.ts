import { DesignSystemExtractor } from '../pipeline/DesignSystemExtractor';
import { ComponentDetector } from '../pipeline/ComponentDetector';
import { FidelityAuditor } from '../pipeline/FidelityAuditor';
import { ImportedProject } from '../types/ImportIR';

describe('P26.1 Pipeline — DesignSystemExtractor, ComponentDetector & FidelityAuditor', () => {
  describe('CIELAB Color Space & Clustering', () => {
    test('converts pure black, white, and colors to CIELAB accurately', () => {
      const blackLab = DesignSystemExtractor.rgbToLab(0, 0, 0);
      expect(blackLab.L).toBeCloseTo(0, 1);

      const whiteLab = DesignSystemExtractor.rgbToLab(255, 255, 255);
      expect(whiteLab.L).toBeCloseTo(100, 1);

      const redLab = DesignSystemExtractor.rgbToLab(255, 0, 0);
      expect(redLab.L).toBeGreaterThan(45);
      expect(redLab.a).toBeGreaterThan(50);
    });

    test('calculates CIELAB Delta-E distance and clusters perceptually identical hex codes', () => {
      // #0f172a (RGB: 15, 23, 42) vs #111827 (RGB: 17, 24, 39) - very close dark slate colors
      const lab1 = DesignSystemExtractor.rgbToLab(15, 23, 42);
      const lab2 = DesignSystemExtractor.rgbToLab(17, 24, 39);
      const deltaE = DesignSystemExtractor.cielabDeltaE(lab1, lab2);

      // Delta-E should be less than 2.3 (JND threshold)
      expect(deltaE).toBeLessThan(DesignSystemExtractor.JND_THRESHOLD);
    });

    test('clusters similar dark background colors into a single semantic token', () => {
      const mockProject: ImportedProject = {
        irVersion: '2.0',
        sourceFormat: 'html_css',
        sourceOrigin: { importedAt: new Date().toISOString() },
        metadata: { title: 'Test Project' },
        designTokens: { colors: {}, typography: {}, spacing: {}, shadows: {}, radii: {} },
        pages: [
          {
            id: 'page_1',
            name: 'Home',
            route: '/',
            isHome: true,
            sections: [
              {
                id: 'sec_1',
                name: 'Hero',
                geometry: { height: 'screen' },
                style: { backgroundColor: '#0F172A' },
                rootNodeId: 'node_1',
                nodes: {
                  node_1: {
                    id: 'node_1',
                    name: 'Container',
                    kind: 'frame',
                    parentId: null,
                    children: ['node_2', 'node_3'],
                    layout: { mode: 'flex', direction: 'vertical' },
                    geometry: { width: 'full', height: 'auto' },
                    style: { fills: [{ type: 'solid', color: '#111827' }] },
                  },
                  node_2: {
                    id: 'node_2',
                    name: 'Heading',
                    kind: 'heading',
                    parentId: 'node_1',
                    children: [],
                    layout: { mode: 'flow' },
                    geometry: { width: 'auto', height: 'auto' },
                    style: {},
                    typography: {
                      fontFamily: 'Inter',
                      fontSize: 32,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: '#F8FAFC',
                    },
                  },
                  node_3: {
                    id: 'node_3',
                    name: 'Button',
                    kind: 'button',
                    parentId: 'node_1',
                    children: [],
                    layout: { mode: 'flex' },
                    geometry: { width: 140, height: 44 },
                    style: { fills: [{ type: 'solid', color: '#3B82F6' }] },
                  },
                },
                renderOrder: ['node_1', 'node_2', 'node_3'],
              },
            ],
          },
        ],
        globalComponents: {},
        assets: {},
        sourceTrace: {},
        confidenceReport: {
          overallScore: 90,
          totalNodes: 3,
          highConfidenceCount: 3,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          unsupportedFeatures: [],
          warnings: [],
        },
      };

      const result = DesignSystemExtractor.extractAndCluster(mockProject);
      expect(result.clusteredTokens.length).toBeGreaterThan(0);

      // Verify node fills got clustered token references
      const containerNode = result.project.pages[0]?.sections[0]?.nodes['node_1'];
      expect(containerNode?.style.fills?.[0]?.clusteredTokenRef).toBeDefined();

      const headingNode = result.project.pages[0]?.sections[0]?.nodes['node_2'];
      expect(headingNode?.typography?.colorClusteredTokenRef).toBeDefined();
    });
  });

  describe('ComponentDetector', () => {
    test('detects repeating structural subtrees and synthesizes Master Component', () => {
      const mockProject: ImportedProject = {
        irVersion: '2.0',
        sourceFormat: 'html_css',
        sourceOrigin: { importedAt: new Date().toISOString() },
        metadata: { title: 'Cards Project' },
        designTokens: { colors: {}, typography: {}, spacing: {}, shadows: {}, radii: {} },
        pages: [
          {
            id: 'page_1',
            name: 'Home',
            route: '/',
            isHome: true,
            sections: [
              {
                id: 'sec_1',
                name: 'Cards Section',
                geometry: { height: 'auto' },
                style: {},
                rootNodeId: 'root',
                nodes: {
                  root: {
                    id: 'root',
                    name: 'Grid',
                    kind: 'grid',
                    parentId: null,
                    children: ['card_1', 'card_2'],
                    layout: { mode: 'grid' },
                    geometry: { width: 'full', height: 'auto' },
                    style: {},
                  },
                  card_1: {
                    id: 'card_1',
                    name: 'Pricing Card A',
                    kind: 'frame',
                    parentId: 'root',
                    children: ['btn_1'],
                    layout: { mode: 'flex', direction: 'vertical' },
                    geometry: { width: 300, height: 400 },
                    style: {},
                  },
                  btn_1: {
                    id: 'btn_1',
                    name: 'Button 1',
                    kind: 'button',
                    parentId: 'card_1',
                    children: [],
                    layout: { mode: 'flex' },
                    geometry: { width: 'full', height: 44 },
                    style: {},
                    content: { text: 'Choose Basic' },
                  },
                  card_2: {
                    id: 'card_2',
                    name: 'Pricing Card B',
                    kind: 'frame',
                    parentId: 'root',
                    children: ['btn_2'],
                    layout: { mode: 'flex', direction: 'vertical' },
                    geometry: { width: 300, height: 400 },
                    style: {},
                  },
                  btn_2: {
                    id: 'btn_2',
                    name: 'Button 2',
                    kind: 'button',
                    parentId: 'card_2',
                    children: [],
                    layout: { mode: 'flex' },
                    geometry: { width: 'full', height: 44 },
                    style: {},
                    content: { text: 'Choose Pro' },
                  },
                },
                renderOrder: ['root', 'card_1', 'btn_1', 'card_2', 'btn_2'],
              },
            ],
          },
        ],
        globalComponents: {},
        assets: {},
        sourceTrace: {},
        confidenceReport: {
          overallScore: 95,
          totalNodes: 5,
          highConfidenceCount: 5,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          unsupportedFeatures: [],
          warnings: [],
        },
      };

      const updated = ComponentDetector.detectAndSynthesize(mockProject, { minOccurrences: 2, minDepth: 2 });
      expect(Object.keys(updated.globalComponents).length).toBe(1);

      const masterId = Object.keys(updated.globalComponents)[0]!;
      expect(updated.globalComponents[masterId]?.name).toContain('Frame Component');
    });
  });

  describe('FidelityAuditor', () => {
    test('computes mathematical confidence score and explainability tree', () => {
      const mockProject: ImportedProject = {
        irVersion: '2.0',
        sourceFormat: 'html_css',
        sourceOrigin: { importedAt: new Date().toISOString() },
        metadata: { title: 'Audited Project' },
        designTokens: {
          colors: { c1: { value: '#000', inferredRole: 'background' } },
          typography: { t1: { fontFamily: 'Inter', fallback: 'sans-serif', weights: [400] } },
          spacing: {},
          shadows: {},
          radii: {},
        },
        pages: [
          {
            id: 'page_1',
            name: 'Home',
            route: '/',
            isHome: true,
            sections: [
              {
                id: 'sec_1',
                name: 'Hero',
                geometry: { height: 'screen' },
                style: {},
                rootNodeId: 'node_1',
                nodes: {
                  node_1: {
                    id: 'node_1',
                    name: 'Frame',
                    kind: 'frame',
                    parentId: null,
                    children: [],
                    layout: { mode: 'flex' },
                    geometry: { width: 'full', height: 400 },
                    style: { fills: [{ type: 'solid', color: '#000' }] },
                  },
                },
                renderOrder: ['node_1'],
              },
            ],
          },
        ],
        globalComponents: {},
        assets: {},
        sourceTrace: {},
        confidenceReport: {
          overallScore: 100,
          totalNodes: 1,
          highConfidenceCount: 1,
          mediumConfidenceCount: 0,
          lowConfidenceCount: 0,
          unsupportedFeatures: [],
          warnings: [],
        },
      };

      const report = FidelityAuditor.audit(mockProject);
      expect(report.overallScore).toBeGreaterThanOrEqual(90);
      expect(report.classification).toBe('native');
      expect(report.summaryText).toContain('Native Editable');
      expect(report.stats.totalElements).toBe(1);
      expect(report.heuristics.length).toBeGreaterThan(0);
    });
  });
});
