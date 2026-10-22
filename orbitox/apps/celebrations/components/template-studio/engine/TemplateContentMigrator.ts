/**
 * TemplateContentMigrator.ts
 * 
 * Non-destructive semantic content migrator for OrbitoX Studio.
 * When switching templates or swapping section variants, extracts all customer-entered
 * copy, dates, celebrants, images, story text, and form fields from the current project
 * and injects them deterministically into matching slots of the incoming template or variant.
 */

import { TemplateSchema, TemplateSceneDefinition, TemplateDesignTokens } from '../types/TemplateSchema';
import { SceneGraphNode, SceneGraph } from './SceneGraphTypes';
import { WebSectionLibrary } from './WebSectionLibrary';

export interface ProjectContentMap {
  headline?: string;
  subhead?: string;
  ctaText?: string;
  brandName?: string;
  logoUrl?: string;
  featureItems?: Array<{ title: string; description?: string; icon?: string }>;
  celebrants: {
    name1?: string;
    name2?: string;
    portrait1?: string;
    portrait2?: string;
    monogram?: string;
  };
  event: {
    title?: string;
    tagline?: string;
    date?: string;
    time?: string;
    venue?: string;
    address?: string;
    mapUrl?: string;
  };
  story: {
    quote?: string;
    body?: string;
    tagline?: string;
  };
  rsvp: {
    title?: string;
    subtitle?: string;
  };
  wishes: {
    title?: string;
    subtitle?: string;
  };
  images: string[];
  boundFields: Record<string, any>;
  customTokens?: Partial<TemplateDesignTokens>;
}

export class TemplateContentMigrator {
  /**
   * Extracts customer content, bound fields, and custom design tokens from an active TemplateSchema.
   */
  public static extractContent(sourceSchema: TemplateSchema): ProjectContentMap {
    const contentMap: ProjectContentMap = {
      headline: undefined,
      subhead: undefined,
      ctaText: undefined,
      brandName: undefined,
      logoUrl: undefined,
      featureItems: [],
      celebrants: {},
      event: {},
      story: {},
      rsvp: {},
      wishes: {},
      images: [],
      boundFields: {},
      customTokens: sourceSchema?.designTokens ? { ...sourceSchema.designTokens } : undefined,
    };

    if (!sourceSchema || !sourceSchema.scenes) {
      return contentMap;
    }

    sourceSchema.scenes.forEach((scene) => {
      if (!scene.sceneGraph || !scene.sceneGraph.nodes) return;

      Object.values(scene.sceneGraph.nodes).forEach((node: SceneGraphNode) => {
        // Collect explicit binding fields
        if (node.binding?.fieldKey) {
          const key = node.binding.fieldKey;
          const val = node.textContent || node.smartProps?.src || node.smartProps?.value;
          if (val) {
            contentMap.boundFields[key] = val;
          }
        }

        const nodeName = (node.name || '').toLowerCase();
        const text = node.textContent?.trim();

        // 1. Image extraction
        if (node.kind === 'image') {
          const src = node.smartProps?.src || (node as any).props?.src;
          if (
            src &&
            typeof src === 'string' &&
            !src.includes('placeholder') &&
            !contentMap.images.includes(src)
          ) {
            contentMap.images.push(src);
          }
        }

        // 2. Celebrants extraction
        if (
          nodeName.includes('bride') ||
          nodeName.includes('groom') ||
          nodeName.includes('celebrant') ||
          nodeName.includes('partner') ||
          nodeName.includes('name_a') ||
          nodeName.includes('name_b')
        ) {
          if (text) {
            if (!contentMap.celebrants.name1) {
              contentMap.celebrants.name1 = text;
            } else if (text !== contentMap.celebrants.name1 && !contentMap.celebrants.name2) {
              contentMap.celebrants.name2 = text;
            }
          }
        }

        // 3. Title / Hero headline extraction
        if (
          nodeName.includes('celebration title') ||
          nodeName.includes('hero headline') ||
          nodeName.includes('event title') ||
          nodeName.includes('headline') ||
          nodeName === 'title' ||
          nodeName === 'hero title'
        ) {
          if (text && text.length > 2) {
            if (!contentMap.event.title) contentMap.event.title = text;
            if (!contentMap.headline) contentMap.headline = text;
          }
        }

        // 4. Subtitle / Tagline extraction
        if (nodeName.includes('tagline') || nodeName.includes('subtitle') || nodeName.includes('subheading') || nodeName.includes('subhead')) {
          if (text) {
            if (!contentMap.event.tagline) contentMap.event.tagline = text;
            if (!contentMap.subhead) contentMap.subhead = text;
          }
        }

        // 4b. Brand name & Logo
        if (nodeName.includes('brand') || nodeName.includes('logo text') || nodeName === 'company') {
          if (text && !contentMap.brandName) {
            contentMap.brandName = text;
          }
        }
        if (node.kind === 'image' && (nodeName.includes('logo') || nodeName.includes('brandmark'))) {
          const logoSrc = node.smartProps?.src || (node as any).props?.src;
          if (logoSrc && !contentMap.logoUrl) {
            contentMap.logoUrl = logoSrc;
          }
        }

        // 4c. CTA text
        if (node.kind === 'button' || nodeName.includes('button') || nodeName.includes('cta')) {
          if (text && !contentMap.ctaText) {
            contentMap.ctaText = text;
          }
        }

        // 4d. Feature items
        if (nodeName.includes('feature') || nodeName.includes('metric') || nodeName.includes('card')) {
          if (text && text.length > 3 && contentMap.featureItems && contentMap.featureItems.length < 8) {
            contentMap.featureItems.push({ title: text });
          }
        }

        // 5. Date / Time extraction
        if (nodeName.includes('date') || nodeName.includes('time') || nodeName.includes('countdown')) {
          if (text && !contentMap.event.date && /\d/.test(text)) {
            contentMap.event.date = text;
          }
        }

        // 6. Venue / Location extraction
        if (nodeName.includes('venue') || nodeName.includes('location') || nodeName.includes('destination')) {
          if (text && !contentMap.event.venue) {
            contentMap.event.venue = text;
          }
        }
        if (nodeName.includes('address')) {
          if (text && !contentMap.event.address) {
            contentMap.event.address = text;
          }
        }

        // 7. Story / Quote extraction
        if (nodeName.includes('quote') || nodeName.includes('story') || nodeName.includes('narrative')) {
          if (text && text.length > 15 && !contentMap.story.quote) {
            contentMap.story.quote = text;
          }
        }

        // 8. RSVP extraction
        if (nodeName.includes('rsvp')) {
          if (text && !contentMap.rsvp.title) {
            contentMap.rsvp.title = text;
          }
        }

        // 9. Wishes / Guestbook extraction
        if (nodeName.includes('wishes') || nodeName.includes('blessings')) {
          if (text && !contentMap.wishes.title) {
            contentMap.wishes.title = text;
          }
        }
      });
    });

    return contentMap;
  }

