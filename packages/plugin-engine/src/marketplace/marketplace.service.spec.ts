import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService();
  });

  it('should list pre-seeded marketplace plugins', () => {
    const listings = service.getListings();
    expect(listings.length).toBeGreaterThanOrEqual(2);
    expect(listings.some((p) => p.id === 'hms')).toBe(true);
    expect(listings.some((p) => p.id === 'restaurant')).toBe(true);
  });

  it('should filter listings by category', () => {
    const healthcareListings = service.getListings('healthcare');
    expect(healthcareListings).toHaveLength(1);
    expect(healthcareListings[0].id).toBe('hms');
  });
});
