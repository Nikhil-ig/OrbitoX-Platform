import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService();
  });

  it('should list pre-seeded marketplace plugins', () => {
    const listings = service.getListings();
    expect(listings.length).toBeGreaterThanOrEqual(2);
    expect(listings.some((p) => p.id === 'crm')).toBe(true);
  });

  it('should filter listings by category', () => {
    const salesListings = service.getListings('sales');
    expect(salesListings).toHaveLength(1);
    expect(salesListings[0].id).toBe('crm');
  });
});