  /**
   * Injects extracted customer content into a newly loaded target TemplateSchema.
   */
  public static migrateInto(
    targetSchema: TemplateSchema,
    contentMap: ProjectContentMap
  ): TemplateSchema {
    if (!targetSchema || !targetSchema.scenes) {
      return targetSchema;
    }

    const cloned: TemplateSchema = JSON.parse(JSON.stringify(targetSchema));
    let imageIndex = 0;

    // Apply custom design tokens if preserved
    if (contentMap.customTokens) {
      cloned.designTokens = {
        ...cloned.designTokens,
        colors: {
          ...cloned.designTokens.colors,
          ...contentMap.customTokens.colors,
        },
        typography: {
          ...cloned.designTokens.typography,
          ...contentMap.customTokens.typography,
        },
      };
    }

    cloned.scenes.forEach((scene) => {
      if (!scene.sceneGraph || !scene.sceneGraph.nodes) return;

      Object.values(scene.sceneGraph.nodes).forEach((node: SceneGraphNode) => {
        // 1. Direct explicit binding field injection
        if (node.binding?.fieldKey && contentMap.boundFields[node.binding.fieldKey]) {
          const val = contentMap.boundFields[node.binding.fieldKey];
          if (node.kind === 'image') {
            if (!node.smartProps) node.smartProps = {};
            node.smartProps.src = val;
          } else {
            node.textContent = String(val);
          }
          return;
        }

        const nodeName = (node.name || '').toLowerCase();

        // 2. Celebrants injection
        if (
          nodeName.includes('celebrant 1') ||
          nodeName.includes('protagonist 1') ||
          nodeName.includes('partner 1') ||
          nodeName.includes('bride') ||
          nodeName === 'name_a'
        ) {
          if (contentMap.celebrants.name1) {
            node.textContent = contentMap.celebrants.name1;
          }
        } else if (
          nodeName.includes('celebrant 2') ||
          nodeName.includes('protagonist 2') ||
          nodeName.includes('partner 2') ||
          nodeName.includes('groom') ||
          nodeName === 'name_b'
        ) {
          if (contentMap.celebrants.name2) {
            node.textContent = contentMap.celebrants.name2;
          }
        }

        // 3. Event headline / title injection
        if (
          (nodeName.includes('celebration title') ||
            nodeName.includes('hero headline') ||
            nodeName.includes('event title') ||
            nodeName.includes('headline') ||
            nodeName === 'title' ||
            nodeName === 'hero title') &&
          (contentMap.headline || contentMap.event.title)
        ) {
          node.textContent = contentMap.headline || contentMap.event.title!;
        }

        // 4. Tagline / subtitle injection
        if (
          (nodeName.includes('tagline') ||
            nodeName.includes('subtitle') ||
            nodeName.includes('subheading') ||
            nodeName.includes('subhead')) &&
          (contentMap.subhead || contentMap.event.tagline)
        ) {
          node.textContent = contentMap.subhead || contentMap.event.tagline!;
        }

        // 4b. Brand name injection
        if ((nodeName.includes('brand') || nodeName.includes('logo text')) && contentMap.brandName) {
          node.textContent = contentMap.brandName;
        }

        // 4c. CTA button text injection
        if ((node.kind === 'button' || nodeName.includes('button') || nodeName.includes('cta')) && contentMap.ctaText) {
          node.textContent = contentMap.ctaText;
        }

        // 4d. Logo URL injection
        if (node.kind === 'image' && nodeName.includes('logo') && contentMap.logoUrl) {
          if (!node.smartProps) node.smartProps = {};
          node.smartProps.src = contentMap.logoUrl;
        }

        // 5. Date injection
        if (nodeName.includes('date') && contentMap.event.date) {
          node.textContent = contentMap.event.date;
        }

        // 6. Venue & Address injection
        if (nodeName.includes('venue') && contentMap.event.venue) {
          node.textContent = contentMap.event.venue;
        }
        if (nodeName.includes('address') && contentMap.event.address) {
          node.textContent = contentMap.event.address;
        }

        // 7. Story / Quote injection
        if ((nodeName.includes('quote') || nodeName.includes('story')) && contentMap.story.quote) {
          node.textContent = contentMap.story.quote;
        }

        // 8. Image slot porting
        if (node.kind === 'image' && imageIndex < contentMap.images.length) {
          if (!node.smartProps) node.smartProps = {};
          node.smartProps.src = contentMap.images[imageIndex];
          imageIndex++;
        }
      });
    });

    return cloned;
  }

