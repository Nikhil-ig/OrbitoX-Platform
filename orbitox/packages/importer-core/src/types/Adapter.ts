import { ImportedProject } from './ImportIR';

export interface SourceAdapterOptions {
  importMode: 'full_project' | 'page' | 'section' | 'component' | 'tokens_only' | 'clipboard';
  targetPageId?: string;
  targetSectionId?: string;
  preserveOriginalIds?: boolean;
  extractDesignTokens?: boolean;
  localizeRemoteAssets?: boolean;
  inferResponsiveRules?: boolean;
}

export interface AdapterParseResult {
  success: boolean;
  projectIR: ImportedProject;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

export interface SourceAdapter<TRawInput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: string[];
  readonly supportedMimeTypes: string[];

  /** Quick heuristic check to determine if this adapter can handle the payload */
  canHandle(input: TRawInput): Promise<boolean> | boolean;

  /** Parse raw payload into normalized Import IR */
  parse(input: TRawInput, options?: Partial<SourceAdapterOptions>): Promise<AdapterParseResult>;
}
