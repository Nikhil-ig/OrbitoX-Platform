# 🍽️ OrbitoX RestaurantOS v2.2: QR Trust, Dining Session Membership & Guest Privacy Contract (13)

> **Contract Reference:** `13_RestaurantOS_QR_Trust_and_Guest_Privacy.md`  
> **Status:** Production Architecture Baseline (v2.2 Hardened)  
> **Package Target:** `@orbitox-io/restaurant-core`, `@orbitox-io/restaurant-dining`, `@orbitox-io/restaurant-order`  
> **Purpose:** Define the authoritative security and UX model for printed table QR codes, active dining sessions, multi-guest participation, shared orders, identity visibility, and session revocation.

---

## 1. Fundamental Security Principle

A printed QR code is **never an authenticated dining-session credential**.

The architecture SHALL strictly distinguish:

```text
QRIdentity
    ↓
TableDiscoveryContext
    ↓
DiningSessionMembership
    ↓
GuestCapability
```

Therefore:

```text
SCAN ≠ JOIN
JOIN ≠ CUSTOMER IDENTITY
CUSTOMER IDENTITY ≠ SHARED DATA AUTHORIZATION
```

A static QR may identify the intended restaurant, location, service area, and physical table, but it SHALL NOT grant direct access to the current dining session, guest identities, orders, payment information, or private customer data.

---

## 2. QRIdentity

A physical table has a persistent QR identity:

```text
QRIdentity
├── id
├── locationId
├── tableId
├── publicLocatorVersion
├── tokenHash
├── status
├── issuedAt
├── revokedAt
└── metadata
```

The printed QR SHALL encode only a high-entropy opaque locator.

Example:

```text
https://dine.example.com/q/7Kp9xQ8m2L...
```

The QR SHALL NOT encode:

```text
tenantId
companyId
locationId
tableId
sessionId
participantId
customerId
phone
email
activeOrderId
```

The server resolves the opaque locator to the authoritative restaurant context.

---

## 3. Multi-Branch Context Resolution

RestaurantOS SHALL resolve QR context as:

```text
QRIdentity
    ↓
Tenant
    ↓
Company / Brand
    ↓
Location / Branch
    ↓
Service Area
    ↓
Physical Table
```

A QR scan SHALL become permanently anchored to the resolved location context for the current browsing/session flow.

Example:

```text
Bella Casa
 ├── Ludhiana
 │    ├── T-01
 │    ├── T-02
 │    └── T-14
 │
 ├── Chandigarh
 │    ├── T-01
 │    └── T-12
 │
 └── Delhi
      ├── T-01
      └── T-22
```

`T-14` in Ludhiana and `T-14` in Chandigarh SHALL never be interchangeable.

Client-supplied `locationId`, `companyId`, or `tenantId` SHALL NOT override the resolved QR context.

---

## 4. QR Scan State

When a guest scans the QR:

```text
QR_SCAN
   ↓
RESOLVE_QR
   ↓
CREATE/REUSE_ANONYMOUS_SCAN_CONTEXT
   ↓
RETURN_PUBLIC_TABLE_CONTEXT
```

The anonymous scan context may display:

```text
Restaurant name
Branch name
Table label
Restaurant branding
Operating status
Public menu
Public recommendations
Public offers
```

It MUST NOT display:

```text
active participant names
active customer profiles
full table order
payment information
private guest notes
phone numbers
email addresses
loyalty information
private CRM data
```

The scan context is not a dining-session authorization.

---

## 5. DiningSession Membership

If a DiningSession is active:

```text
Table
  ↓
Active DiningSession
```

a scanned guest sees:

```text
"Table session active"
```

but must separately become a:

```text
Participant
```

before accessing protected session data.

Participant model:

```text
Participant
├── id
├── diningSessionId
├── displayName
├── avatarRef?
├── type
│    ├── ANONYMOUS
│    ├── IDENTIFIED
│    └── STAFF_ASSISTED
├── role
│    ├── HOST
│    └── PARTICIPANT
├── status
├── joinedAt
├── leftAt
└── privacyPolicy
```

---

## 6. Join Request

A guest joining an active DiningSession SHALL produce:

```text
JoinRequest
├── id
├── diningSessionId
├── requestedDisplayName
├── requesterContext
├── riskScore
├── requestedAt
├── expiresAt
├── status
└── approvedBy
```

States:

```text
REQUESTED
    ↓
APPROVED
    ↓
MEMBERSHIP_ISSUED

REQUESTED
    ├── REJECTED
    └── EXPIRED
```

The restaurant SHALL configure one of:

```text
OPEN_JOIN
APPROVAL_REQUIRED
HOST_APPROVAL
STAFF_APPROVAL
HIGH_SECURITY
```

---

## 7. Recommended Default Policy

