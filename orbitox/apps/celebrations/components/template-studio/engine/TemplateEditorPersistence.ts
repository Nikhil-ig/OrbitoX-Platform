import { TemplateSchema } from '../types/TemplateSchema';
import { TemplateSchemaService } from '../services/TemplateSchemaService';
import { EditorPersistenceState } from './TemplateEditorTypes';

export class TemplateEditorPersistence {
  private timer: NodeJS.Timeout | null = null;
  private debounceMs: number = 600;

  /**
   * Schedule debounced autosave of draft
   */
  scheduleAutosave(
    draft: TemplateSchema,
    onStatusChange: (status: 'saving' | 'saved' | 'error', error?: string) => void
  ): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    onStatusChange('saving');

    this.timer = setTimeout(() => {
      try {
        TemplateSchemaService.saveSchema(draft);
        onStatusChange('saved');
      } catch (err: any) {
        console.error('Autosave failed:', err);
        onStatusChange('error', err?.message || 'Failed to persist draft to local store');
      }
    }, this.debounceMs);
  }

  /**
   * Immediate synchronous save
   */
  saveImmediate(draft: TemplateSchema): { success: boolean; error?: string } {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      TemplateSchemaService.saveSchema(draft);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Immediate save failed' };
    }
  }

  /**
   * Publish version with validation safety gate
   */
  publish(draft: TemplateSchema): { success: boolean; schema: TemplateSchema; error?: string } {
    return TemplateSchemaService.publishVersion(draft);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
