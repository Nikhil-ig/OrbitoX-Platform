# Universal API Standards Specification

---

## Executive Summary

All platform endpoints follow a standardized **RESTful API Specification** with predictable URL structures, request header conventions, pagination contracts, and response envelopes.

---

## 1. Universal Request Header Matrix Table

| Header Name | Requirement | Data Format | Description | Example Value |
|---|---|---|---|---|
| `Authorization` | Mandatory | `Bearer <token>` | RS256 Signed JWT Auth Token | `Bearer eyJhbGciOi...` |
| `X-Org-ID` | Mandatory for Tier 1+ | UUID v4 | Resolved Organisation Context ID | `7b9a2c3d-1111-4000-8000-000000000001` |
| `X-Tenant-ID` | Mandatory for Tier 2+ | UUID v4 | Resolved Tenant Context ID | `8c0b3d4e-2222-4000-8000-000000000002` |
| `X-Company-ID` | Mandatory for Tier 3+ | UUID v4 | Resolved Company Context ID | `9d1c4e5f-3333-4000-8000-000000000003` |
| `X-Correlation-ID`| Optional | UUID v4 | Distributed Tracing ID | `trace_a1b2c3d4e5` |
| `Content-Type` | Mandatory for POST/PUT | String | Payload MIME type | `application/json` |

---

## 2. HTTP Status Code Standard Matrix Table

| HTTP Status Code | Meaning | Used When | Response Body Envelope |
|---|---|---|---|
| `200 OK` | Request Succeeded | Successful `GET`, `PUT`, `PATCH` requests | `SingleEntityResponse` or `PaginatedListResponse` |
| `201 Created` | Resource Created | Successful `POST` entity creation | `SingleEntityResponse` |
| `204 No Content` | Deleted | Successful `DELETE` operation | (Empty Body) |
| `400 Bad Request` | Syntax Error | Malformed JSON or invalid parameter syntax | `ErrorResponse` |
| `401 Unauthorized` | Missing Auth | Expired or invalid Bearer JWT token | `ErrorResponse` |
| `403 Forbidden` | Access Denied | RBAC permission failure or tenant context breach | `ErrorResponse` |
| `404 Not Found` | Not Found | Entity does not exist in target tenant | `ErrorResponse` |
| `429 Too Many Requests`| Rate Limited | Exceeded Redis sliding window rate limit | `ErrorResponse` (+ `Retry-After` Header) |
| `500 Server Error` | System Error | Unexpected server runtime exception | `ErrorResponse` (Sanitized) |

---

## 3. Query Parameter Pagination & Search Table

| Query Parameter | Type | Default Value | Max Value | Description |
|---|---|---|---|---|
| `page` | Integer | `1` | N/A | Page number for pagination (1-indexed) |
| `limit` | Integer | `20` | `100` | Number of items per page |
| `sort_by` | String | `created_at` | N/A | Database column name to sort by |
| `sort_order` | String | `DESC` | `ASC` / `DESC` | Sorting direction |
| `search` | String | (Empty) | 100 chars | Full-text search term across indexed fields |
| `filter[field]` | String | (Empty) | N/A | Exact match filter (e.g., `filter[status]=COMPLETED`) |

---

## 4. Standard Success Response Envelope

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "ord_998877",
    "total": 149.99,
    "status": "COMPLETED"
  },
  "meta": {
    "timestamp": "2026-07-29T14:45:00.000Z",
    "executionTimeMs": 42
  }
}
```

---

## 5. Standard Paginated Response Envelope

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "id": "ord_001" },
    { "id": "ord_002" }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 154,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```
