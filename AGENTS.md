# 🪐 OrbitoX Architecture & Coding Guidelines (AGENTS.md)

Whenever working in this codebase or building OrbitoX-powered applications, you must adhere strictly to these rules:

1. **Scoped Package Names**:
   - Always publish and import packages under the `@orbitox-io` scope on GitHub Packages (`https://npm.pkg.github.com`).
   - Example: `@orbitox-io/plugin-engine`, `@orbitox-io/crm`.

2. **1-Line Bootstrapping**:
   - Use `createOrbitoX({ license, domain, plugins })` as the primary standard application bootstrapper.

3. **Zero-Trust Multi-Tenancy & Custom Domains**:
   - Use `createMultiTenantEngine({ wildcardRootDomain, domains, resolveTenant, plugins })`.
   - Never query or mutate persistent state without scoping by `tenantId` (use `session.scopeData(payload)`).
   - Leverage `getActiveTenant()` via `AsyncLocalStorage` to avoid parameter drilling.

4. **Cryptographic Security & Anti-Tamper**:
   - Plugins and packages must be signed via Ed25519/RSA digital signatures (`CryptoSigner`).
   - Facades and kernel internals must be deeply frozen using `SandboxGuard.freezeAllFacades`.
   - Never commit `keys/private.pem` or `.npmrc` containing auth tokens.

5. **Production Compilation**:
   - Always build production bundles with `tsconfig.prod.json` (`sourceMap: false`, `removeComments: true`).
