'use client';

import { useState, useCallback } from 'react';
import { commerceEngine } from '../domain/commerce.engine';
import { CustomerReview, ReviewStats } from '../domain/engines/review/review.engine';

export function useCommerceReviews(productId: string) {
  const [reviews, setReviews] = useState<CustomerReview[]>(() =>
    commerceEngine.reviews.getProductReviews(productId)
  );
  const [stats, setStats] = useState<ReviewStats>(() =>
    commerceEngine.reviews.getProductReviewStats(productId)
  );

  const refresh = useCallback(() => {
    setReviews(commerceEngine.reviews.getProductReviews(productId));
    setStats(commerceEngine.reviews.getProductReviewStats(productId));
  }, [productId]);

  const submitReview = useCallback(
    (data: { storeId: string; customerName: string; customerEmail: string; rating: number; title?: string; comment: string }) => {
      const res = commerceEngine.reviews.submitReview({
        productId,
        ...data,
      });
      refresh();
      return res;
    },
    [productId, refresh]
  );

  return {
    reviews,
    stats,
    submitReview,
    refresh,
  };
}
