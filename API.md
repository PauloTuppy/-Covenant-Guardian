# API Documentation
## Swagger/OpenAPI Specification

---

## 🔗 Base URL

```
Development:  https://[workspace-id]-staging.xano.io/api
Production:   https://[workspace-id].xano.io/api
```

---

## 🔐 Authentication

All endpoints (except `/auth/login`) require Bearer token in header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     https://api.example.com/contracts
```

### Token Details

- **Type:** JWT (JSON Web Token)
- **Expiry:** 1 hour
- **Refresh:** Use refresh_token to get new token
- **Storage:** Secure httpOnly cookies (recommended)

---

## 📚 API Reference

### 1. AUTHENTICATION ENDPOINTS

#### `POST /auth/login`
**Login user and get tokens**

**Request:**
```json
{
  "email": "user@bank.com",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-001",
    "email": "user@bank.com",
    "bank_id": "bank-001",
    "role": "analyst",
    "name": "John Analyst"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Error (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

#### `POST /auth/refresh`
**Refresh authentication token**

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

#### `POST /auth/logout`
**Logout current user**

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 2. CONTRACT ENDPOINTS

#### `GET /contracts`
**Get all contracts for a bank**

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bank_id | string | Yes | Bank identifier |
| status | string | No | Filter by status: active, watch, default, closed |
| borrower_id | string | No | Filter by borrower |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20, max: 100) |
| sort | string | No | Sort field: principal_amount, maturity_date, created_at |
| order | string | No | Sort order: asc, desc (default: desc) |

**Response (200):**
```json
{
  "success": true,
  "contracts": [
    {
      "id": "contract-001",
      "bank_id": "bank-001",
      "borrower_id": "borrower-001",
      "contract_name": "Syndicated Facility - TechVision",
      "contract_number": "LOAN-2024-0001",
      "principal_amount": 250000000,
      "currency": "USD",
      "origination_date": "2024-01-15",
      "maturity_date": "2027-01-15",
      "interest_rate": 4.75,
      "status": "active",
      "covenant_count": 5,
      "breached_covenant_count": 0,
      "alert_count": 0,
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2024-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

**Example cURL:**
```bash
curl -X GET "https://api.example.com/contracts?bank_id=bank-001&status=active&page=1" \
  -H "Authorization: Bearer TOKEN"
```

---

#### `GET /contracts/:id`
**Get detailed contract information**

**Response (200):**
```json
{
  "success": true,
  "contract": {
    "id": "contract-001",
    "bank_id": "bank-001",
    "borrower_id": "borrower-001",
    "borrower": {
      "id": "borrower-001",
      "legal_name": "TechVision Solutions Inc",
      "ticker_symbol": "TVSI",
      "industry": "Technology",
      "credit_rating": "A-"
    },
    "contract_name": "Syndicated Facility - TechVision",
    "contract_number": "LOAN-2024-0001",
    "principal_amount": 250000000,
    "currency": "USD",
    "origination_date": "2024-01-15",
    "maturity_date": "2027-01-15",
    "interest_rate": 4.75,
    "status": "active",
    "created_at": "2024-01-15T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

---

#### `POST /contracts`
**Create new contract**

**Request:**
```json
{
  "bank_id": "bank-001",
  "borrower_id": "borrower-001",
  "contract_name": "New Facility",
  "contract_number": "LOAN-2024-0050",
  "principal_amount": 100000000,
  "currency": "USD",
  "origination_date": "2024-12-08",
  "maturity_date": "2027-12-08",
  "interest_rate": 5.00,
  "status": "active"
}
```

**Response (201):**
```json
{
  "success": true,
  "contract": {
    "id": "contract-050",
    "bank_id": "bank-001",
    "borrower_id": "borrower-001",
    "contract_name": "New Facility",
    "contract_number": "LOAN-2024-0050",
    "principal_amount": 100000000,
    "currency": "USD",
    "origination_date": "2024-12-08",
    "maturity_date": "2027-12-08",
    "interest_rate": 5.00,
    "status": "active",
    "created_at": "2024-12-08T15:30:00Z",
    "updated_at": "2024-12-08T15:30:00Z"
  }
}
```

---

#### `PUT /contracts/:id`
**Update contract**

**Request:**
```json
{
  "status": "watch",
  "interest_rate": 5.25
}
```

**Response (200):**
```json
{
  "success": true,
  "contract": {
    "id": "contract-001",
    "status": "watch",
    "interest_rate": 5.25,
    "updated_at": "2024-12-08T15:35:00Z"
  }
}
```

---

### 3. COVENANT ENDPOINTS

#### `GET /contracts/:id/covenants`
**Get all covenants for a contract**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by type: financial, operational, reporting |
| status | string | Filter by status: compliant, warning, breached |

**Response (200):**
```json
{
  "success": true,
  "covenants": [
    {
      "id": "covenant-001",
      "contract_id": "contract-001",
      "covenant_name": "Maximum Leverage Ratio",
      "covenant_type": "financial",
      "metric_name": "Total Debt / EBITDA",
      "operator": "<",
      "threshold_value": 3.5,
      "threshold_unit": "ratio",
      "check_frequency": "quarterly",
      "covenant_clause": "Borrower shall not permit Total Debt to exceed 3.5x EBITDA...",
      "gemini_extracted": true,
      "health": {
        "id": "health-001",
        "status": "compliant",
        "last_reported_value": 2.85,
        "last_reported_date": "2024-12-01T00:00:00Z",
        "threshold_value": 3.5,
        "buffer_percentage": 23.5,
        "days_to_breach": 180,
        "trend": "stable",
        "gemini_risk_assessment": "Covenant is well-managed...",
        "recommended_action": "Continue monitoring quarterly..."
      },
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

---

#### `POST /contracts/:id/covenants`
**Add covenant to contract**

**Request:**
```json
{
  "covenant_name": "New Covenant",
  "covenant_type": "financial",
  "metric_name": "Debt Service Coverage Ratio",
  "operator": ">",
  "threshold_value": 1.25,
  "threshold_unit": "ratio",
  "check_frequency": "quarterly",
  "covenant_clause": "DSCR must remain above 1.25x..."
}
```

**Response (201):**
```json
{
  "success": true,
  "covenant": {
    "id": "covenant-050",
    "contract_id": "contract-001",
    "covenant_name": "New Covenant",
    "covenant_type": "financial",
    "metric_name": "Debt Service Coverage Ratio",
    "operator": ">",
    "threshold_value": 1.25,
    "threshold_unit": "ratio",
    "check_frequency": "quarterly",
    "gemini_extracted": false,
    "created_at": "2024-12-08T15:40:00Z"
  }
}
```

---

### 4. ALERT ENDPOINTS

#### `GET /alerts`
**Get all alerts for a bank**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| bank_id | string | Required - Bank identifier |
| severity | string | Filter: critical, high, medium, low |
| status | string | Filter: new, acknowledged, resolved |
| alert_type | string | Filter: breach, warning, reporting_due |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert-001",
      "covenant_id": "covenant-013",
      "contract_id": "contract-004",
      "alert_type": "breach",
      "severity": "critical",
      "title": "URGENT: Leverage Covenant Breached - BioPharma Solutions",
      "description": "Total Debt/EBITDA reached 4.25x, exceeding maximum of 3.0x",
      "status": "new",
      "triggered_at": "2024-12-07T10:30:00Z",
      "acknowledged_by": null,
      "acknowledged_at": null,
      "created_at": "2024-12-07T10:30:00Z",
      "updated_at": "2024-12-07T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

---

#### `PUT /alerts/:id/acknowledge`
**Mark alert as acknowledged**

**Request:**
```json
{
  "comment": "Discussing breach remediation with borrower"
}
```

**Response (200):**
```json
{
  "success": true,
  "alert": {
    "id": "alert-001",
    "status": "acknowledged",
    "acknowledged_by": "user-001",
    "acknowledged_at": "2024-12-08T15:45:00Z",
    "comment": "Discussing breach remediation with borrower",
    "updated_at": "2024-12-08T15:45:00Z"
  }
}
```

---

#### `PUT /alerts/:id/resolve`
**Resolve an alert**

**Request:**
```json
{
  "resolution": "Covenant violation corrected, leverage now 2.8x"
}
```

**Response (200):**
```json
{
  "success": true,
  "alert": {
    "id": "alert-001",
    "status": "resolved",
    "resolved_by": "user-001",
    "resolved_at": "2024-12-08T16:00:00Z",
    "resolution": "Covenant violation corrected, leverage now 2.8x",
    "updated_at": "2024-12-08T16:00:00Z"
  }
}
```

---

### 5. REPORT ENDPOINTS

#### `POST /reports/generate`
**Generate compliance report**

**Request:**
```json
{
  "bank_id": "bank-001",
  "report_type": "portfolio_summary",
  "start_date": "2024-10-01",
  "end_date": "2024-12-08",
  "format": "pdf"
}
```

**Response (200):**
```json
{
  "success": true,
  "report": {
    "id": "report-001",
    "bank_id": "bank-001",
    "report_type": "portfolio_summary",
    "file_url": "https://storage.example.com/reports/report-001.pdf",
    "file_size": 2458624,
    "generated_at": "2024-12-08T16:05:00Z",
    "expires_at": "2025-01-08T16:05:00Z",
    "download_url": "https://api.example.com/reports/report-001/download?token=xyz"
  }
}
```

---

### 6. BORROWER ENDPOINTS

#### `GET /borrowers`
**Get all borrowers for a bank**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| bank_id | string | Required - Bank identifier |
| industry | string | Filter by industry |
| page | number | Page number |
| limit | number | Results per page |

**Response (200):**
```json
{
  "success": true,
  "borrowers": [
    {
      "id": "borrower-001",
      "bank_id": "bank-001",
      "legal_name": "TechVision Solutions Inc",
      "ticker_symbol": "TVSI",
      "industry": "Technology",
      "country": "USA",
      "credit_rating": "A-",
      "website": "https://techvisionsolutions.com",
      "contract_count": 1,
      "total_exposure": 250000000,
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

---

## 🔄 Common Patterns

### Pagination

All list endpoints support pagination:

```bash
GET /contracts?bank_id=bank-001&page=2&limit=50
```

Response includes pagination info:
```json
{
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 150,
    "pages": 3,
    "has_next": true,
    "has_prev": true
  }
}
```

### Error Responses

All errors follow consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "error_code": "COVENANT_NOT_FOUND",
  "details": {
    "covenant_id": "covenant-999"
  }
}
```

**Common Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## 📊 Webhook Events

Subscribe to real-time events:

```bash
POST /webhooks/subscribe
{
  "url": "https://your-app.com/webhooks/covenant-breached",
  "event": "covenant.breached",
  "active": true
}
```

**Available Events:**
- `covenant.breached` - Covenant breach detected
- `covenant.warning` - Covenant approaching limit
- `alert.created` - New alert created
- `alert.acknowledged` - Alert acknowledged
- `contract.created` - New contract added
- `contract.updated` - Contract updated
- `report.generated` - Report ready for download

---

## 🔒 Rate Limiting

```
Standard: 1000 requests/hour per API key
Premium: 10000 requests/hour per API key

Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1702062000
```

---

## 🧪 Example Requests

### JavaScript/Fetch

```javascript
// Get contracts
const response = await fetch(
  'https://api.example.com/contracts?bank_id=bank-001',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();
```

### Python/Requests

```python
import requests

headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'https://api.example.com/contracts',
    params={'bank_id': 'bank-001'},
    headers=headers
)
data = response.json()
```

### cURL

```bash
curl -X GET 'https://api.example.com/contracts?bank_id=bank-001' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json'
```

---

## 📖 OpenAPI Specification

Full Swagger/OpenAPI spec available at:
```
GET https://api.example.com/swagger
GET https://api.example.com/openapi.json
```

Interactive documentation:
```
https://api.example.com/docs
https://api.example.com/swagger-ui
```

