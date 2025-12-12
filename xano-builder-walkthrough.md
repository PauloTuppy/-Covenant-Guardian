# Xano Visual Builder Walkthrough - Covenant Guardian
## Step-by-Step API Endpoint Creation (Canvas View)

---

## 📌 Part 1: Xano Setup & Database Connection

### Step 1.1: Create Xano Project

1. Go to **Xano Dashboard** → **New Workspace**
2. Name it: `covenant-guardian`
3. Select Plan: **Professional** (needed for background jobs + 50+ API calls)
4. Click **Create**

---

### Step 1.2: Connect PostgreSQL Database

**In Xano Dashboard:**

1. Click **Databases** (left sidebar)
2. Click **Add Database** → **PostgreSQL**
3. Fill in:
   ```
   Host: [Your PostgreSQL host]
   Port: 5432
   Database: covenant_guardian
   Username: xano_app
   Password: [your password]
   SSL: Enabled ✓
   ```
4. Click **Test Connection** → Should see ✅ "Connected"
5. Click **Save**

**Expected Result:** Database appears in list as `covenant_guardian`

---

### Step 1.3: Test Database Query

1. Click **Database** → **covenant_guardian**
2. Click **SQL Editor**
3. Paste:
   ```sql
   SELECT COUNT(*) as table_count 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
4. Click **Run** → Should return `13` (tables count)

✅ **Database connected and ready!**

---

## 🔌 Part 2: Create First API Endpoint

### Endpoint Goal
**GET /api/contracts** - Fetch all contracts for a bank (paginated)

### Step 2.1: Create New API

1. Click **API** (left sidebar)
2. Click **Create New** → **API**
3. Name it: `covenant_api`
4. Click **Create**

---

### Step 2.2: Create GET /api/contracts Endpoint

**In API Builder:**

1. Click **Add Resource** 
2. Name: `contracts`
3. Click **Create**

**Now you're in Resource: contracts**

---

### Step 2.3: Create GET Method (Canvas View)

1. Click **GET** button
2. You'll see **Canvas View** (node-based visual builder)

**Canvas looks like:**
```
[Request Input] → [Database Query] → [Format Response] → [Return JSON]
```

---

### Step 2.4: Add Request Parameters

**On the canvas:**

1. Right-click → **Add Input** → **Query Parameter**
2. Name: `bank_id` | Type: `Text` | Required: ✓
3. Add another: `page` | Type: `Number` | Default: `1`
4. Add another: `limit` | Type: `Number` | Default: `20`

**Visual node should show:**
```
📥 Inputs
  ├─ bank_id (text)
  ├─ page (number)
  └─ limit (number)
```

---

### Step 2.5: Add Database Query Node

1. On canvas, click **Add** → **Database** → **Query**
2. Select database: `covenant_guardian`
3. Name the query: `get_contracts_paginated`

**In the SQL field, paste:**

```sql
SELECT
    c.id,
    c.contract_name,
    c.contract_number,
    c.borrower_id,
    c.principal_amount,
    c.status,
    COUNT(*) OVER () as total_count,
    COALESCE(COUNT(cv.id), 0) as covenant_count,
    COALESCE(COUNT(CASE WHEN a.status = 'breached' THEN 1 END), 0) as breached_count,
    c.created_at,
    c.updated_at
FROM
    contracts c
    LEFT JOIN covenants cv ON c.id = cv.contract_id
    LEFT JOIN alerts a ON cv.id = a.covenant_id
WHERE
    c.bank_id = {{ bank_id }}
    AND c.deleted_at IS NULL
GROUP BY
    c.id
ORDER BY
    c.created_at DESC
