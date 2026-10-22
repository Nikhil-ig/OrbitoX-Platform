import { TemplateSchema } from '../types/TemplateSchema';
import { SAAS_NEXTGEN_BLUEPRINT } from './saas-nextgen.blueprint';
import { AGENCY_EDITORIAL_BLUEPRINT } from './agency-editorial.blueprint';
import { ECOMMERCE_MINIMAL_BLUEPRINT } from './ecommerce-minimal.blueprint';
import { PORTFOLIO_CREATIVE_BLUEPRINT } from './portfolio-creative.blueprint';
import { CELEBRATIONS_CELESTIAL_BLUEPRINT } from './celebrations-celestial.blueprint';

export {
  SAAS_NEXTGEN_BLUEPRINT,
  AGENCY_EDITORIAL_BLUEPRINT,
  ECOMMERCE_MINIMAL_BLUEPRINT,
  PORTFOLIO_CREATIVE_BLUEPRINT,
  CELEBRATIONS_CELESTIAL_BLUEPRINT,
};

export const BLUEPRINT_CATALOG: Record<string, TemplateSchema> = {
  'saas-nextgen': SAAS_NEXTGEN_BLUEPRINT,
  'agency-editorial': AGENCY_EDITORIAL_BLUEPRINT,
  'ecommerce-minimal': ECOMMERCE_MINIMAL_BLUEPRINT,
  'portfolio-creative': PORTFOLIO_CREATIVE_BLUEPRINT,
  'celestial-odyssey': CELEBRATIONS_CELESTIAL_BLUEPRINT,
};

/**
 * Universal Template Switch Router
 * Returns authentic vertical blueprint based on category or key.
 */
export function getTemplateBlueprint(keyOrCategory: string): TemplateSchema {
  const norm = (keyOrCategory || '').toLowerCase().trim();

  if (BLUEPRINT_CATALOG[norm]) {
    return JSON.parse(JSON.stringify(BLUEPRINT_CATALOG[norm]));
  }

  if (norm.includes('saas') || norm.includes('b2b') || norm.includes('cloud')) {
    return JSON.parse(JSON.stringify(SAAS_NEXTGEN_BLUEPRINT));
  }
  if (norm.includes('agency') || norm.includes('editorial') || norm.includes('fashion') || norm.includes('vanguard')) {
    return JSON.parse(JSON.stringify(AGENCY_EDITORIAL_BLUEPRINT));
  }
  if (norm.includes('ecom') || norm.includes('shop') || norm.includes('store') || norm.includes('retail') || norm.includes('glasshouse')) {
    return JSON.parse(JSON.stringify(ECOMMERCE_MINIMAL_BLUEPRINT));
  }
  if (norm.includes('portfolio') || norm.includes('creative') || norm.includes('kroma')) {
    return JSON.parse(JSON.stringify(PORTFOLIO_CREATIVE_BLUEPRINT));
  }

  return JSON.parse(JSON.stringify(CELEBRATIONS_CELESTIAL_BLUEPRINT));
}
