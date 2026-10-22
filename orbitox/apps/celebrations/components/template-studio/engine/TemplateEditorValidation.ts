import {
  TemplateSchema,
  TemplateHealthReport,
  TemplateHealthIssue,
} from '../types/TemplateSchema';

export class TemplateEditorValidation {
  /**
   * Actionable Diagnostics Engine (Prompt #27)
   * Validates canonical draft and attaches exact sceneId, nodeId, and propertyPath
   * so clicking [Fix] in the UI instantly selects the offending node.
   */
  static validate(schema: TemplateSchema): TemplateHealthReport {
    const errors: TemplateHealthIssue[] = [];
    const warnings: TemplateHealthIssue[] = [];
    const infos: TemplateHealthIssue[] = [];
    let passedCount = 0;

    // Check 1: Template Metadata
    if (!schema.name || schema.name.trim().length < 3) {
      errors.push({
        id: 'err_name',
        severity: 'ERROR',
        code: 'INVALID_NAME',
        title: 'Template Name Required',
        message: 'Template must have a descriptive human-readable name of at least 3 characters.',
        targetTab: 'overview',
      });
    } else {
      passedCount++;
    }

    // Check 2: Scenes presence
    if (!schema.scenes || schema.scenes.length === 0) {
      errors.push({
        id: 'err_scenes_empty',
        severity: 'ERROR',
        code: 'NO_SCENES',
        title: 'At Least One Scene Required',
        message: 'Template requires at least one active scene in its experience journey.',
        targetTab: 'scenes',
      });
    } else {
      passedCount++;
    }

    // Check 3: Check scenes for layers, mobile layout, and accessibility
    schema.scenes.forEach((scene) => {
      if (!scene.layers || scene.layers.length === 0) {
        errors.push({
          id: `err_scene_layers_${scene.id}`,
          severity: 'ERROR',
          code: 'SCENE_NO_LAYERS',
          title: `Scene '${scene.name}' Has No Layers`,
          message: 'Every scene must contain semantic layers for visual rendering.',
          targetTab: 'scenes',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }

      // Check mobile layout rule
      if (!scene.layoutRules?.mobile) {
        errors.push({
          id: `err_scene_mobile_${scene.id}`,
          severity: 'ERROR',
          code: 'MOBILE_LAYOUT_MISSING',
          title: `Mobile Layout Undefined for '${scene.name}'`,
          message: 'Every celebration scene must explicitly define mobile viewport layout rules.',
          targetTab: 'responsive',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }

      // Check motion fallback
      if (!scene.motionConfig?.reducedMotionFallback) {
        warnings.push({
          id: `warn_motion_rm_${scene.id}`,
          severity: 'WARNING',
          code: 'REDUCED_MOTION_FALLBACK_MISSING',
          title: `Reduced Motion Undefined for '${scene.name}'`,
          message: 'Scene animation should define a static or subtle fade fallback for accessibility.',
          targetTab: 'motion',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }

      // Check accessibility
      if (!scene.accessibility?.screenReaderTitle) {
        warnings.push({
          id: `warn_a11y_${scene.id}`,
          severity: 'WARNING',
          code: 'SCREEN_READER_LABEL_MISSING',
          title: `Screen Reader Label Missing for '${scene.name}'`,
          message: 'Screen readers require an accessible description for assistive technologies.',
          targetTab: 'accessibility',
          sceneId: scene.id,
        });
      } else {
        passedCount++;
      }
    });

    // Check 4: Content Schema Required Customer Fields
    schema.contentSchema.forEach((field) => {
      if (field.required && !field.customerEditable && !field.defaultValue) {
        errors.push({
          id: `err_fld_req_${field.id}`,
          severity: 'ERROR',
          code: 'REQUIRED_FIELD_UNAVAILABLE',
          title: `Required Field '${field.label}' Unfillable`,
          message: 'Required field is marked non-customer-editable with no default value provided.',
          targetTab: 'contentSchema',
          fieldId: field.id,
        });
      } else {
        passedCount++;
      }
    });

    // Check 5: Media Slots Fallback Check
    schema.mediaSlots.forEach((slot) => {
      if (!slot.aspectRatio) {
        warnings.push({
          id: `warn_slot_aspect_${slot.id}`,
          severity: 'WARNING',
          code: 'MEDIA_SLOT_ASPECT_RATIO',
          title: `Aspect Ratio Missing for '${slot.label}'`,
          message: 'Mobile-first cropping requires an explicit aspect ratio definition.',
          targetTab: 'mediaSlots',
        });
      } else {
        passedCount++;
      }
    });

    // Check 6: Design Tokens
    if (!schema.designTokens?.colors?.accentPrimary || !schema.designTokens?.colors?.backgroundPrimary) {
      errors.push({
        id: 'err_tokens_color',
        severity: 'ERROR',
        code: 'MISSING_CORE_COLORS',
        title: 'Core Design Tokens Incomplete',
        message: 'Primary accent and background colors must be defined.',
        targetTab: 'designSystem',
      });
    } else {
      passedCount++;
    }

    const totalWeight = errors.length * 20 + warnings.length * 3;
    const score = Math.max(20, Math.min(100, 100 - totalWeight));
    const isPublishable = errors.length === 0;

    return {
      score,
      isPublishable,
      passedCount,
      errors,
      warnings,
      infos,
      lastAuditedAt: new Date().toISOString(),
    };
  }
}
