import { requireSecret } from './secrets';

describe('requireSecret', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TEST_SECRET;
    delete process.env.ALLOW_DEV_SECRETS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when secret is missing', () => {
    delete process.env.TEST_SECRET;
    expect(() => requireSecret('TEST_SECRET')).toThrow(/Required environment secret "TEST_SECRET" is not set/);
  });

  it('throws when secret length is below minBytes', () => {
    process.env.TEST_SECRET = 'short';
    expect(() => requireSecret('TEST_SECRET', { minBytes: 16 })).toThrow(/does not meet minimum entropy requirement/);
  });

  it('throws when secret is a known-bad placeholder (default_secret)', () => {
    process.env.TEST_SECRET = 'default_secret';
    expect(() => requireSecret('TEST_SECRET')).toThrow(/prohibited insecure placeholder/);
  });

  it('throws when secret matches orbitox_*_2026 pattern', () => {
    process.env.TEST_SECRET = 'orbitox_platform_control_secret_2026';
    expect(() => requireSecret('TEST_SECRET')).toThrow(/prohibited insecure placeholder/);
  });

  it('returns valid high-entropy secret', () => {
    const validSecret = 'a-very-strong-and-secure-random-token-2026-x991';
    process.env.TEST_SECRET = validSecret;
    expect(requireSecret('TEST_SECRET', { minBytes: 16 })).toBe(validSecret);
  });

  it('ALLOW_DEV_SECRETS=1 generates an ephemeral secret ONLY in development mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_DEV_SECRETS = '1';
    delete process.env.TEST_SECRET;

    const secret1 = requireSecret('TEST_SECRET', { minBytes: 32 });
    expect(typeof secret1).toBe('string');
    expect(secret1.length).toBeGreaterThanOrEqual(32);

    // Consistency across process lifecycle
    const secret2 = requireSecret('TEST_SECRET', { minBytes: 32 });
    expect(secret2).toBe(secret1);
  });

  it('ALLOW_DEV_SECRETS=1 is rejected and throws if NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEV_SECRETS = '1';
    delete process.env.TEST_SECRET;

    expect(() => requireSecret('TEST_SECRET')).toThrow(/Required environment secret "TEST_SECRET" is not set/);
  });
});
