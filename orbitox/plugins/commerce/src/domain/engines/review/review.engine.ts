export interface CustomerReview {
  id: string;
  productId: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>; // { 5: 12, 4: 3, 3: 1, 2: 0, 1: 0 }
}

export class ReviewEngine {
  private reviews: Map<string, CustomerReview> = new Map();

  constructor(initialReviews: CustomerReview[] = []) {
    for (const r of initialReviews) this.reviews.set(r.id, r);

    // If empty, preload initial realistic reviews
    if (this.reviews.size === 0) {
      const now = new Date().toISOString();
      const initial: CustomerReview[] = [
        {
          id: 'rev_1',
          productId: 'prod_aura_coat',
          storeId: 'store_aura_luxury',
          customerName: 'Victoria S.',
          customerEmail: 'victoria@fashion.co.uk',
          rating: 5,
          title: 'Perfection in every stitch',
          comment: 'The weight of the Melton wool and the drape of the silhouette are magnificent. Fits true to Italian sizing.',
          status: 'approved',
          isVerifiedPurchase: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'rev_2',
          productId: 'prod_aura_coat',
          storeId: 'store_aura_luxury',
          customerName: 'Marcus T.',
          customerEmail: 'marcus@manhattan.com',
          rating: 5,
          title: 'Unbelievable quality',
          comment: 'Wore it to an opening gala in New York and received compliments all night. Fast insured delivery.',
          status: 'approved',
          isVerifiedPurchase: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'rev_3',
          productId: 'prod_aura_necklace',
          storeId: 'store_aura_luxury',
          customerName: 'Sophia Chen',
          customerEmail: 'sophia@lux.sg',
          rating: 5,
          title: 'The emerald glows in the light',
          comment: 'Natural untreated emerald with exquisite gold setting. Packaging was top-tier.',
          status: 'approved',
          isVerifiedPurchase: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const r of initial) this.reviews.set(r.id, r);
    }
  }

  submitReview(payload: {
    productId: string;
    storeId: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    title?: string;
    comment: string;
  }): CustomerReview {
    if (payload.rating < 1 || payload.rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars.');
    }
    if (!payload.comment || payload.comment.trim() === '') {
      throw new Error('Review comment is required.');
    }

    const now = new Date().toISOString();
    const review: CustomerReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: payload.productId,
      storeId: payload.storeId,
      customerName: payload.customerName.trim() || 'Valued Patron',
      customerEmail: payload.customerEmail.toLowerCase().trim(),
      rating: Math.round(payload.rating),
      title: payload.title?.trim(),
      comment: payload.comment.trim(),
      status: 'approved', // Auto-approved in demo
      isVerifiedPurchase: true,
      createdAt: now,
      updatedAt: now,
    };

    this.reviews.set(review.id, review);
    return review;
  }

  getProductReviews(productId: string, onlyApproved: boolean = true): CustomerReview[] {
    return Array.from(this.reviews.values())
      .filter((r) => r.productId === productId && (!onlyApproved || r.status === 'approved'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getProductReviewStats(productId: string): ReviewStats {
    const list = this.getProductReviews(productId, true);
    if (list.length === 0) {
      return {
        averageRating: 5.0,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;

    for (const r of list) {
      totalScore += r.rating;
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    }

    const averageRating = Number((totalScore / list.length).toFixed(1));

    return {
      averageRating,
      totalReviews: list.length,
      ratingBreakdown: breakdown,
    };
  }

  updateReviewStatus(reviewId: string, status: 'approved' | 'rejected'): CustomerReview {
    const review = this.reviews.get(reviewId);
    if (!review) throw new Error(`Review '${reviewId}' not found.`);

    review.status = status;
    review.updatedAt = new Date().toISOString();
    return review;
  }
}
