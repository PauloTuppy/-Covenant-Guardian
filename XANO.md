# Xano Backend Guide
## Visual Backend Builder Setup & Deployment

---

## 📚 Table of Contents

1. [Xano Project Setup](#xano-project-setup)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Branching & Merging](#branching--merging)
5. [Workflows & Automation](#workflows--automation)
6. [Publishing & Deployment](#publishing--deployment)
7. [Monitoring & Logs](#monitoring--logs)
8. [Best Practices](#best-practices)

---

## 🚀 Xano Project Setup

### Step 1: Create Workspace

```
1. Go to xano.com
2. Click "Create Workspace"
3. Name: covenant-guardian-prod
4. Select Plan:
   ├─ Hobby (Free) - For learning
   ├─ Starter ($10/mo) - Small apps
   ├─ Professional ($50/mo) - Production ready ✅
   └─ Custom - Enterprise scale
```

### Step 2: Initialize Database

```
In Xano Visual Builder:

1. Data > Tables
2. Create tables:
   ├─ banks
   ├─ borrowers
   ├─ contracts
   ├─ covenants
   ├─ covenant_health
   ├─ alerts
   ├─ alert_history
   └─ adverse_events

3. Set up relationships:
   banks.id → contracts.bank_id
   borrowers.id → contracts.borrower_id
   contracts.id → covenants.contract_id
   etc.
```

### Step 3: Load Demo Data

```sql
-- In Xano Database Manager:

1. Click "Import"
2. Upload: seed_demo_data.sql
3. Select tables to import
4. Verify 82 records loaded

Demo data includes:
├─ 3 Banks
├─ 10 Borrowers
├─ 10 Contracts
├─ 21 Covenants
├─ 21 Health records
├─ 8 Alerts
└─ 9 Adverse events
```

---

## 📊 Database Schema

### Core Tables

#### `banks` Table
```
CREATE TABLE banks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  subscription_tier VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

Example:
id: "bank-001"
name: "First Capital Bank"
country: "USA"
subscription_tier: "professional"
```

#### `borrowers` Table
```
CREATE TABLE borrowers (
  id TEXT PRIMARY KEY,
  bank_id TEXT REFERENCES banks(id),
  legal_name TEXT NOT NULL,
  ticker_symbol TEXT,
  industry TEXT,
  country TEXT,
  credit_rating VARCHAR(10),
  website TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

Example:
id: "borrower-001"
bank_id: "bank-001"
legal_name: "TechVision Solutions Inc"
ticker_symbol: "TVSI"
industry: "Technology"
credit_rating: "A-"
```

#### `contracts` Table
```
CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  bank_id TEXT REFERENCES banks(id),
  borrower_id TEXT REFERENCES borrowers(id),
  contract_name TEXT NOT NULL,
  contract_number TEXT NOT NULL,
  principal_amount DECIMAL(15,2),
  currency VARCHAR(3),
  origination_date DATE,
  maturity_date DATE,
  interest_rate DECIMAL(5,2),
  status VARCHAR(20), -- active, watch, default, closed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `covenants` Table
```
CREATE TABLE covenants (
  id TEXT PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id),
  bank_id TEXT REFERENCES banks(id),
  covenant_name TEXT NOT NULL,
  covenant_type VARCHAR(50), -- financial, operational, reporting
  metric_name TEXT,
  operator VARCHAR(5), -- <, >, =, >=, <=
  threshold_value DECIMAL(15,2),
  threshold_unit VARCHAR(50),
  check_frequency VARCHAR(20), -- quarterly, monthly, annually
  covenant_clause TEXT,
  gemini_extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `covenant_health` Table
```
CREATE TABLE covenant_health (
  id TEXT PRIMARY KEY,
  covenant_id TEXT REFERENCES covenants(id),
  contract_id TEXT REFERENCES contracts(id),
  bank_id TEXT REFERENCES banks(id),
  status VARCHAR(20), -- compliant, warning, breached
  last_reported_value DECIMAL(15,2),
  last_reported_date TIMESTAMP,
  threshold_value DECIMAL(15,2),
  buffer_percentage DECIMAL(5,2),
  days_to_breach INTEGER,
  trend VARCHAR(20), -- improving, stable, deteriorating
  gemini_risk_assessment TEXT,
  recommended_action TEXT,
  last_calculated TIMESTAMP DEFAULT NOW()
);
```

#### `alerts` Table
```
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  covenant_id TEXT REFERENCES covenants(id),
  contract_id TEXT REFERENCES contracts(id),
  bank_id TEXT REFERENCES banks(id),
  alert_type VARCHAR(20), -- breach, warning, reporting_due
  severity VARCHAR(20), -- critical, high, medium, low
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20), -- new, acknowledged, resolved
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 API Endpoints

### Authentication Endpoints

#### `POST /auth/login`
```
Request:
{
  "email": "user@bank.com",
  "password": "secure_password"
}

Response:
{
  "success": true,
  "user": {
    "id": "user-001",
    "email": "user@bank.com",
    "bank_id": "bank-001",
    "role": "analyst"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### `POST /auth/refresh`
```
Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Contract Endpoints

#### `GET /contracts`
```
Query Parameters:
- bank_id: string (required)
- status?: "active" | "watch" | "default"
- page?: number (default: 1)
- limit?: number (default: 20)

Response:
{
  "success": true,
  "contracts": [
    {
      "id": "contract-001",
      "contract_name": "Syndicated Facility - TechVision",
      "contract_number": "LOAN-2024-0001",
      "principal_amount": 250000000,
      "currency": "USD",
      "status": "active",
      "interest_rate": 4.75,
      "covenant_count": 5,
      "breached_covenant_count": 0,
      "alert_count": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  }
}
```

#### `GET /contracts/:id`
```
Response:
{
  "success": true,
  "contract": {
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
    "created_at": "2024-01-15T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z"
  }
}
```

### Covenant Endpoints

#### `GET /contracts/:id/covenants`
```
Response:
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
      "health": {
        "status": "compliant",
        "last_reported_value": 2.85,
        "buffer_percentage": 23.5,
        "days_to_breach": 180,
        "trend": "stable"
      }
    }
  ]
}
```

### Alert Endpoints

#### `GET /alerts`
```
Query Parameters:
- bank_id: string (required)
- severity?: "critical" | "high" | "medium"
- status?: "new" | "acknowledged"
- page?: number

Response:
{
  "success": true,
  "alerts": [
    {
      "id": "alert-001",
      "covenant_id": "covenant-013",
      "contract_id": "contract-004",
      "alert_type": "breach",
      "severity": "critical",
      "title": "URGENT: Leverage Covenant Breached",
      "description": "Total Debt/EBITDA reached 4.25x, exceeding max of 3.0x",
      "status": "new",
      "triggered_at": "2024-12-08T10:30:00Z"
    }
  ]
}
```

#### `PUT /alerts/:id/acknowledge`
```
Request:
{
  "acknowledged_by": "user-001",
  "comment": "Discussing with borrower"
}

Response:
{
  "success": true,
  "alert": {
    "id": "alert-001",
    "status": "acknowledged",
    "updated_at": "2024-12-08T12:00:00Z"
  }
}
```

---

## 🌿 Branching & Merging

### Understanding Branches

```
┌─────────────────────────────────────────┐
│        XANO BRANCHING STRATEGY          │
├─────────────────────────────────────────┤
│                                         │
│  main (Production)                      │
│  ├─ API: [workspace].xano.io/api       │
│  ├─ Database: Production PostgreSQL    │
│  └─ STABLE - No experiments            │
│                                         │
│  staging (Testing)                      │
│  ├─ API: [workspace]-staging.xano.io   │
│  ├─ Database: Copy of production       │
│  └─ TESTING - Safe for experiments     │
│                                         │
│  feature/* (Development)                │
│  ├─ Created from: staging              │
│  ├─ API: Not accessible externally     │
│  └─ EXPERIMENTAL - New features        │
│                                         │
└─────────────────────────────────────────┘
```

### Creating a Feature Branch

```
In Xano Dashboard:

1. Click "Branching" (top right)
2. Click "Create Branch"
3. Branch from: staging
4. Name: feature/ai-extraction
5. Description: "Add Gemini AI covenant extraction"
6. Click "Create"

Your changes are now isolated!
```

### Testing Before Merge

```
1. In Feature Branch:
   ├─ Add new API endpoints
   ├─ Create workflows
   ├─ Test with Xano Preview
   └─ Verify data integrity

2. Use Xano Preview:
   ├─ Built-in testing environment
   ├─ Test all endpoints
   ├─ Simulate edge cases
   └─ Check error handling

3. When satisfied:
   └─ Create Merge Request
```

### Merging Branches

```
In Xano Dashboard:

1. Feature branch → Click "Merge"
2. Select target: staging
3. Review changes:
   ├─ New tables
   ├─ API changes
   ├─ Workflow modifications
   └─ Data transformations
4. Check for conflicts
5. Click "Confirm Merge"

Xano handles schema migrations automatically!
```

### Promoting to Production

```
1. In staging branch:
   ├─ Verify all tests pass
   ├─ Check API responses
   ├─ Validate data integrity
   └─ Review performance metrics

2. Create Merge Request:
   └─ staging → main

3. Approval process:
   ├─ Code review required
   ├─ Tests must pass
   └─ No conflicts allowed

4. Merge & Publish:
   ├─ Merge to main
   ├─ Publish main branch
   └─ Monitor API endpoints
```

---

## ⚙️ Workflows & Automation

### Creating a Workflow

Example: Auto-extract covenants when contract uploaded

```
In Xano Visual Builder:

1. Function > New Function
2. Type: Workflow
3. Name: "Extract Covenants from Contract"
4. Trigger: API Endpoint

Flow:
├─ Step 1: Receive contract file
├─ Step 2: Call Gemini API for extraction
├─ Step 3: Parse covenant data
├─ Step 4: Insert into covenants table
├─ Step 5: Update covenant_health with status
└─ Step 6: Return extracted covenants

Configuration:
├─ Trigger URL: POST /contracts/extract
├─ Input: contract_id, file_url
├─ Output: extracted_covenants
└─ Auth: Requires JWT token
```

### Scheduled Workflows

Example: Daily covenant health check

```
1. Function > Background Tasks
2. Create new task: "Daily Covenant Health Check"
3. Schedule: Every day at 00:00 UTC
4. Logic:
   ├─ Get all active covenants
   ├─ Calculate current status
   ├─ Compare with thresholds
   ├─ Create/update covenant_health records
   ├─ Trigger alerts if status changed
   └─ Log results

Performance:
├─ Runs asynchronously
├─ Processes 10,000+ covenants
├─ Completes in <60 seconds
└─ Logs stored automatically
```

### Triggered Workflows

Example: Alert on covenant breach

```
1. Function > Triggers
2. Create trigger: "Covenant Breach Alert"
3. Trigger Type: Database Change
4. Table: covenant_health
5. When: status changes to "breached"
6. Action:
   ├─ Create alert record
   ├─ Send email notification
   ├─ Update contract status to "watch"
   ├─ Log event
   └─ Notify dashboard (WebSocket)
```

---

## 📤 Publishing & Deployment

### Understanding Publishing

```
Publishing = Making changes live in a branch

┌─────────────────────────────┐
│  XANO BRANCHES              │
├─────────────────────────────┤
│                             │
│  Draft Changes              │
│  (Your edits)               │
│  ↓ PUBLISH                  │
│  Published                  │
│  (Live in branch)           │
│  ↓ MERGE                    │
│  Another Branch             │
│  ↓ PUBLISH                  │
│  Live to users              │
│                             │
└─────────────────────────────┘
```

### Publishing Workflow

#### Step 1: Publish Staging Branch

```
In Xano Dashboard:

1. Select "staging" branch
2. Click "Publish" (top right)
3. Review changes:
   └─ See all unpublished items
4. Select items to publish:
   ├─ New APIs
   ├─ Modified workflows
   ├─ Deleted endpoints
   └─ Database changes
5. Click "Publish Changes"

Staging API now reflects changes:
└─ [workspace]-staging.xano.io/api
```

#### Step 2: Verify Staging

```
1. Frontend connects to staging API
2. Run tests:
   ├─ Integration tests
   ├─ E2E tests
   └─ Manual testing
3. Verify endpoints:
   ├─ All return correct data
   ├─ Error handling works
   └─ Performance acceptable
4. If issues found:
   └─ Fix in staging, republish
```

#### Step 3: Merge to Main

```
In Xano Dashboard:

1. Create Merge Request
   ├─ From: staging
   ├─ To: main
   └─ Title: "Release v1.2.0"

2. Xano shows differences:
   ├─ New tables
   ├─ API changes
   ├─ Workflow modifications
   └─ Conflict detection

3. Resolve conflicts if any:
   └─ Xano guides you through process

4. Click "Merge" to confirm
```

#### Step 4: Publish Main

```
1. Switch to "main" branch
2. Click "Publish"
3. Select all staged changes
4. Click "Publish Changes"

Production API is now live:
└─ [workspace].xano.io/api

All connected frontends updated!
```

### Rollback Procedure

```
If something goes wrong in production:

1. Identify the issue
2. Click "Restore" on problematic changes
3. Xano shows previous state
4. Click "Publish Restore"

⚠️ Important:
├─ Rollback is data-safe
├─ Only reverts schema/API changes
├─ Data remains intact
└─ Use with care (test in staging first!)
```

---

## 📊 Monitoring & Logs

### API Logs

```
In Xano Dashboard:

1. Go to "Logs"
2. View all API calls:
   ├─ Endpoint called
   ├─ Request parameters
   ├─ Response status
   ├─ Execution time
   ├─ Error messages
   └─ Timestamp

Filter by:
├─ Endpoint
├─ Status code (200, 400, 500)
├─ Time range
└─ Search query
```

### Performance Monitoring

```
1. Dashboard > Analytics
2. See metrics:
   ├─ API calls per minute
   ├─ Average response time
   ├─ Error rate
   ├─ Database queries
   └─ Webhook deliveries

Set up alerts:
└─ Notify when response time > 1s
└─ Notify on error rate > 1%
└─ Notify when rate limits near
```

### Database Monitoring

```
1. Data > Database
2. View:
   ├─ Storage used
   ├─ Query execution times
   ├─ Index efficiency
   ├─ Backup status
   └─ Connection count

Optimize:
├─ Add indexes for slow queries
├─ Archive old data
├─ Monitor table sizes
└─ Review query plans
```

---

## 🎯 Best Practices

### API Design

```
✅ DO:
├─ Use meaningful endpoint names
├─ Return consistent response format
├─ Include error details
├─ Document parameters & responses
├─ Version your APIs (/v1, /v2)
├─ Use proper HTTP methods
└─ Implement rate limiting

❌ DON'T:
├─ Return raw database dumps
├─ Expose sensitive field names
├─ Use query params for mutations
├─ Return inconsistent structures
├─ Leak error details to users
└─ Forget about pagination
```

### Workflow Optimization

```
✅ DO:
├─ Keep workflows focused & small
├─ Use loops for batch operations
├─ Add error handling
├─ Log important steps
├─ Test with Xano Preview
├─ Monitor execution time
└─ Document complex logic

❌ DON'T:
├─ Create massive workflows
├─ Forget error cases
├─ Make untested deployments
├─ Ignore performance
├─ Hard-code values
└─ Skip logging
```

### Data Integrity

```
✅ DO:
├─ Use foreign keys
├─ Add unique constraints
├─ Validate input data
├─ Set default values
├─ Create regular backups
├─ Document schema
└─ Version database

❌ DON'T:
├─ Store denormalized data
├─ Skip validation
├─ Assume data quality
├─ Change schema without testing
├─ Forget backups
└─ Leave orphaned records
```

### Security

```
✅ DO:
├─ Always use JWT tokens
├─ Validate all inputs
├─ Check user permissions
├─ Log security events
├─ Use HTTPS only
├─ Rotate secrets regularly
└─ Keep dependencies updated

❌ DON'T:
├─ Store passwords plain text
├─ Trust user input
├─ Expose sensitive data
├─ Skip rate limiting
├─ Log passwords/tokens
├─ Use weak authentication
└─ Ignore security updates
```

---

## 📚 Additional Resources

- **Xano Documentation:** https://docs.xano.com
- **API Reference:** https://docs.xano.com/api
- **Visual Builder Guide:** https://docs.xano.com/visual-builder
- **Branching & Merging:** https://docs.xano.com/team-collaboration/branching-and-merging
- **Community Forum:** https://community.xano.com

---

**Happy building! 🚀**