For normal dine-in restaurants:

```text
QR
 ↓
Join Table
 ↓
Choose Display Name
 ↓
Automatic Join
```

For high-security / premium restaurants:

```text
QR
 ↓
Request Join
 ↓
Host / Captain Approval
 ↓
Join
```

The platform SHALL allow the policy to be configured per:

```text
Company
Location
Service Area
Table Group
Experience
DiningSession
```

---

## 8. GuestCapability

After successful joining, RestaurantOS issues a narrowly scoped ephemeral capability.

The capability SHALL contain or resolve to:

```text
capabilityId
tenantScope
companyScope
locationScope
tableScope
diningSessionScope
participantScope
capabilitySet
issuedAt
expiresAt
sessionEpoch
jti
deviceBinding?
```

Capabilities SHALL be granular:

```text
guest.menu.read
guest.session.read
guest.session.shared_orders.read
guest.session.participants.read
guest.cart.create
guest.order.create
guest.order.read_own
guest.order.read_shared
guest.service_request.create
guest.bill.read
guest.payment.create
guest.leave
```

A guest SHALL NOT automatically receive:

```text
guest.customer.read_private
guest.customer.read_phone
guest.customer.read_email
guest.payment.read_sensitive
guest.staff_notes.read
guest.crm.read
```

---

## 9. Capability Transport

Active guest capabilities SHALL NOT remain in the QR URL.

After the QR locator is resolved:

```text
Public QR Locator
    ↓
Anonymous HTTP session
    ↓
Join
    ↓
Guest Capability
    ↓
Secure HttpOnly cookie / server-managed session
```

The browser URL SHALL be cleaned after exchange so an active capability is not retained in browser history or shareable URLs.

Recommended cookie characteristics:

```text
Secure
HttpOnly
SameSite=Lax or Strict where compatible
short-lived access session
rotating renewal
```

The server SHALL never treat a URL containing a public QR locator as proof of membership.

---

## 10. Device / Browser Binding

For elevated guest operations, RestaurantOS SHOULD support optional browser-generated cryptographic device binding:

```text
Browser
 ↓
Generate WebCrypto Key Pair
 ↓
Register Public Key
 ↓
Bind GuestCapability
```

Sensitive guest commands can require proof of possession of the device key.

This reduces the usefulness of a stolen/replayed capability.

---

## 11. Session Epoch Revocation

Every DiningSession SHALL maintain:

```text
accessEpoch
```

A guest capability includes the session epoch at issuance.

When the session is closed:

```text
DiningSession.accessEpoch++
```

All previous guest capabilities become invalid.

This provides bulk revocation for:

```text
table closed
session terminated
fraud detected
staff force-close
table transferred
security incident
```

A new dining party SHALL always receive a new DiningSession and new capabilities.

---

## 12. Static QR Reuse Across Multiple Dining Sessions

The physical QR remains unchanged:

```text
TABLE QR
   ↓
Table T-14
```

but the active session changes:

```text
T-14
 ├── DiningSession #981
 │    └── CLOSED
 │
 ├── DiningSession #982
 │    └── CLOSED
 │
 └── DiningSession #983
      └── ACTIVE
```

Therefore:

```text
QRIdentity = persistent
DiningSession = temporary
GuestCapability = ephemeral
```

This is the central architectural separation.

---

## 13. Shared Table Order Visibility

Once joined, RestaurantOS SHALL support configurable shared visibility.

### PRIVATE
Guest sees:
- their own items
- their own order status
- their own payment state

### SHARED
Guest sees:
- all shared table items
- item status
- participant display names
- shared table total

### SHARED_WITH_CONSENT
Each participant controls whether:
- `displayName`
- `avatar`
- `items`
are visible.

### BILL_ONLY
Guest sees:
- table total
- their share
- payment options
but not detailed participant information.

---

## 14. Recommended Default Guest Privacy

Default shared display:

```text
👤 Nikhil
   Butter Chicken ×1

👤 Rahul
   Paneer Tikka ×1

👤 Guest 3
   2 × Naan
```

The following SHALL remain private by default:

```text
phone
email
customerId
loyalty balance
payment instrument
private discounts
private notes
dietary/allergen profile
CRM attributes
staff notes
```

---

## 15. Participant Identity

A participant's visible identity SHALL be a presentation identity, not raw account identity.

Example:

```text
Participant
displayName = "Nikhil"
avatar = generatedAvatar42
```

The platform SHALL never derive shared table display names automatically from:

```text
phone number
email
full legal name
account identifier
```

unless the user explicitly chooses to expose such information.

---

## 16. Host Capability

A DiningSession MAY designate a Host:

```text
Participant.role = HOST
```

Host capabilities may include:

```text
session.join.approve
session.join.reject
session.lock
session.unlock
session.invite
session.visibility.manage
session.transfer_host
```

