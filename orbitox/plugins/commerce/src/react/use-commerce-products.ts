import { useState, useEffect, useCallback } from 'react';
import { Product, Category, Collection, ProductFilter } from '../domain/types/product.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceProducts(storeId: string = 'store_aura_luxury', filter: ProductFilter = {}) {
  const targetStoreId = storeId || 'store_aura_luxury';

  const [products, setProducts] = useState<Product[]>(() => {
    return commerceEngine.products.listProducts(targetStoreId, filter).products;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    return commerceEngine.products.listCategoriesByStore(targetStoreId);
  });
  const [collections, setCollections] = useState<Collection[]>(() => {
    return commerceEngine.products.listCollectionsByStore(targetStoreId);
  });
  const [total, setTotal] = useState<number>(() => {
    return commerceEngine.products.listProducts(targetStoreId, filter).total;
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refreshProducts = useCallback(() => {
    if (!targetStoreId) return;
    const res = commerceEngine.products.listProducts(targetStoreId, filter);
    setProducts([...res.products]);
    setTotal(res.total);
    setCategories([...commerceEngine.products.listCategoriesByStore(targetStoreId)]);
    setCollections([...commerceEngine.products.listCollectionsByStore(targetStoreId)]);
  }, [targetStoreId, JSON.stringify(filter)]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const createProduct = (payload: any, tenantId: string = 'tenant_aura_corp') => {
    const created = commerceEngine.products.createProduct(targetStoreId, tenantId, payload);
    refreshProducts();
    return created;
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    const updated = commerceEngine.products.updateProduct(productId, updates);
    refreshProducts();
    return updated;
  };

  const deleteProduct = (productId: string) => {
    const deleted = commerceEngine.products.deleteProduct(productId);
    refreshProducts();
    return deleted;
  };

  const createCategory = (name: string, description?: string, imageUrl?: string) => {
    const cat = commerceEngine.products.createCategory(targetStoreId, name, description, imageUrl);
    refreshProducts();
    return cat;
  };

  return {
    products,
    categories,
    collections,
    total,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    refreshProducts,
  };
}
