import { TemplateSchema } from '../types/TemplateSchema';
import { EditorHistoryState } from './TemplateEditorTypes';

export class TemplateEditorHistory {
  private past: TemplateSchema[] = [];
  private future: TemplateSchema[] = [];
  private activeTransaction: {
    label: string;
    initialSchema: TemplateSchema;
  } | null = null;
  private maxHistory: number = 30;

  constructor(initialHistory?: Partial<EditorHistoryState>) {
    if (initialHistory?.past) this.past = [...initialHistory.past];
    if (initialHistory?.future) this.future = [...initialHistory.future];
    if (initialHistory?.activeTransaction) this.activeTransaction = initialHistory.activeTransaction;
  }

  getState(): EditorHistoryState {
    return {
      past: [...this.past],
      future: [...this.future],
      activeTransaction: this.activeTransaction
        ? {
            label: this.activeTransaction.label,
            initialSchema: JSON.parse(JSON.stringify(this.activeTransaction.initialSchema)),
          }
        : null,
    };
  }

  /**
   * Push a completed atomic edit to history
   */
  push(currentSchema: TemplateSchema): void {
    // If inside a transaction, continuous updates mutate draft without adding history steps
    if (this.activeTransaction) {
      return;
    }
    const cloned = JSON.parse(JSON.stringify(currentSchema)) as TemplateSchema;
    this.past = [...this.past.slice(-this.maxHistory), cloned];
    this.future = [];
  }

  /**
   * Start a continuous manipulation session (e.g. slider drag, crop adjustment, resize)
   * Captures initial baseline before dragging begins.
   */
  beginTransaction(currentSchema: TemplateSchema, label: string): void {
    if (!this.activeTransaction) {
      this.activeTransaction = {
        label,
        initialSchema: JSON.parse(JSON.stringify(currentSchema)),
      };
    }
  }

  /**
   * Commit a continuous manipulation session
   * Pushes the initial pre-drag snapshot into history as a single undo step.
   */
  commitTransaction(): void {
    if (this.activeTransaction) {
      this.past = [...this.past.slice(-this.maxHistory), this.activeTransaction.initialSchema];
      this.future = [];
      this.activeTransaction = null;
    }
  }

  /**
   * Cancel continuous transaction and return initial schema to roll back
   */
  cancelTransaction(): TemplateSchema | null {
    if (this.activeTransaction) {
      const rollback = this.activeTransaction.initialSchema;
      this.activeTransaction = null;
      return rollback;
    }
    return null;
  }

  /**
   * Undo last action
   */
  undo(currentSchema: TemplateSchema): TemplateSchema | null {
    if (this.past.length === 0) return null;
    const previous = this.past.pop()!;
    this.future.push(JSON.parse(JSON.stringify(currentSchema)));
    return previous;
  }

  /**
   * Redo previously undone action
   */
  redo(currentSchema: TemplateSchema): TemplateSchema | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(JSON.parse(JSON.stringify(currentSchema)));
    return next;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }
}
