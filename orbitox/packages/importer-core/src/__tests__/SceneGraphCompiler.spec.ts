import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';
import { TokenExtractor } from '../pipeline/TokenExtractor';
import { SecuritySanitizer } from '../pipeline/SecuritySanitizer';
import { LayoutInferrer } from '../pipeline/LayoutInferrer';
import { ImportedProject, ImportedSection, ImportedNode } from '../types/ImportIR';

describe('SceneGraphCompiler & Ingestion Pipeline', () => {
  const sampleNodeRoot: ImportedNode = {
    id: 'node_root',
    name: 'Hero Section Frame',
    kind: 'frame',
    parentId: null,
    children: ['node_title', 'node_btn'],
    layout: {
      mode: 'flex',
      direction: 'vertical',
      gap: 24,
      padding: { top: 40, right: 32, bottom: 40, left: 32 },
      justifyContent: 'center',
      alignItems: 'center',
    },
    geometry: { width: '100%', height: 'auto' },
    style: {
      fills: [{ type: 'solid', color: '#0B0F19' }],
    },
    sourceTrace: { fidelityConfidence: 1.0 },
  };

  const sampleNodeTitle: ImportedNode = {
    id: 'node_title',
    name: 'Hero Title',
    kind: 'heading',
    parentId: 'node_root',
    children: [],
    layout: { mode: 'flow' },
    geometry: { width: 'auto', height: 'auto' },
    style: {},
    typography: {
      fontFamily: 'Playfair Display',
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#DFBA6B',
    },
    content: {
      text: 'Celestial Gala 2026',
    },
    sourceTrace: { fidelityConfidence: 1.0 },
  };

  const sampleNodeBtn: ImportedNode = {
    id: 'node_btn',
    name: 'RSVP Button',
    kind: 'button',
    parentId: 'node_root',
    children: [],
    layout: { mode: 'flow' },
    geometry: { width: 180, height: 48 },
    style: {
      fills: [{ type: 'solid', color: '#DFBA6B' }],
      borderRadius: 9999,
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1,
      color: '#0B0F19',
    },
    content: {
      text: 'RSVP Now',
      buttonHref: 'https://orbitox.io/rsvp',
    },
    sourceTrace: { fidelityConfidence: 1.0 },
  };

  const sampleSection: ImportedSection = {
    id: 'sec_hero',
    name: 'Hero Section',
    archetype: 'hero',
    geometry: { height: 'screen' },
    style: { backgroundColor: '#0B0F19' },
    rootNodeId: 'node_root',
    nodes: {
      node_root: sampleNodeRoot,
      node_title: sampleNodeTitle,
      node_btn: sampleNodeBtn,
    },
    renderOrder: ['node_root', 'node_title', 'node_btn'],
  };

  const sampleProject: ImportedProject = {
    irVersion: '1.0',
    sourceFormat: 'html_css',
    sourceOrigin: {
      importedAt: new Date().toISOString(),
    },
    metadata: {
      title: 'Celestial Gala Site',
      author: 'OrbitoX Creative Team',
    },
    designTokens: {
      colors: {
        bg: { value: '#0B0F19', inferredRole: 'background' },
        accent: { value: '#DFBA6B', inferredRole: 'accent' },
      },
      typography: {
        heading: { fontFamily: 'Playfair Display', fallback: 'serif', weights: [700] },
        body: { fontFamily: 'Inter', fallback: 'sans-serif', weights: [400, 600] },
      },
      spacing: { md: 16 },
      radii: { full: 9999 },
      shadows: {},
    },
    pages: [
      {
        id: 'page_home',
        name: 'Home',
        route: '/',
        isHome: true,
        sections: [sampleSection],
      },
    ],
    globalComponents: {},
    assets: {},
    sourceTrace: {},
    confidenceReport: {
      overallScore: 98,
      totalNodes: 3,
      highConfidenceCount: 3,
      mediumConfidenceCount: 0,
      lowConfidenceCount: 0,
      unsupportedFeatures: [],
      warnings: [],
    },
  };

  test('SceneGraphCompiler compiles full ImportedProject into TargetTemplateSchema', () => {
    const compiled = SceneGraphCompiler.compileProject(sampleProject);

    expect(compiled.name).toBe('Celestial Gala Site');
    expect(compiled.slug).toBe('celestial-gala-site');
    expect(compiled.pages).toHaveLength(1);
    expect(compiled.pages[0]?.route).toBe('/');
    expect(compiled.scenes).toHaveLength(1);

    const scene = compiled.scenes[0]!;
    expect(scene.name).toBe('Hero Section');
    expect(scene.sceneGraph.rootNodeId).toBe('node_root');
    expect(Object.keys(scene.sceneGraph.nodes)).toHaveLength(3);
    expect(scene.sceneGraph.renderOrder).toEqual(['node_root', 'node_title', 'node_btn']);

    const titleNode = scene.sceneGraph.nodes['node_title']!;
    expect(titleNode.kind).toBe('text');
    expect(titleNode.textContent).toBe('Celestial Gala 2026');
    expect(titleNode.style.typography?.fontSize).toBe('48px');

    const btnNode = scene.sceneGraph.nodes['node_btn']!;
    expect(btnNode.kind).toBe('button');
    expect(btnNode.props?.href).toBe('https://orbitox.io/rsvp');
  });

  test('SecuritySanitizer strips malicious script tags and inline handlers', () => {
    const dirtyHtml = '<p onclick="stealData()">Welcome<script>alert("hack")</script></p>';
    const cleanHtml = SecuritySanitizer.sanitizeHtml(dirtyHtml);

    expect(cleanHtml).not.toContain('<script>');
    expect(cleanHtml).not.toContain('onclick');
    expect(cleanHtml).toContain('Welcome');

    const unsafeUrl = 'http://169.254.169.254/latest/meta-data';
    expect(SecuritySanitizer.isSafeExternalUrl(unsafeUrl)).toBe(false);

    const safeUrl = 'https://images.unsplash.com/photo-123';
    expect(SecuritySanitizer.isSafeExternalUrl(safeUrl)).toBe(true);
  });

  test('TokenExtractor resolves background, accent, and typography tokens', () => {
    const tokens = TokenExtractor.compileDesignTokens(sampleProject.designTokens);

    expect(tokens.colors.backgroundPrimary).toBe('#0B0F19');
    expect(tokens.colors.accentPrimary).toBe('#DFBA6B');
    expect(tokens.typography.fontDisplay).toBe('Playfair Display');
    expect(tokens.typography.fontBody).toBe('Inter');
  });

  test('LayoutInferrer distinguishes vertical stacks from overlapping boxes', () => {
    const verticalBoxes = [
      { id: '1', x: 0, y: 0, width: 200, height: 40 },
      { id: '2', x: 0, y: 60, width: 200, height: 40 },
      { id: '3', x: 0, y: 120, width: 200, height: 40 },
    ];
    const verticalResult = LayoutInferrer.inferLayout(verticalBoxes);
    expect(verticalResult.mode).toBe('flex');
    expect(verticalResult.direction).toBe('vertical');

    const overlappingBoxes = [
      { id: '1', x: 0, y: 0, width: 100, height: 100 },
      { id: '2', x: 50, y: 50, width: 100, height: 100 },
    ];
    const overlapResult = LayoutInferrer.inferLayout(overlappingBoxes);
    expect(overlapResult.mode).toBe('absolute');
  });
});
