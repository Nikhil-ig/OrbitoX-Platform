import { TailwindDecompiler } from '../pipeline/TailwindDecompiler';
import { HtmlAdapter } from '../adapters/HtmlAdapter';
import { ReactAdapter } from '../adapters/ReactAdapter';
import { SceneGraphCompiler } from '../compiler/SceneGraphCompiler';

describe('Phase P26.2: Code Ingestion Adapters & Tailwind Decompiler', () => {
  describe('TailwindDecompiler', () => {
    it('decompiles flex layout, alignment, and spacing', () => {
      const decompiled = TailwindDecompiler.decompile(
        'flex flex-col items-center justify-between gap-6 p-8 bg-slate-900 rounded-2xl'
      );

      expect(decompiled.layout.mode).toBe('flex');
      expect(decompiled.layout.direction).toBe('vertical');
      expect(decompiled.layout.alignItems).toBe('center');
      expect(decompiled.layout.justifyContent).toBe('space-between');
      expect(decompiled.layout.gap).toBe(24);
      expect(decompiled.layout.padding).toEqual({ top: 32, right: 32, bottom: 32, left: 32 });
      expect(decompiled.style.borderRadius).toBe(16);
      expect(decompiled.style.fills?.[0]?.color).toBe('#0f172a');
    });

    it('decompiles typography and colors including arbitrary values', () => {
      const decompiled = TailwindDecompiler.decompile(
        'text-3xl font-bold text-center text-white bg-[#1e293b] border-2 border-blue-500 shadow-xl'
      );

      expect(decompiled.typography.fontSize).toBe(30);
      expect(decompiled.typography.fontWeight).toBe(700);
      expect(decompiled.typography.textAlign).toBe('center');
      expect(decompiled.typography.color).toBe('#ffffff');
      expect(decompiled.style.fills?.[0]?.color).toBe('#1e293b');
      expect(decompiled.style.strokes?.[0]?.width).toBe(2);
      expect(decompiled.style.strokes?.[0]?.color).toBe('#3b82f6');
      expect(decompiled.style.boxShadow?.[0]?.blur).toBe(25);
    });

    it('handles responsive overrides (md: and sm: prefixes)', () => {
      const decompiled = TailwindDecompiler.decompile('flex flex-col p-4 md:flex-row md:p-8');

      expect(decompiled.layout.direction).toBe('vertical');
      expect(decompiled.layout.padding).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });

      expect(decompiled.responsive.tablet).toBeDefined();
      expect(decompiled.responsive.tablet?.layout?.direction).toBe('horizontal');
      expect(decompiled.responsive.tablet?.layout?.padding).toEqual({ top: 32, right: 32, bottom: 32, left: 32 });
    });
  });

  describe('HtmlAdapter', () => {
    const adapter = new HtmlAdapter();

    it('identifies valid HTML payloads', () => {
      expect(adapter.canHandle('<!DOCTYPE html><html><body><h1>Title</h1></body></html>')).toBe(true);
      expect(adapter.canHandle('<div class="hero"><h1>Welcome</h1></div>')).toBe(true);
      expect(adapter.canHandle('Random text without HTML tags')).toBe(false);
    });

    it('parses HTML snippet into structured Import IR and sanitizes malicious scripts', async () => {
      const htmlPayload = `
        <section id="hero" class="flex flex-col items-center p-8 bg-slate-900">
          <script>alert("malicious");</script>
          <h1 class="text-4xl font-bold text-white mb-4">Autonomous AI Cloud</h1>
          <p class="text-base text-gray-300">Deploy intelligent agents with cryptographic guarantees.</p>
          <button class="bg-blue-600 text-white p-4 rounded-lg" onclick="exploit()">Deploy Now</button>
        </section>
      `;

      const result = await adapter.parse(htmlPayload);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0); // Warning for script stripping
      expect(result.projectIR.pages.length).toBe(1);

      const section = result.projectIR.pages[0].sections[0];
      expect(section).toBeDefined();

      const nodes = Object.values(section.nodes);
      const headingNode = nodes.find((n) => n.kind === 'heading');
      const paragraphNode = nodes.find((n) => n.kind === 'paragraph');
      const buttonNode = nodes.find((n) => n.kind === 'button');

      expect(headingNode).toBeDefined();
      expect(headingNode?.content?.text).toContain('Autonomous AI Cloud');
      expect(headingNode?.typography?.fontSize).toBe(36);

      expect(paragraphNode).toBeDefined();
      expect(paragraphNode?.content?.text).toContain('Deploy intelligent agents');

      expect(buttonNode).toBeDefined();
      expect(buttonNode?.content?.text).toContain('Deploy Now');
      expect(buttonNode?.style.fills?.[0]?.color).toBe('#2563eb');
    });

    it('compiles parsed HTML directly into an editable SceneGraph Template Schema', async () => {
      const htmlPayload = `
        <header class="flex justify-between items-center p-6 bg-slate-900">
          <span class="text-xl font-bold text-white">OrbitoX</span>
          <button class="bg-blue-600 text-white px-4 py-2 rounded-md">Login</button>
        </header>
      `;

      const parseResult = await adapter.parse(htmlPayload);
      const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);

      expect(compileResult.success).toBe(true);
      expect(compileResult.schema.scenes.length).toBe(1);

      const scene = compileResult.schema.scenes[0];
      expect(scene.sceneGraph).toBeDefined();
      expect(Object.keys(scene.sceneGraph.nodes).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('ReactAdapter', () => {
    const adapter = new ReactAdapter();

    it('identifies React and Next.js components', () => {
      const reactCode = `
        import React from 'react';
        export default function PricingSection({ title }) {
          return (
            <div className="flex flex-col p-6 bg-slate-900">
              <h2 className="text-3xl font-bold text-white">{title}</h2>
              <button className="bg-blue-500 text-white p-3 rounded-lg">Get Started</button>
            </div>
          );
        }
      `;

      expect(adapter.canHandle(reactCode)).toBe(true);
    });

    it('decompiles React functional component into Import IR with dynamic props binding', async () => {
      const reactCode = `
        export default function HeroHeader() {
          return (
            <div className="flex flex-col items-center gap-4 p-8 bg-slate-900">
              <h1 className="text-4xl font-bold text-white">NextGen Platform</h1>
              <p className="text-base text-gray-400">Scale without limits</p>
              <button className="bg-emerald-500 text-white p-4 rounded-xl">Launch App</button>
            </div>
          );
        }
      `;

      const result = await adapter.parse(reactCode);
      expect(result.success).toBe(true);
      expect(result.projectIR.metadata.title).toBe('HeroHeader Component');

      const section = result.projectIR.pages[0].sections[0];
      const nodes = Object.values(section.nodes);

      const btn = nodes.find((n) => n.kind === 'button');
      expect(btn).toBeDefined();
      expect(btn?.content?.text).toBe('Launch App');
      expect(btn?.style.fills?.[0]?.color).toBe('#10b981'); // emerald-500

      // End-to-end compile to SceneGraph
      const templateSchema = SceneGraphCompiler.compile(result.projectIR);
      expect(templateSchema.success).toBe(true);
      expect(templateSchema.schema.scenes[0].sceneGraph.nodes[btn!.id]).toBeDefined();
    });
  });
});