Host authorization SHALL be independently scoped and must never be inferred only from:

```text
"first device to scan QR"
```

The host capability MUST be generated through an explicit server-side membership transition.

---

## 17. Share Guest Invitation

A participant or host MAY generate a temporary invitation:

```text
Invite
├── diningSessionId
├── issuerParticipantId
├── nonce
├── maxUses
├── expiresAt
├── status
└── riskPolicy
```

Recommended defaults:
- **TTL:** 60–120 seconds
- **maxUses:** 1

Invitation consumption SHALL be atomic. A used invitation SHALL never be reusable.

The invitation SHALL grant only a JoinRequest or narrowly scoped membership exchange, never direct access to another participant's session token.

---

## 18. QR Attack Scenario

### Attack
Attacker photographs:
```text
TABLE 14 QR
```
from a restaurant.

Later:
```text
Attacker opens QR URL from home.
```

### Required result
```text
✅ Restaurant/menu may be visible
✅ Public offers may be visible
✅ Public restaurant information may be visible

❌ Active table order hidden
❌ Customer names hidden
❌ Guest profiles hidden
❌ Payment information hidden
❌ Table controls hidden
❌ Bill hidden
❌ Ability to add to active session denied
```

The attacker must not become a valid Participant merely by possessing the printed QR.

---

## 19. QR Replay Scenario

If the QR locator is copied:
`Attacker A`, `Attacker B`, `Attacker C` may all resolve the same public TableDiscoveryContext.

This is acceptable because discovery is not authorization.

If abnormal behavior occurs:
`100 joins`, `30 IP ranges`, `20 devices`, `5 seconds`

Risk controls SHALL trigger:
- rate limiting
- join throttling
- CAPTCHA / challenge where appropriate
- host approval
- temporary QR lockdown
- security alert

---

## 20. Risk Engine

RestaurantOS SHOULD maintain a guest/session risk score based on signals such as:

```text
join velocity
capability reuse
device changes
abnormal request frequency
coupon velocity
payment anomalies
session age
failed join attempts
impossible concurrent usage
```

IP/location signals MAY be used for anomaly detection but SHALL NOT be treated as definitive proof of physical presence.

---

## 21. Physical-Proximity Security Modes

RestaurantOS MAY support higher-assurance physical-presence mechanisms:

- **Mode A — Static QR:** QR only (Table discovery, low-assurance join).
- **Mode B — QR + One-Time Table Code:** QR + short-lived session-specific rotating code.
- **Mode C — QR + Host Approval:** QR + join request + existing participant approval.
- **Mode D — QR + Staff Approval:** QR + captain approval (recommended for fine dining).
- **Mode E — QR + Proximity Hardware:** QR + NFC/BLE mechanism (deployments requiring strict presence assurance).

*The platform SHALL NOT require Web Bluetooth for the default PWA path because browser support is not universal, particularly on Safari/iOS.*

---

## 22. Table Session Privacy Policy

Each DiningSession SHALL resolve an effective privacy policy:

```typescript
export interface DiningSessionPrivacyPolicy {
  allowGuestJoin: boolean;
  requireApproval: boolean;
  showParticipantNames: boolean;
  showParticipantItems: boolean;
  showSharedTotal: boolean;
  allowGuestInvites: boolean;
  allowGuestOrderForTable: boolean;
  allowGuestRequestBill: boolean;
  allowGuestSplitBill: boolean;
  participantVisibilityMode: 'PRIVATE' | 'SHARED' | 'SHARED_WITH_CONSENT' | 'BILL_ONLY';
}
```

The effective policy is resolved through the hierarchy:  
`Platform` ➔ `Tenant` ➔ `Company` ➔ `Location` ➔ `ServiceArea` ➔ `Table` ➔ `DiningSession`  
*(Most specific valid policy wins).*

---

## 23. API Contract

Recommended public and guest flows:

```text
GET    /api/v1/public/qr/:locator
POST   /api/v1/guest/scans
GET    /api/v1/guest/menu
POST   /api/v1/guest/join-requests
GET    /api/v1/guest/join-requests/:id
POST   /api/v1/guest/join-requests/:id/approve
POST   /api/v1/guest/capabilities/exchange
GET    /api/v1/guest/session
GET    /api/v1/guest/session/shared-order
POST   /api/v1/guest/cart
POST   /api/v1/guest/orders
POST   /api/v1/guest/service-requests
POST   /api/v1/guest/leave
```

Every protected request SHALL independently resolve:
`tenant`, `company`, `location`, `table`, `diningSession`, `participant`, `capability`  
from trusted server-side execution context.

Client-supplied IDs SHALL never establish authorization.

---

## 24. Shared Order Projection

Guests SHALL consume a sanitized projection:

