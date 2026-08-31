import { Product } from '../../types/product.types';

export interface ProductSEOAudit {
  score: number; // 0 - 100
  grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  issues: string[];
  suggestions: string[];
  serpPreview: {
    title: string;
    url: string;
    snippet: string;
  };
}

export class SEOEngine {
  /**
   * Evaluates SEO quality and generates Google SERP preview
   */
  analyzeProductSEO(product: Product, storeSlug: string = 'aura-luxury'): ProductSEOAudit {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const title = product.seoTitle || product.title;
    const desc = product.seoDescription || product.description || '';

    // Title checks
    if (!title) {
      issues.push('Missing product title');
      score -= 30;
    } else if (title.length < 20) {
      issues.push('Title is short (< 20 characters) — add descriptive keywords');
      score -= 10;
    } else if (title.length > 65) {
      issues.push('Title exceeds 65 characters and may truncate in Google SERP');
      score -= 5;
    }

    // Description checks
    if (!desc) {
      issues.push('Missing meta description');
      score -= 30;
      suggestions.push('Add a compelling meta description containing keywords and shipping incentive.');
    } else if (desc.length < 50) {
      issues.push('Description is under 50 characters');
      score -= 15;
    } else if (desc.length > 160) {
      issues.push('Description exceeds 160 characters and will be clipped');
      score -= 5;
    }

    // Media alt text checks
    const hasMedia = product.media && product.media.length > 0;
    if (!hasMedia) {
      issues.push('Product has no image assets');
      score -= 20;
    } else {
      const missingAlt = product.media.some((m) => !m.altText);
      if (missingAlt) {
        suggestions.push('Add descriptive alt-text to all product images for Google Image Search.');
        score -= 5;
      }
    }

    // Pricing & Schema
    if (!product.price || product.price <= 0) {
      issues.push('Zero or missing product price');
      score -= 10;
    }

    score = Math.max(10, Math.min(100, score));

    let grade: ProductSEOAudit['grade'] = 'EXCELLENT';
    if (score < 60) grade = 'CRITICAL';
    else if (score < 75) grade = 'NEEDS_IMPROVEMENT';
    else if (score < 90) grade = 'GOOD';

    const url = `https://orbitox.store/${storeSlug}/product/${product.slug}`;

    return {
      score,
      grade,
      metaTitle: title,
      metaDescription: desc,
      urlSlug: product.slug,
      issues,
      suggestions,
      serpPreview: {
        title: `${title} | Official Store`,
        url,
        snippet: desc.length > 155 ? `${desc.slice(0, 152)}...` : desc || 'Shop luxury handcrafted pieces online with complimentary express shipping.',
      },
    };
  }

  /**
   * Generates AI-optimized meta title, meta description, and keywords
   */
  generateOptimizedMetaTags(product: {
    title: string;
    description?: string;
    price?: number;
    category?: string;
  }): { metaTitle: string; metaDescription: string; keywords: string[] } {
    const cleanTitle = product.title.trim();
    const cat = product.category || 'Luxury Collection';
    const priceStr = product.price ? ` | $${product.price.toFixed(2)}` : '';

    const metaTitle = `${cleanTitle} — ${cat}${priceStr}`.slice(0, 60);
    const metaDescription = `Discover the handcrafted ${cleanTitle}. Made with sustainable premium materials and tailored architecture. Complimentary worldwide delivery and easy 30-day returns.`.slice(0, 158);

    const keywords = [
      cleanTitle.toLowerCase(),
      cat.toLowerCase(),
      'luxury fashion',
      'designer apparel',
      'sustainable couture',
      'online boutique',
    ];

    return {
      metaTitle,
      metaDescription,
      keywords,
    };
  }
}
