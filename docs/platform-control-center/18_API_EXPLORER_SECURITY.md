# 🪐 OrbitoX Platform Control Center: API Explorer Security & Test Lab Lifecycle
**Document Ref: PCC-18**  
**Classification: Diagnostic Execution Boundaries, Verification Lifecycle & Telemetry Truth**

---

## 1. API Explorer Security Architecture

The Live API Explorer (`/platform/explorer`) allows operators to inspect and test endpoints across all 9 OrbitoX engines. However, embedding raw production secrets into browser JavaScript creates severe security vulnerabilities:
- Exposure to browser extensions or XSS.
- Accidental mutation of live production data.
- Loss of non-repudiation in audit logging.

To resolve this, the OrbitoX API Explorer operates across **Three Strict Security Boundaries**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       API EXPLORER SECURITY BOUNDARIES                      │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ 1. OBSERVE MODE   │ • Read-only operations (`GET`, `HEAD`)                  │
│    (Default)      │ • Zero data mutations permitted                         │
│                   │ • Safe for exploratory inspection across all environments│
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 2. SANDBOX MODE   │ • Mutations permitted against isolated test fixtures    │
│                   │ • Scoped to ephemeral or sandbox database partitions    │
│                   │ • Zero impact on real client ledgers or customers       │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 3. LIVE PROD MODE │ • Direct execution against live production systems      │
│   (Guarded)       │ • Requires elevated admin re-authentication (WebAuthn)  │
│                   │ • Requires mandatory Idempotency Key                    │
│                   │ • Displays pre-flight Blast Radius impact dialog        │
│                   │ • Requires explicit typed confirmation:                 │
│                   │   "EXECUTE LIVE MUTATION AGAINST [OMNIDELIVER]"         │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 2. Server-Side Execution Proxy (Zero Browser Secret Exposure)

The browser **never receives a reusable production API key secret**. Instead, all calls route through the Server-Side Execution Proxy:

```
┌──────────────┐                  ┌────────────────────────┐                  ┌──────────────┐
│  Browser UI  │ ───────────────> │ Server-Side API Proxy  │ ───────────────> │ Destination  │
│  (Operator)  │   POST /execute  │ (/api/v1/platform/exp) │   HTTP Request   │ Microservice │
└──────────────┘                  └────────────────────────┘                  └──────────────┘
  Sends:                            Validates:                                  Executes with:
  • Endpoint Path                   • Operator Session                          • Server-derived
  • Target Env                      • Mode Boundary                             • Internal mTLS
  • Query / Body                    • Target Permissions                        • Audit Token
                                    • Attaches Trace ID
```

1. The browser sends the request payload and destination metadata to `/api/v1/platform/explorer/execute`.
2. The proxy verifies the operator's admin session and role.
3. The proxy injects a short-lived internal service token (valid for 5 seconds).
4. The destination microservice executes the request and returns the response.
5. The proxy captures status, latency, response headers, and audit traces, returning sanitized output to the browser.
6. The entire execution is committed to `AuditService.log()`.

---

## 3. Platform Verification Center (Test Lab) Lifecycle

The Test Lab (`/platform/tests`) provides automated verification across Contract, Security, Tenant Isolation, and Concurrency suites:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TEST RUN DATA MODEL                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                 TestRun
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
TestSuite (Contract Tests)                               TestSuite (Tenant Isolation)
    │                                                               │
    ├─ TestCase: Schema Compliance                                  ├─ TestCase: Cross-Tenant Key Access
    ├─ TestCase: Response Types                                     ├─ TestCase: BOLA Project Boundary
    └─ Evidence: Trace #TR-9421                                     └─ Evidence: 403 Response & Latency
```

### 3.1. Test Run Metadata:
- `id`: Unique run identifier (e.g., `run_20261007_01j7x9`).
- `gitCommitSha`: Head commit hash of the platform build.
- `platformVersion`: Core kernel runtime version.
- `packageVersions`: Snapshot of all installed package versions.
- `environmentId`: Target execution environment (`staging` or `production`).
- `triggeredBy`: Operator email or CI/CD webhook.
- `startedAt`, `completedAt`, `durationMs`.
- `finalVerdict`: Derived run status.

### 3.2. Strict 5-State Verdict Matrix:
To prevent false confidence, the test engine strictly enforces five verdict states:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TEST VERDICT STATES                             │
├───────────┬─────────────────────────────────────────────────────────────────┤
│ PASS      │ Assertion verified successfully within expected latency SLA.    │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ FAIL      │ Assertion failed (e.g. Expected 403, received 200). Critical.   │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ BLOCKED   │ Test could not execute due to environment or dependency fault   │
│           │ (e.g. Redis unavailable, database connection dropped).          │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ SKIPPED   │ Test intentionally bypassed (e.g. feature not enabled on tier). │
│           │ *NEVER counted as a pass in success metrics.*                   │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ NOT_RUN   │ Test queued but execution was aborted before invocation.        │
└───────────┴─────────────────────────────────────────────────────────────────┘
```

A test run with 45 `PASS` and 5 `SKIPPED` displays:  
**45 Passed • 5 Skipped (0% Failures, 90% Completed)** — never "100% Passed".

---

## 4. Telemetry Truth Invariants

A core architectural principle of OrbitoX is **Production Truth**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TELEMETRY RETRIEVAL DECISION TREE                       │
└─────────────────────────────────────────────────────────────────────────────┘

                   Query Real-Time Metrics Agent
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
         Agent Connected &                Agent Disconnected or
          Emitting Sockets                  Data Stream Missing
                 │                                 │
                 ▼                                 ▼
         Display Real Data:               Display Truthful State:
         • Actual CPU / RAM               • "Telemetry Unavailable"
         • Actual Latency (p50/p95/p99)   • Gray / Stale Status Pill
         • Actual Redis Queue Depth       • Action: "Check Agent Daemon"
         • Actual Error Rate              • Zero Synthetic 100% Badges
```

### Invariants:
1. **No Synthetic Green Badges**: If the Redis health monitor is unreachable, the UI must render `Degraded / Telemetry Unreachable`, never a default `Healthy (0ms)`.
2. **Error Visibility**: When API error rates spike to 4.2%, the metric cards highlight in amber/red with immediate navigation to recent failed request traces.
3. **Traceability**: Every metric displayed on the Overview Cockpit is traceable to a specific Prometheus/OTel collector or Postgres/Redis aggregation query.