  /**
   * Non-destructively swaps a section's layout variant (e.g. Centered Hero -> Split Showcase Hero)
   * while preserving all user copy, images, and bound state.
   */
  public static migrateSectionVariant(
    sourceScene: TemplateSceneDefinition,
    targetVariantBlockId: string
  ): TemplateSceneDefinition {
    const block = WebSectionLibrary.get(targetVariantBlockId);
    if (!block) {
      console.warn(`[TemplateContentMigrator] Variant block ${targetVariantBlockId} not found in WebSectionLibrary.`);
      return sourceScene;
    }

    // 1. Extract content from current section
    const sectionTexts: string[] = [];
    const sectionImages: string[] = [];
    const boundFields: Record<string, any> = {};

    if (sourceScene.sceneGraph?.nodes) {
      Object.values(sourceScene.sceneGraph.nodes).forEach((n: SceneGraphNode) => {
        if (n.binding?.fieldKey) {
          const val = n.textContent || n.smartProps?.src || n.smartProps?.value;
          if (val) boundFields[n.binding.fieldKey] = val;
        }
        if (n.kind === 'image') {
          const src = n.smartProps?.src || (n as any).props?.src;
          if (src && !sectionImages.includes(src)) sectionImages.push(src);
        } else if (n.textContent?.trim()) {
          sectionTexts.push(n.textContent.trim());
        }
      });
    }

    // 2. Instantiate target variant scene
    const newVariantScene = block.createScene(sourceScene.name);

    // 3. Preserve original identity, ordering, and metadata
    newVariantScene.id = sourceScene.id;
    newVariantScene.order = sourceScene.order;
    newVariantScene.sceneType = sourceScene.sceneType;
    newVariantScene.purpose = sourceScene.purpose;
    newVariantScene.navigationLabel = sourceScene.navigationLabel || sourceScene.name;

    // 4. Re-inject extracted content into target variant nodes
    if (newVariantScene.sceneGraph?.nodes) {
      let textIdx = 0;
      let imgIdx = 0;

      Object.values(newVariantScene.sceneGraph.nodes).forEach((n: SceneGraphNode) => {
        // Re-bind explicit fields
        if (n.binding?.fieldKey && boundFields[n.binding.fieldKey]) {
          const val = boundFields[n.binding.fieldKey];
          if (n.kind === 'image') {
            if (!n.smartProps) n.smartProps = {};
            n.smartProps.src = val;
          } else {
            n.textContent = String(val);
          }
          return;
        }

        // Port images
        if (n.kind === 'image' && imgIdx < sectionImages.length) {
          if (!n.smartProps) n.smartProps = {};
          n.smartProps.src = sectionImages[imgIdx]!;
          imgIdx++;
        }

        // Port text content
        if (n.kind === 'text' && textIdx < sectionTexts.length) {
          n.textContent = sectionTexts[textIdx]!;
          textIdx++;
        }
      });
    }

    return newVariantScene;
  }
}
