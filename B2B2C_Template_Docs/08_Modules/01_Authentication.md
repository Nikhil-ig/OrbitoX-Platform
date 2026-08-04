# Authentication (Multi-Tier & Secure)

---

## Authentication Strategy

The authentication system must handle logins securely across all 5 tiers, dynamically resolving the user's scope and permissions based on their assigned tier and the access domain. It must prevent session hijacking and lateral movement across tenants.

### Token Payload Structure

JWTs must embed the user's tier and hierarchical IDs to avoid database lookups on every request. **The JWT signature must use RS256 (asymmetric) rather than HS256.**

```json
{
  "sub": "user_id_123",
  "email": "admin@franchise-a.com",
  "tier": "TENANT",
  "org_id": "org_uuid",
  "tenant_id": "tenant_uuid",
  "company_id": null,
  "roles": ["Tenant_Admin"],
  "iat": 1690000000,
  "exp": 1690000900,
  "jti": "unique_token_id"
}
```

### Advanced Security Controls

1. **Short-Lived Access Tokens:** Access tokens live for 15 minutes.
2. **Refresh Token Rotation:** Refresh tokens are stored as HTTP-only secure cookies. Every time a refresh token is used, it is invalidated and a new one is issued (Refresh Token Rotation). This mitigates token theft.
3. **Session Invalidation:** Admins can instantly kill user sessions globally. The API Gateway maintains a Redis-based JWT blocklist (checking the `jti` claim).
4. **Mandatory MFA (Multi-Factor Authentication):**
   - SuperAdmin: Forced MFA (Hardware Security Key preferred).
   - Org & Tenant Admins: Forced MFA via Authenticator App (TOTP).
   - Company & Consumers: Configurable MFA.

### SSO and Identity Providers

- **Organisation/Tenant Level:** Uses standard Email/Password or Enterprise SSO (SAML/OIDC via Okta/Azure AD) for corporate staff.
- **Company Level:** May require their own custom SSO integration if the Company is a large B2B client integrating with their internal Active Directory.
- **Consumer Level:** Social Logins (Google, Apple, Facebook) or Passwordless (Magic Links, OTP).

### Multi-Tier Impersonation (Zero-Trust Audited)

SuperAdmins must be able to "impersonate" or assume the context of an Organisation Admin for support.
- **Security Check:** The JWT will contain an `impersonator_id` claim if impersonation is active.
- **Audit Trail:** Every action taken during an impersonation session is dual-logged (Actor: User A, Impersonating: User B) to prevent plausible deniability.