```typescript
export interface SharedOrderProjection {
  readonly itemId: string;
  readonly displayName: string;
  readonly quantity: number;
  readonly participantDisplayName: string;
  readonly preparationStatus: string;
  readonly customerVisibilityState: string;
  readonly estimatedReadyAt?: string;
  readonly orderedAt: string;
}
```

The guest projection SHALL never directly expose raw `Order`, `Customer`, `Payment`, `KitchenTask`, or internal staff objects.

---

## 25. Session Closing

When `DiningSession ➔ CLOSED`:
1. Invalidate all participant capabilities (`accessEpoch++`).
2. Invalidate pending invitations.
3. Invalidate pending join requests.
4. Stop shared real-time WebSocket streams.
5. Close active guest sockets.
6. Freeze participant visibility.
7. Archive session projection.

A later scan of the same physical QR starts a fresh discovery flow for the next DiningSession.

---

## 26. Table Transfer / Merge

- **Table Transfer (e.g., Table 14 ➔ Table 22):** Explicitly recompute `tableScope`, `locationScope`, `sessionScope`, and `capabilityScope`. Never silently broaden an existing guest capability.
- **Table Merge (Session A + Session B ➔ Merged Session):** The membership graph SHALL be explicitly reconstructed and all affected capabilities rotated.

---

## 27. Security Invariant

The following invariant is mandatory:

```text
Knowing the QR locator MUST NOT be sufficient to obtain:
  - DiningSession membership
  - Participant identity
  - Shared order visibility
  - Payment visibility
  - Guest mutation capability
```

The minimum required chain is:

$$\text{QR Locator} \rightarrow \text{Public Table Context} \rightarrow \text{Join Policy} \rightarrow \text{Membership Decision} \rightarrow \text{Guest Capability} \rightarrow \text{Authorized Projection}$$

---

## 28. Core Object Relationship & Boundary

```
Location
   │
   └── Table
        │
        └── QRIdentity
             │
             └── TableDiscoveryContext
                         │
        ═════════════════╪═════════════════  [PUBLIC DISCOVERY BOUNDARY]
                         ▼
                   DiningSession
                    │        │
                    │        └── GuestInvites
                    │
                    ├── Participant A ──── GuestCapability A
                    │
                    ├── Participant B ──── GuestCapability B
                    │
        ═════════════════╪═════════════════  [PARTICIPANT CAPABILITY BOUNDARY]
                         ▼
                    Orders · GuestRequests · SharedBill · Payments
                         │
                         ▼
             SharedOrderProjection
```

---

## 29. The 12 Non-Negotiable Rules

1. Static table QR is **never** a session credential.
2. QR URL **never** contains active session secrets.
3. Scanning QR **never** directly grants session access.
4. Guest membership is explicit and independently authorized.
5. Every participant gets an independent, scoped capability.
6. Participant display identity is separate from private customer identity.
7. Shared order data is served through a sanitized projection.
8. Session capabilities are revoked when the session closes via `accessEpoch++`.
9. Old session capabilities cannot access a new dining party at the same table.
10. Tenant, company, location, and session authorization is server-derived.
11. QR cloning may be detected and mitigated, but static QR cannot prove physical presence by itself.
12. Strong physical-presence assurance requires an additional factor/mechanism.

---

## 30. Canonical Product UX

### Guest A (Table Initiator)
`SCAN QR` ➔ `TABLE 14` ➔ `EXPLORE MENU` ➔ `JOIN TABLE` ➔ Choose *"Nikhil"* ➔ `ACTIVE PARTICIPANT` ➔ `SUBMIT ORDER` ➔ `LIVE SHARED TABLE`

### Guest B (Joining Table Party)
`SCAN SAME QR` ➔ `TABLE 14` ➔ `SESSION ACTIVE` ➔ `JOIN TABLE` ➔ Choose *"Rahul"* ➔ `AUTO-JOIN / APPROVAL` ➔ `PARTICIPANT` ➔ `SEE SHARED ORDER`

### Attacker (Scanning Photograph from Home)
`OPEN COPIED QR` ➔ `TABLE DISCOVERY` ➔ `PUBLIC MENU VISIBLE` ➔ `TRY TO READ ACTIVE SESSION` ➔ ❌ **DENIED / SESSION HIDDEN**

---

## 31. Canonical Mental Model

$$\text{Table QR} = \textbf{Door Address}$$
$$\text{Dining Session} = \textbf{Room Currently Inside That Address}$$
$$\text{Guest Capability} = \textbf{Key to That Specific Room}$$

The restaurant reuses the address forever (`TABLE 14 QR`), while the room/session rotates (`Monday Party`, `Tuesday Party`), and every guest receives an ephemeral scoped key (`Guest A Key`, `Guest B Key`).
