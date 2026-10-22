import { NextRequest, NextResponse } from 'next/server';
import {
  HtmlAdapter,
  ReactAdapter,
  FigmaAdapter,
  XdAdapter,
  ShopifyAdapter,
  WordPressAdapter,
  UrlCrawlerAdapter,
  SceneGraphCompiler,
  SourceAdapterOptions,
} from '@orbitox-io/importer-core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, format = 'auto', options = {} } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid "code" string is required.' },
        { status: 400 }
      );
    }

    const htmlAdapter = new HtmlAdapter();
    const reactAdapter = new ReactAdapter();
    const figmaAdapter = new FigmaAdapter();
    const xdAdapter = new XdAdapter();
    const shopifyAdapter = new ShopifyAdapter();
    const wordPressAdapter = new WordPressAdapter();
    const urlCrawlerAdapter = new UrlCrawlerAdapter();

    // Determine adapter
    let adapter: any = htmlAdapter;
    if (format === 'url' || format === 'web' || format === 'web_url') {
      adapter = urlCrawlerAdapter;
    } else if (format === 'wordpress' || format === 'wp' || format === 'gutenberg') {
      adapter = wordPressAdapter;
    } else if (format === 'shopify' || format === 'shopify-theme') {
      adapter = shopifyAdapter;
    } else if (format === 'xd' || format === 'adobe-xd') {
      adapter = xdAdapter;
    } else if (format === 'figma' || format === 'figma-ast') {
      adapter = figmaAdapter;
    } else if (format === 'react') {
      adapter = reactAdapter;
    } else if (format === 'html' || format === 'svg') {
      adapter = htmlAdapter;
    } else {
      // Auto-detect
      if (urlCrawlerAdapter.canHandle(code)) {
        adapter = urlCrawlerAdapter;
      } else if (wordPressAdapter.canHandle(code)) {
        adapter = wordPressAdapter;
      } else if (shopifyAdapter.canHandle(code)) {
        adapter = shopifyAdapter;
      } else if (figmaAdapter.canHandle(code)) {
        adapter = figmaAdapter;
      } else if (xdAdapter.canHandle(code)) {
        adapter = xdAdapter;
      } else if (reactAdapter.canHandle(code)) {
        adapter = reactAdapter;
      } else {
        adapter = htmlAdapter;
      }
    }

    const adapterOptions: Partial<SourceAdapterOptions> = {
      importMode: options.importMode || 'section',
      extractDesignTokens: options.extractDesignTokens !== false,
      localizeRemoteAssets: options.localizeRemoteAssets === true,
      preserveOriginalIds: options.preserveOriginalIds ?? false,
      targetPageId: options.targetPageId,
      targetSectionId: options.targetSectionId,
    };

    const parseResult = await adapter.parse(code, adapterOptions);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          executionTimeMs: parseResult.executionTimeMs,
        },
        { status: 422 }
      );
    }

    // Compile into SceneGraph Target Schema
    const compileResult = SceneGraphCompiler.compile(parseResult.projectIR);

    return NextResponse.json({
      success: true,
      adapterId: adapter.id,
      adapterName: adapter.name,
      projectIR: parseResult.projectIR,
      compiledSchema: compileResult.schema,
      confidenceReport: parseResult.projectIR.confidenceReport,
      warnings: parseResult.warnings,
      executionTimeMs: parseResult.executionTimeMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Universal Importer execution failed' },
      { status: 500 }
    );
  }
}
