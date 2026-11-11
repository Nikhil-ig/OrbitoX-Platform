import { assertRestaurantOsProductionConfig, GSTIN_REGEX } from '../../packages/domain/production-config';

export { assertRestaurantOsProductionConfig, GSTIN_REGEX };

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;
export const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

export const isProductionEnvironment =
  process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