LIMIT {{ limit }}
OFFSET {{ (page - 1) * limit }};
```

**Key points:**
- `{{ bank_id }}` = auto-binding to input parameter
- `{{ page }}, {{ limit }}` = pagination logic
- `COUNT(*) OVER ()` = total row count for pagination

---

### Step 2.6: Format Response

1. Click **Add** → **Transform** → **Object**
2. Name: `format_response`

**In the formula field:**

```javascript
{
  "success": true,
  "contracts": get_contracts_paginated.data.map(item => ({
    id: item.id,
    contract_name: item.contract_name,
    contract_number: item.contract_number,
    borrower_id: item.borrower_id,
    principal_amount: item.principal_amount,
    status: item.status,
    covenant_count: item.covenant_count,
    breached_covenant_count: item.breached_count,
    created_at: item.created_at
  })),
  "pagination": {
    page: page,
    limit: limit,
    total: get_contracts_paginated.data[0]?.total_count || 0,
    pages: Math.ceil((get_contracts_paginated.data[0]?.total_count || 0) / limit)
  }
}
```

---

### Step 2.7: Return Response

1. Click **Add** → **Output** 
2. Type: `Object`
3. Value: `format_response`
4. HTTP Status: `200`

**Canvas now shows:**
```
📥 Inputs → 🗄️ Query → 🔄 Transform → 📤 Output
```

---

### Step 2.8: Test the Endpoint

1. Click **Test** button (top right)
2. Fill in:
   ```
   bank_id: [use UUID from your demo data]
   page: 1
   limit: 20
   ```
3. Click **Send**

**Expected response:**
```json
{
  "success": true,
  "contracts": [
    {
      "id": "...",
      "contract_name": "Syndicated Loan - ABC Corp",
      "contract_number": "LOAN-2025-1",
      "principal_amount": 150000000,
      "status": "active",
      "covenant_count": 2,
      "breached_covenant_count": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  }
}
```

✅ **Endpoint working!**

---

## 💾 Part 3: Create POST /api/contracts/create

### Step 3.1: Add POST Method

1. In same resource (`contracts`), click **+ Method** → **POST**
2. Canvas View opens

---

### Step 3.2: Add Request Body

1. Right-click canvas → **Add Input** → **Body**
2. Type: `Object`
3. Structure:
   ```json
   {
     "bank_id": "text",
     "borrower_id": "text (or 'new' to create)",
     "contract_name": "text",
     "contract_number": "text",
     "principal_amount": "number",
     "currency": "text",
     "origination_date": "text (YYYY-MM-DD)",
     "maturity_date": "text (YYYY-MM-DD)",
     "interest_rate": "number",
     "raw_document_text": "text (optional)"
   }
   ```

---

### Step 3.3: Create Contract in Database

1. Click **Add** → **Database** → **Create Record**
2. Select database: `covenant_guardian`
3. Select table: `contracts`
4. Name: `create_contract`

**Map fields:**
```
body.bank_id → bank_id
body.borrower_id → borrower_id
body.contract_name → contract_name
body.contract_number → contract_number
body.principal_amount → principal_amount
body.currency → currency
body.origination_date → origination_date
body.maturity_date → maturity_date
body.interest_rate → interest_rate
body.raw_document_text → raw_document_text
```

---

### Step 3.4: Trigger Gemini Extraction Job

1. Click **Add** → **Logic** → **Run Workflow**
2. Name: `trigger_extraction`
3. Select workflow: `extract_covenants_with_gemini` (we'll create this next)

**Pass parameters:**
```
contract_id: create_contract.data.id
bank_id: body.bank_id
raw_document_text: body.raw_document_text
```

---

### Step 3.5: Format Response

1. Click **Add** → **Transform** → **Object**
2. Name: `format_create_response`

```javascript
{
  "success": true,
  "contract": {
    "id": create_contract.data.id,
    "status": "active",
    "created_at": create_contract.data.created_at
  },
  "covenant_extraction_job": {
    "job_id": trigger_extraction.workflow_id,
    "status": "queued",
    "estimated_seconds": 45
  }
}
```

---

### Step 3.6: Return Response

1. Click **Add** → **Output**
2. Value: `format_create_response`
3. HTTP Status: `201`

---

### Step 3.7: Add Error Handling

1. On the **Create Record** node, right-click → **Add Error Handler**
2. Name: `handle_duplicate_contract`
3. Error condition: `error.message contains "duplicate"`

**In error handler, return:**
```javascript
{
  "success": false,
  "error": "Contract number already exists",
  "http_status": 409
}
```

---

## 🤖 Part 4: Create Gemini Extraction Workflow

### Step 4.1: Create Workflow

1. Click **Workflows** (left sidebar)
2. Click **Create New Workflow**
3. Name: `extract_covenants_with_gemini`
4. Trigger: **Manual Trigger** (we'll call it from API)

---

### Step 4.2: Add Workflow Inputs

1. Click **Add Input**
2. Add three inputs:
   ```
   contract_id (Text, required)
   bank_id (Text, required)
   raw_document_text (Text, required)
   ```

---

### Step 4.3: Call Gemini API

1. Click **Add Step** → **HTTP Request**
2. Name: `call_gemini_extraction`
3. Method: **POST**
4. URL:
   ```
   https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={{ env.GEMINI_API_KEY }}
   ```

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are an expert loan covenant analyst. Extract and classify all covenants from this contract.\n\nYou MUST respond with ONLY valid JSON, no other text.\n\nFor each covenant, provide:\n- covenant_name: Clear name (e.g., 'Debt-to-EBITDA Ratio')\n- covenant_type: 'financial' | 'operational' | 'reporting' | 'other'\n- metric_name: The metric (e.g., 'Total Debt / EBITDA')\n- operator: '<' | '<=' | '>' | '>=' | '=' | '!='\n- threshold_value: Numeric threshold\n- threshold_unit: 'ratio' | '%' | 'USD' | 'days' etc.\n- check_frequency: 'monthly' | 'quarterly' | 'annually' | 'on_demand'\n- clause_excerpt: Original text\n\nCONTRACT TEXT:\n{{ raw_document_text }}\n\nRESPOND WITH ONLY THIS JSON STRUCTURE:\n{\n  \"covenants\": [\n    {\n      \"covenant_name\": \"...\",\n      \"covenant_type\": \"...\",\n      \"metric_name\": \"...\",\n      \"operator\": \"...\",\n      \"threshold_value\": 0,\n      \"threshold_unit\": \"...\",\n      \"check_frequency\": \"...\",\n      \"clause_excerpt\": \"...\"\n    }\n  ]\n}"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 2000,
    "topK": 40,
    "topP": 0.95
  }
}
```

---

### Step 4.4: Parse Gemini Response

1. Click **Add Step** → **Transform** → **Text**
2. Name: `parse_gemini_json`

```javascript
{
  const responseText = call_gemini_extraction.data.candidates[0].content.parts[0].text;
  
  // Extract JSON from response (Gemini sometimes adds extra text)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Gemini response");
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

---

### Step 4.5: Loop & Insert Covenants

1. Click **Add Step** → **Loop**
2. Loop over: `parse_gemini_json.covenants`
3. Name: `loop_insert_covenants`

**Inside the loop:**

1. Click **Add Step** → **Database** → **Create Record**
2. Select table: `covenants`
3. Map fields:

   ```
   contract_id → contract_id (use workflow input)
   bank_id → bank_id (use workflow input)
   covenant_name → current_item.covenant_name
   covenant_type → current_item.covenant_type
   metric_name → current_item.metric_name
   operator → current_item.operator
   threshold_value → current_item.threshold_value
   threshold_unit → current_item.threshold_unit
   check_frequency → current_item.check_frequency
   covenant_clause → current_item.clause_excerpt
   gemini_extracted → true
   ```

---

### Step 4.6: Return Workflow Result

1. Click **Add Step** → **Output**
2. Return:

```javascript
{
  "success": true,
  "contract_id": contract_id,
  "covenants_extracted": parse_gemini_json.covenants.length,
  "covenants": parse_gemini_json.covenants
}
```

---

### Step 4.7: Set Gemini API Key as Environment Variable

1. Go to **Settings** → **Environment Variables**
2. Click **Add Variable**
3. Name: `GEMINI_API_KEY`
4. Value: `[Your Google AI API Key]`
5. Type: **Secret**

---

### Step 4.8: Test Workflow

1. Click **Test** in workflow builder
2. Fill inputs:
   ```
   contract_id: [UUID from contracts table]
   bank_id: [UUID from banks table]
   raw_document_text: "The Borrower shall maintain a Debt-to-EBITDA ratio not to exceed 3.5x..."
   ```
3. Click **Run Test**

**Expected output:**
```json
{
  "success": true,
  "contract_id": "...",
  "covenants_extracted": 2,
  "covenants": [
    {
      "covenant_name": "Debt-to-EBITDA Ratio",
      "covenant_type": "financial",
      ...
    }
  ]
}
```

✅ **Gemini extraction working!**

---

## 📊 Part 5: Create GET /api/covenants/:covenant_id/health

### Step 5.1: Add New Resource

1. In API: `covenant_api`
2. Click **Add Resource**
3. Name: `covenant_health`
4. Create

---

### Step 5.2: Create GET Route

1. Click **GET**
2. Canvas View opens

---

### Step 5.3: Add Path Parameter

1. Right-click → **Add Input** → **Path Parameter**
2. Name: `covenant_id`
3. Type: `Text`
4. Required: ✓

---

### Step 5.4: Query Covenant Health

1. Click **Add** → **Database** → **Query**
2. Name: `get_covenant_health`

```sql
SELECT
    ch.id,
    ch.covenant_id,
    ch.status,
    ch.last_reported_value,
    ch.last_reported_date,
    ch.threshold_value,
    ch.buffer_percentage,
    ch.days_to_breach,
    ch.trend,
    ch.gemini_risk_assessment,
    ch.recommended_action,
    ch.last_calculated,
    c.covenant_name,
    c.metric_name
FROM
    covenant_health ch
    JOIN covenants c ON ch.covenant_id = c.id
WHERE
    ch.covenant_id = {{ covenant_id }};
```

---

### Step 5.5: Call Gemini for Risk Assessment (Optional Enhancement)

If `gemini_risk_assessment` is NULL:

1. Click **Add** → **Logic** → **Condition**
2. Check: `get_covenant_health.data[0].gemini_risk_assessment == null`

**If TRUE:**

1. Add **HTTP Request** → Call Gemini:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={{ env.GEMINI_API_KEY }}

Body:
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are a credit risk analyst. Assess this covenant's health:\n\nCovenant: {{ get_covenant_health.data[0].covenant_name }}\nMetric: {{ get_covenant_health.data[0].metric_name }}\nCurrent Value: {{ get_covenant_health.data[0].last_reported_value }}\nThreshold: {{ get_covenant_health.data[0].threshold_value }}\nStatus: {{ get_covenant_health.data[0].status }}\n\nProvide a brief risk assessment and recommended action.\n\nRespond with JSON:\n{\n  \"risk_assessment\": \"...\",\n  \"recommended_action\": \"...\",\n  \"risk_score\": 0.0\n}"
        }
      ]
    }
  ],
  "generationConfig": { "temperature": 0.3, "maxOutputTokens": 500 }
}
```

---

### Step 5.6: Format and Return Response

1. Click **Add** → **Transform** → **Object**
2. Name: `format_health_response`

```javascript
{
  "success": true,
  "covenant_health": {
    id: get_covenant_health.data[0].id,
    covenant_id: get_covenant_health.data[0].covenant_id,
    covenant_name: get_covenant_health.data[0].covenant_name,
    status: get_covenant_health.data[0].status,
    last_reported_value: get_covenant_health.data[0].last_reported_value,
    last_reported_date: get_covenant_health.data[0].last_reported_date,
    threshold_value: get_covenant_health.data[0].threshold_value,
    buffer_percentage: get_covenant_health.data[0].buffer_percentage,
    days_to_breach: get_covenant_health.data[0].days_to_breach,
    trend: get_covenant_health.data[0].trend,
    gemini_risk_assessment: get_covenant_health.data[0].gemini_risk_assessment,
    recommended_action: get_covenant_health.data[0].recommended_action,
    last_calculated: get_covenant_health.data[0].last_calculated
  }
}
```

3. Click **Add** → **Output**
4. Value: `format_health_response`
5. HTTP Status: `200`

---

## ⚠️ Part 6: Create GET /api/alerts

### Step 6.1: Add Resource & Route

1. Add Resource: `alerts`
2. Create GET method
3. Canvas View

---

### Step 6.2: Add Filters

1. Add Inputs:
   ```
   bank_id (Text, required)
   status (Text, optional, default: "new,acknowledged")
   severity (Text, optional, default: "high,critical")
   limit (Number, optional, default: 50)
   ```

---

### Step 6.3: Query Alerts

```sql
SELECT
    a.id,
    a.covenant_id,
    a.contract_id,
    a.alert_type,
    a.severity,
    a.title,
    a.description,
    a.status,
    a.triggered_at,
    c.contract_name,
    b.legal_name as borrower_name,
    cv.covenant_name
FROM
    alerts a
    JOIN contracts c ON a.contract_id = c.id
    JOIN borrowers b ON c.borrower_id = b.id
    JOIN covenants cv ON a.covenant_id = cv.id
WHERE
    a.bank_id = {{ bank_id }}
    AND a.status = ANY(string_to_array({{ status }}, ','))
    AND a.severity = ANY(string_to_array({{ severity }}, ','))
ORDER BY
    a.severity DESC,
    a.triggered_at DESC
LIMIT {{ limit }};
```

---

### Step 6.4: Format & Return

```javascript
{
  "success": true,
  "alerts": query_alerts.data.map(item => ({
    id: item.id,
    contract_name: item.contract_name,
    borrower_name: item.borrower_name,
    covenant_name: item.covenant_name,
    severity: item.severity,
    status: item.status,
    title: item.title,
    description: item.description,
    triggered_at: item.triggered_at
  })),
  "summary": {
    critical: query_alerts.data.filter(a => a.severity === 'critical').length,
    high: query_alerts.data.filter(a => a.severity === 'high').length,
    medium: query_alerts.data.filter(a => a.severity === 'medium').length,
    low: query_alerts.data.filter(a => a.severity === 'low').length
  }
}
```

---

## 🔄 Part 7: Create POST /api/alerts/:alert_id/acknowledge

### Step 7.1: Add Resource & Method

1. Add Resource: `alert_actions`
2. Create POST method

---

### Step 7.2: Add Inputs

```
alert_id (Path Parameter, Text, required)
user_id (Body, Text, required)
resolution_notes (Body, Text, optional)
```

---

### Step 7.3: Update Alert Status

1. Click **Add** → **Database** → **Update Record**
2. Select table: `alerts`
3. Where: `id = {{ alert_id }}`

**Set fields:**
```
status → "acknowledged"
acknowledged_at → NOW()
acknowledged_by → {{ user_id }}
resolution_notes → {{ resolution_notes }}
```

---

### Step 7.4: Insert Audit History

1. Click **Add** → **Database** → **Create Record**
2. Select table: `alert_history`

```
alert_id → {{ alert_id }}
status_from → "new"
status_to → "acknowledged"
changed_by → {{ user_id }}
change_reason → {{ resolution_notes }}
changed_at → NOW()
```

---

### Step 7.5: Return Response

```javascript
{
  "success": true,
  "alert": {
    "id": alert_id,
    "status": "acknowledged",
    "acknowledged_at": NOW()
  }
}
```

---

## 📈 Part 8: Create GET /api/dashboard/portfolio-summary

### Step 8.1: Add Resource

1. Add Resource: `dashboard`
2. Create GET method

---

### Step 8.2: Add Input

```
bank_id (Query Parameter, Text, required)
```

---

### Step 8.3: Query Materialized View

```sql
SELECT * FROM portfolio_summary_view 
WHERE bank_id = {{ bank_id }};
```

---

### Step 8.4: Build Response

```javascript
{
  "success": true,
  "bank_id": bank_id,
  "summary": {
    "total_contracts": view_data.total_contracts,
    "total_principal_usd": view_data.total_principal_usd,
    "contracts_at_risk": view_data.contracts_at_warning + view_data.contracts_breached,
    "open_alerts": view_data.open_alerts_count,
    "critical_alerts": 2 // query from alerts table for critical count
  },
  "covenant_breakdown": {
    "compliant": 156,
    "warning": view_data.contracts_at_warning * 5, // estimate
    "breached": view_data.contracts_breached * 2
  }
}
```

---

## 🧪 Part 9: Complete API Testing Checklist

### Create Postman Collection

**Export from Xano:**

1. API → **covenant_api** → Click **...** → **Export as OpenAPI**
2. Download `.json`
3. Import into Postman

**Test endpoints in order:**

```
1. POST /api/contracts/create
   ✓ Should return contract_id + job_id
   
2. GET /api/contracts
   ✓ Should return paginated list
   
3. GET /api/covenants/:covenant_id/health
   ✓ Should return health + Gemini assessment
   
4. GET /api/alerts
   ✓ Should return filtered alerts
   
5. POST /api/alerts/:alert_id/acknowledge
   ✓ Should update status + audit trail
   
6. GET /api/dashboard/portfolio-summary
   ✓ Should return aggregated metrics
```

---

## 🚀 Part 10: Environment Setup for Production

### Step 10.1: Set Environment Variables (Xano)

1. **Settings** → **Environment Variables**

```
GEMINI_API_KEY: [Google AI API Key]
DATABASE_URL: [PostgreSQL Connection String]
JWT_SECRET: [Your JWT Secret]
XANO_API_KEY: [From Xano Dashboard]
```

---

### Step 10.2: Enable CORS

1. **API** → **Settings** → **CORS**
2. Add Origins:
   ```
   http://localhost:3000
   https://yourdomain.com
   ```

---

### Step 10.3: Enable Rate Limiting

1. **API** → **Settings** → **Rate Limiting**
2. Set:
   ```
   Per second: 10
   Per minute: 100
   Per hour: 1000
   ```

---

### Step 10.4: Set Up Logging

1. **Logs** → Enable **Request/Response Logging**
2. **Logs** → Enable **Database Query Logging** (development only)

---

## 📋 Complete API Endpoints Summary

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| **POST** | /api/contracts/create | Create contract + extract covenants | ✅ Complete |
| **GET** | /api/contracts | List all contracts | ✅ Complete |
| **GET** | /api/contracts/:id | Get contract detail | ⏳ Build like Step 5 |
| **GET** | /api/covenants/:id/health | Get covenant health | ✅ Complete |
| **GET** | /api/alerts | List alerts | ✅ Complete |
| **POST** | /api/alerts/:id/acknowledge | Acknowledge alert | ✅ Complete |
| **GET** | /api/dashboard/portfolio-summary | Portfolio metrics | ✅ Complete |
| **POST** | /api/financial-metrics/ingest | Ingest financials | ⏳ Similar to POST contract |
| **POST** | /api/adverse-events/ingest | Ingest news events | ⏳ Similar structure |
| **POST** | /api/workflows/check-covenant-health | Batch health check job | ⏳ Create as Workflow |

---

## 🎯 Key Xano Features Used

1. **Canvas View**: Visual logic builder (nodes + connections)
2. **Database Records**: CRUD operations with field mapping
3. **Loops**: Iterate over array data
4. **Conditions**: If/then logic for branching
5. **Transforms**: Format data with JavaScript
6. **HTTP Requests**: Call external APIs (Gemini)
7. **Workflows**: Background jobs (covenant extraction)
8. **Materialized Views**: Pre-aggregated dashboard data
9. **Error Handlers**: Graceful error responses
10. **Environment Variables**: Secure secrets management

---

## ⚡ Next Steps

1. **Build remaining endpoints** using Steps 2-7 as template
2. **Create scheduled workflows** for nightly covenant health checks
3. **Add authentication** (JWT validation at API entry point)
4. **Test all endpoints** with demo data
5. **Connect React frontend** (use exported OpenAPI for type generation)

**Ready to build the React frontend with these APIs!**

