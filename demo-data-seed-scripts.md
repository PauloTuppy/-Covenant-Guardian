# Demo Data & Seed Scripts
## Realistic Contract Scenarios & PostgreSQL Populators

---

## 📊 Part 16: Demo Data Schema

### Sample Banks

```sql
INSERT INTO banks (id, name, country, subscription_tier, created_at) VALUES
  ('bank-001', 'First Capital Bank', 'USA', 'professional', NOW()),
  ('bank-002', 'Global Finance Ltd', 'UK', 'enterprise', NOW()),
  ('bank-003', 'Asia Pacific Banking Corp', 'Singapore', 'professional', NOW());
```

---

## 👥 Part 17: Demo Borrowers

### Step 17.1: Tech Sector Borrowers

```sql
INSERT INTO borrowers (
  id, bank_id, legal_name, ticker_symbol, industry, country, 
  credit_rating, website, created_at
) VALUES
  (
    'borrower-001',
    'bank-001',
    'TechVision Solutions Inc',
    'TVSI',
    'Technology',
    'USA',
    'A-',
    'https://techvisionsolutions.com',
    NOW()
  ),
  (
    'borrower-002',
    'bank-001',
    'CloudScale AI Corp',
    'CLAI',
    'Software',
    'USA',
    'BBB+',
    'https://cloudscaleai.io',
    NOW()
  ),
  (
    'borrower-003',
    'bank-002',
    'DataFlow Analytics Ltd',
    'DFA',
    'Technology',
    'UK',
    'A',
    'https://dataflowanalytics.co.uk',
    NOW()
  );
```

### Step 17.2: Healthcare Sector Borrowers

```sql
INSERT INTO borrowers (
  id, bank_id, legal_name, ticker_symbol, industry, country,
  credit_rating, website, created_at
) VALUES
  (
    'borrower-004',
    'bank-001',
    'MediCare Innovations Inc',
    'MDCI',
    'Healthcare',
    'USA',
    'AA-',
    'https://medicareinnovations.com',
    NOW()
  ),
  (
    'borrower-005',
    'bank-002',
    'BioPharma Solutions Group',
    'BPSG',
    'Pharmaceuticals',
    'UK',
    'A+',
    'https://biopharmasolutions.com',
    NOW()
  ),
  (
    'borrower-006',
    'bank-003',
    'HealthTech Asia Pacific',
    'HTAP',
    'Healthcare',
    'Singapore',
    'A-',
    'https://healthtechasiatech.sg',
    NOW()
  );
```

### Step 17.3: Industrial Sector Borrowers

```sql
INSERT INTO borrowers (
  id, bank_id, legal_name, ticker_symbol, industry, country,
  credit_rating, website, created_at
) VALUES
  (
    'borrower-007',
    'bank-001',
    'Industrial Solutions Corp',
    'ISC',
    'Manufacturing',
    'USA',
    'BBB',
    'https://industrialsolutions.com',
    NOW()
  ),
  (
    'borrower-008',
    'bank-002',
    'Global Manufacturing Ltd',
    'GML',
    'Manufacturing',
    'UK',
    'BBB+',
    'https://globalmanufacturing.co.uk',
    NOW()
  ),
  (
    'borrower-009',
    'bank-003',
    'Infrastructure Dev Inc',
    'IDI',
    'Infrastructure',
    'Singapore',
    'A',
    'https://infrastructuredev.sg',
    NOW()
  ),
  (
    'borrower-010',
    'bank-001',
    'Energy Resources Global',
    'ERG',
    'Energy',
    'USA',
    'BBB-',
    'https://energyresourcesglobal.com',
    NOW()
  );
```

---

## 📋 Part 18: Demo Contracts (Realistic Scenarios)

### Step 18.1: Tech Sector - Compliant Contract

```sql
INSERT INTO contracts (
  id, bank_id, borrower_id, contract_name, contract_number,
  principal_amount, currency, origination_date, maturity_date,
  interest_rate, status, created_at, updated_at
) VALUES
  (
    'contract-001',
    'bank-001',
    'borrower-001',
    'Syndicated Facility - TechVision Solutions',
    'LOAN-2024-0001',
    250000000,
    'USD',
    '2024-01-15',
    '2027-01-15',
    4.75,
    'active',
    NOW(),
    NOW()
  );
```

### Step 18.2: Tech Sector - Warning Contract

```sql
INSERT INTO contracts (
  id, bank_id, borrower_id, contract_name, contract_number,
  principal_amount, currency, origination_date, maturity_date,
  interest_rate, status, created_at, updated_at
) VALUES
  (
    'contract-002',
    'bank-001',
    'borrower-002',
    'Term Loan B - CloudScale AI',
    'LOAN-2023-0045',
    175000000,
    'USD',
    '2023-06-20',
    '2028-06-20',
    5.25,
    'watch',
    NOW(),
    NOW()
  );
```

### Step 18.3: Healthcare - Compliant Contract

```sql
INSERT INTO contracts (
  id, bank_id, borrower_id, contract_name, contract_number,
  principal_amount, currency, origination_date, maturity_date,
  interest_rate, status, created_at, updated_at
) VALUES
  (
    'contract-003',
    'bank-001',
    'borrower-004',
    'Senior Secured Facility - MediCare Innovations',
    'LOAN-2024-0012',
    300000000,
    'USD',
    '2024-03-01',
    '2027-03-01',
    4.50,
    'active',
    NOW(),
    NOW()
  );
```

### Step 18.4: Healthcare - Breached Contract

```sql
INSERT INTO contracts (
  id, bank_id, borrower_id, contract_name, contract_number,
  principal_amount, currency, origination_date, maturity_date,
  interest_rate, status, created_at, updated_at
) VALUES
  (
    'contract-004',
    'bank-002',
    'borrower-005',
    'Bridge Facility - BioPharma Solutions',
    'LOAN-2024-0008',
    125000000,
    'USD',
    '2024-02-01',
    '2025-02-01',
    6.00,
    'default',
    NOW(),
    NOW()
  );
```

### Step 18.5: Industrial & Infrastructure Contracts

```sql
INSERT INTO contracts (
  id, bank_id, borrower_id, contract_name, contract_number,
  principal_amount, currency, origination_date, maturity_date,
  interest_rate, status, created_at, updated_at
) VALUES
  (
    'contract-005',
    'bank-001',
    'borrower-007',
    'Asset-Based Lending - Industrial Solutions',
    'LOAN-2023-0067',
    85000000,
    'USD',
    '2023-08-10',
    '2026-08-10',
    5.50,
    'active',
    NOW(),
    NOW()
  ),
  (
    'contract-006',
    'bank-002',
    'borrower-008',
    'Revolving Credit Facility - Global Manufacturing',
    'LOAN-2024-0003',
    200000000,
    'GBP',
    '2024-01-20',
    '2029-01-20',
    5.00,
    'active',
    NOW(),
    NOW()
  ),
  (
    'contract-007',
    'bank-003',
    'borrower-009',
    'Infrastructure Project Financing - IDI',
    'LOAN-2023-0089',
    450000000,
    'SGD',
    '2023-11-01',
    '2033-11-01',
    4.25,
    'active',
    NOW(),
    NOW()
  ),
  (
    'contract-008',
    'bank-001',
    'borrower-010',
    'Acquisition Facility - Energy Resources Global',
    'LOAN-2024-0015',
    320000000,
    'USD',
    '2024-04-15',
    '2026-04-15',
    5.75,
    'watch',
    NOW(),
    NOW()
  ),
  (
    'contract-009',
    'bank-002',
    'borrower-003',
    'Working Capital Line - DataFlow Analytics',
    'LOAN-2024-0021',
    75000000,
    'GBP',
    '2024-02-15',
    '2025-02-15',
    4.75,
    'active',
    NOW(),
    NOW()
  ),
  (
    'contract-010',
    'bank-003',
    'borrower-006',
    'Expansion Facility - HealthTech Asia Pacific',
    'LOAN-2023-0112',
    150000000,
    'SGD',
    '2023-09-01',
    '2028-09-01',
    4.50,
    'active',
    NOW(),
    NOW()
  );
```

---

## 🔗 Part 19: Demo Covenants

### Step 19.1: Tech Sector - Compliant Covenants

```sql
INSERT INTO covenants (
  id, contract_id, bank_id, covenant_name, covenant_type, metric_name,
  operator, threshold_value, threshold_unit, check_frequency,
  covenant_clause, gemini_extracted, created_at
) VALUES
  (
    'covenant-001',
    'contract-001',
    'bank-001',
    'Maximum Leverage Ratio',
    'financial',
    'Total Debt / EBITDA',
    '<',
    3.5,
    'ratio',
    'quarterly',
    'Borrower shall not permit Total Debt to exceed 3.5x EBITDA as measured at each fiscal quarter end.',
    true,
    NOW()
  ),
  (
    'covenant-002',
    'contract-001',
    'bank-001',
    'Minimum Interest Coverage Ratio',
    'financial',
    'EBITDA / Interest Expense',
    '>',
    3.0,
    'ratio',
    'quarterly',
    'Borrower shall maintain an Interest Coverage Ratio of not less than 3.0x.',
    true,
    NOW()
  ),
  (
    'covenant-003',
    'contract-001',
    'bank-001',
    'Minimum Liquidity',
    'financial',
    'Cash + Available Credit',
    '>',
    25000000,
    'USD',
    'monthly',
    'Borrower shall maintain minimum liquidity of $25 million at all times.',
    true,
    NOW()
  ),
  (
    'covenant-004',
    'contract-001',
    'bank-001',
    'Quarterly Financial Reporting',
    'reporting',
    'Days to Filing',
    '<=',
    45,
    'days',
    'quarterly',
    'Borrower shall deliver audited/reviewed financial statements within 45 days of quarter end.',
    true,
    NOW()
  ),
  (
    'covenant-005',
    'contract-001',
    'bank-001',
    'Dividend Restriction',
    'operational',
    'Cumulative FCF to Dividends Ratio',
    '>',
    1.5,
    'ratio',
    'annually',
    'Dividends may not exceed 50% of cumulative free cash flow if leverage exceeds 2.5x.',
    true,
    NOW()
  );
```

### Step 19.2: Tech Sector - Warning Covenants

```sql
INSERT INTO covenants (
  id, contract_id, bank_id, covenant_name, covenant_type, metric_name,
  operator, threshold_value, threshold_unit, check_frequency,
  covenant_clause, gemini_extracted, created_at
) VALUES
  (
    'covenant-006',
    'contract-002',
    'bank-001',
    'Maximum Leverage Ratio',
    'financial',
    'Total Debt / EBITDA',
    '<',
    4.0,
    'ratio',
    'quarterly',
    'Borrower shall not permit Total Debt to exceed 4.0x EBITDA.',
    true,
    NOW()
  ),
  (
    'covenant-007',
    'contract-002',
    'bank-001',
    'Minimum Interest Coverage',
    'financial',
    'EBITDA / Interest Expense',
    '>',
    2.5,
    'ratio',
    'quarterly',
    'Borrower shall maintain Interest Coverage of at least 2.5x.',
    true,
    NOW()
  ),
  (
    'covenant-008',
    'contract-002',
    'bank-001',
    'Debt Service Coverage Ratio',
    'financial',
    'Cash Flow / Debt Service',
    '>',
    1.25,
    'ratio',
    'quarterly',
    'DSCR shall not fall below 1.25x.',
    true,
    NOW()
  ),
  (
    'covenant-009',
    'contract-002',
    'bank-001',
    'Capital Expenditure Limit',
    'operational',
    'Annual CapEx Budget',
    '<=',
    20000000,
    'USD',
    'annually',
    'Annual CapEx shall not exceed $20M without lender consent.',
    true,
    NOW()
  );
```

### Step 19.3: Healthcare - Compliant Covenants

```sql
INSERT INTO covenants (
  id, contract_id, bank_id, covenant_name, covenant_type, metric_name,
  operator, threshold_value, threshold_unit, check_frequency,
  covenant_clause, gemini_extracted, created_at
) VALUES
  (
    'covenant-010',
    'contract-003',
    'bank-001',
    'Maximum Debt to Equity',
    'financial',
    'Total Debt / Shareholders Equity',
    '<',
    2.0,
    'ratio',
    'quarterly',
    'Debt to Equity shall not exceed 2.0x.',
    true,
    NOW()
  ),
  (
    'covenant-011',
    'contract-003',
    'bank-001',
    'Current Ratio Covenant',
    'financial',
    'Current Assets / Current Liabilities',
    '>',
    1.2,
    'ratio',
    'quarterly',
    'Minimum Current Ratio of 1.2x shall be maintained.',
    true,
    NOW()
  ),
  (
    'covenant-012',
    'contract-003',
    'bank-001',
    'Revenue Maintenance',
    'operational',
    'Annual Revenue',
    '>',
    500000000,
    'USD',
    'annually',
    'Annual revenues shall not fall below $500M.',
    true,
    NOW()
  );
```

### Step 19.4: Healthcare - Breached Covenants

```sql
INSERT INTO covenants (
  id, contract_id, bank_id, covenant_name, covenant_type, metric_name,
  operator, threshold_value, threshold_unit, check_frequency,
  covenant_clause, gemini_extracted, created_at
) VALUES
  (
    'covenant-013',
    'contract-004',
    'bank-002',
    'Maximum Leverage Ratio',
    'financial',
    'Total Debt / EBITDA',
    '<',
    3.0,
    'ratio',
    'quarterly',
    'Total Debt shall not exceed 3.0x EBITDA.',
    true,
    NOW()
  ),
  (
    'covenant-014',
    'contract-004',
    'bank-002',
    'Minimum EBITDA',
    'financial',
    'Annual EBITDA',
    '>',
    75000000,
    'USD',
    'quarterly',
    'Minimum quarterly EBITDA of $18.75M required.',
    true,
    NOW()
  ),
  (
    'covenant-015',
    'contract-004',
    'bank-002',
    'Debt Service Coverage',
    'financial',
    'EBITDA / Debt Service',
    '>',
    1.5,
    'ratio',
    'quarterly',
    'DSCR must remain above 1.5x.',
    true,
    NOW()
  );
```

### Step 19.5: Industrial Covenants

```sql
INSERT INTO covenants (
  id, contract_id, bank_id, covenant_name, covenant_type, metric_name,
  operator, threshold_value, threshold_unit, check_frequency,
  covenant_clause, gemini_extracted, created_at
) VALUES
  (
    'covenant-016',
    'contract-005',
    'bank-001',
    'Asset Coverage Ratio',
    'financial',
    'Collateral Value / Loan Amount',
    '>',
    1.25,
    'ratio',
    'semi-annually',
    'Collateral value shall maintain minimum 1.25x coverage.',
    true,
    NOW()
  ),
  (
    'covenant-017',
    'contract-006',
    'bank-002',
    'Maximum Leverage',
    'financial',
    'Net Debt / EBITDA',
    '<',
    3.75,
    'ratio',
    'quarterly',
    'Net leverage shall not exceed 3.75x.',
    true,
    NOW()
  ),
  (
    'covenant-018',
    'contract-007',
    'bank-003',
    'Minimum Debt Service Reserve',
    'financial',
    'Reserve Fund Balance',
    '>',
    50000000,
    'SGD',
    'monthly',
    'Maintain minimum debt service reserve of SGD 50M.',
    true,
    NOW()
  ),
  (
    'covenant-019',
    'contract-008',
    'bank-001',
    'Acquisition Leverage',
    'financial',
    'Pro-forma Debt / EBITDA',
    '<',
    4.5,
    'ratio',
    'on_demand',
    'Pro-forma leverage post-acquisition not to exceed 4.5x.',
    true,
    NOW()
  ),
  (
    'covenant-020',
    'contract-009',
    'bank-002',
    'Working Capital Covenant',
    'financial',
    'Working Capital / Revenue',
    '>=',
    0.15,
    'ratio',
    'quarterly',
    'Working capital shall be at least 15% of quarterly revenue.',
    true,
    NOW()
  ),
  (
    'covenant-021',
    'contract-010',
    'bank-003',
    'Expansion Capex Limit',
    'operational',
    'Annual CapEx Budget',
    '<=',
    50000000,
    'SGD',
    'annually',
    'Expansion CapEx capped at SGD 50M per annum.',
    true,
    NOW()
  );
```

---

## 📈 Part 20: Demo Covenant Health Data

### Step 20.1: Compliant Health Records

```sql
INSERT INTO covenant_health (
  id, covenant_id, contract_id, bank_id, status, last_reported_value,
  last_reported_date, threshold_value, buffer_percentage, days_to_breach,
  trend, gemini_risk_assessment, recommended_action, last_calculated
) VALUES
  (
    'health-001',
    'covenant-001',
    'contract-001',
    'bank-001',
    'compliant',
    2.85,
    NOW() - INTERVAL '5 days',
    3.5,
    23.5,
    180,
    'stable',
    'Covenant is well-managed. Current leverage of 2.85x provides healthy cushion to 3.5x threshold.',
    'Continue monitoring quarterly. No action required.',
    NOW()
  ),
  (
    'health-002',
    'covenant-002',
    'contract-001',
    'bank-001',
    'compliant',
    3.85,
    NOW() - INTERVAL '5 days',
    3.0,
    28.3,
    150,
    'improving',
    'Interest coverage improving quarter-over-quarter. Strong operational performance.',
    'Monitor for any changes in interest expense or EBITDA.',
    NOW()
  ),
  (
    'health-003',
    'covenant-003',
    'contract-001',
    'bank-001',
    'compliant',
    45000000,
    NOW() - INTERVAL '7 days',
    25000000,
    80.0,
    365,
    'stable',
    'Liquidity position excellent. Cash balance 1.8x minimum required.',
    'Maintain current liquidity levels through normal operations.',
    NOW()
  );
```

### Step 20.2: Warning Health Records

```sql
INSERT INTO covenant_health (
  id, covenant_id, contract_id, bank_id, status, last_reported_value,
  last_reported_date, threshold_value, buffer_percentage, days_to_breach,
  trend, gemini_risk_assessment, recommended_action, last_calculated
) VALUES
  (
    'health-004',
    'covenant-006',
    'contract-002',
    'bank-001',
    'warning',
    3.72,
    NOW() - INTERVAL '3 days',
    4.0,
    7.0,
    45,
    'deteriorating',
    'Leverage approaching covenant ceiling. Recent M&A activity increased debt. Monitor closely.',
    'Accelerate debt paydown or increase EBITDA through operational improvements. Target leverage <3.5x.',
    NOW()
  ),
  (
    'health-005',
    'covenant-007',
    'contract-002',
    'bank-001',
    'warning',
    2.65,
    NOW() - INTERVAL '3 days',
    2.5,
    -6.0,
    21,
    'deteriorating',
    'Interest coverage below comfort level. Rising rates impacting interest expense.',
    'Refinance debt at lower rates or restructure maturity profile. Target coverage >3.0x.',
    NOW()
  ),
  (
    'health-006',
    'covenant-008',
    'contract-002',
    'bank-001',
    'warning',
    1.38,
    NOW() - INTERVAL '2 days',
    1.25,
    10.4,
    60,
    'stable',
    'DSCR approaching minimum threshold due to seasonal working capital needs.',
    'Manage working capital timing. Ensure sufficient cash flow for debt service payments.',
    NOW()
  );
```

### Step 20.3: Breached Health Records

```sql
INSERT INTO covenant_health (
  id, covenant_id, contract_id, bank_id, status, last_reported_value,
  last_reported_date, threshold_value, buffer_percentage, days_to_breach,
  trend, gemini_risk_assessment, recommended_action, last_calculated
) VALUES
  (
    'health-007',
    'covenant-013',
    'contract-004',
    'bank-002',
    'breached',
    4.25,
    NOW() - INTERVAL '1 day',
    3.0,
    -41.7,
    0,
    'deteriorating',
    'CRITICAL: Leverage covenant breached. Company in default. Immediate lender intervention required.',
    'Urgent: Negotiate forbearance agreement. Develop 90-day action plan for deleveraging.',
    NOW()
  ),
  (
    'health-008',
    'covenant-014',
    'contract-004',
    'bank-002',
    'breached',
    68000000,
    NOW() - INTERVAL '1 day',
    75000000,
    -9.3,
    0,
    'deteriorating',
    'EBITDA covenant breached. Clinical trial results missed expectations, impacting profitability.',
    'Initiate quarterly business reviews. Explore cost reduction initiatives and revenue opportunities.',
    NOW()
  ),
  (
    'health-009',
    'covenant-015',
    'contract-004',
    'bank-002',
    'breached',
    1.15,
    NOW() - INTERVAL '1 day',
    1.5,
    -23.3,
    0,
    'deteriorating',
    'DSCR breached due to combination of lower EBITDA and increased debt service.',
    'Restructure debt maturity or negotiate covenant modification. Implement cost reduction plan.',
    NOW()
  );
```

---

## ⚠️ Part 21: Demo Alerts

### Step 21.1: Critical Alerts (Breached Covenants)

```sql
INSERT INTO alerts (
  id, covenant_id, contract_id, bank_id, alert_type, severity,
  title, description, status, triggered_at, created_at
) VALUES
  (
    'alert-001',
    'covenant-013',
    'contract-004',
    'bank-002',
    'breach',
    'critical',
    'URGENT: Leverage Covenant Breached - BioPharma Solutions',
    'Total Debt/EBITDA reached 4.25x, exceeding maximum of 3.0x. Contract in technical default.',
    'new',
    NOW(),
    NOW()
  ),
  (
    'alert-002',
    'covenant-014',
    'contract-004',
    'bank-002',
    'breach',
    'critical',
    'EBITDA Covenant Breached - BioPharma Solutions',
    'Quarterly EBITDA $68M vs required $75M. Failure of Phase 3 trials contributed to shortfall.',
    'new',
    NOW(),
    NOW()
  ),
  (
    'alert-003',
    'covenant-015',
    'contract-004',
    'bank-002',
    'breach',
    'critical',
    'Debt Service Coverage Covenant Breached',
    'DSCR 1.15x below minimum 1.5x. Company may face difficulty servicing debt obligations.',
    'new',
    NOW(),
    NOW()
  );
```

### Step 21.2: High Severity Alerts (Warnings)

```sql
INSERT INTO alerts (
  id, covenant_id, contract_id, bank_id, alert_type, severity,
  title, description, status, triggered_at, created_at
) VALUES
  (
    'alert-004',
    'covenant-006',
    'contract-002',
    'bank-001',
    'warning',
    'high',
    'Leverage Approaching Covenant Ceiling - CloudScale AI',
    'Current leverage 3.72x is 93% of 4.0x limit. Recent acquisition integration ongoing.',
    'new',
    NOW(),
    NOW()
  ),
  (
    'alert-005',
    'covenant-007',
    'contract-002',
    'bank-001',
    'warning',
    'high',
    'Interest Coverage Below Comfort Level - CloudScale AI',
    'Coverage ratio 2.65x is 106% of minimum 2.5x. Rising rates are primary driver.',
    'new',
    NOW(),
    NOW()
  ),
  (
    'alert-006',
    'covenant-008',
    'contract-002',
    'bank-001',
    'warning',
    'high',
    'DSCR Approaching Minimum - CloudScale AI',
    'Debt Service Coverage at 1.38x vs 1.25x minimum. Q4 seasonality affecting cash flow.',
    'acknowledged',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );
```

### Step 21.3: Medium Severity Alerts (Reporting Due)

```sql
INSERT INTO alerts (
  id, covenant_id, contract_id, bank_id, alert_type, severity,
  title, description, status, triggered_at, created_at
) VALUES
  (
    'alert-007',
    'covenant-004',
    'contract-001',
    'bank-001',
    'reporting_due',
    'medium',
    'Q4 2024 Financial Reporting Due - TechVision Solutions',
    'Quarterly financial statements must be delivered by December 15, 2024.',
    'new',
    NOW(),
    NOW()
  ),
  (
    'alert-008',
    'covenant-011',
    'contract-003',
    'bank-001',
    'reporting_due',
    'medium',
    'Q4 2024 Financial Reporting Due - MediCare Innovations',
    'Audited year-end financials due by February 28, 2025.',
    'new',
    NOW(),
    NOW()
  );
```

---

## 📰 Part 22: Demo Adverse Events (News & Risk Events)

### Step 22.1: Positive News Events

```sql
INSERT INTO adverse_events (
  id, borrower_id, bank_id, event_type, headline, description,
  source_url, risk_score, event_date, created_at
) VALUES
  (
    'event-001',
    'borrower-001',
    'bank-001',
    'news',
    'TechVision Solutions Announces Record Q3 Revenue Growth',
    'Software company reports 45% YoY revenue growth driven by AI solutions adoption.',
    'https://techvisionsolutions.com/press/q3-2024',
    -15,
    NOW() - INTERVAL '7 days',
    NOW()
  ),
  (
    'event-002',
    'borrower-004',
    'bank-001',
    'news',
    'MediCare Innovations Expands Global Operations',
    'Healthcare company opens new R&D centers in Europe and Asia, signaling confidence.',
    'https://medicareinnovations.com/news/expansion',
    -10,
    NOW() - INTERVAL '5 days',
    NOW()
  );
```

### Step 22.2: Negative News Events

```sql
INSERT INTO adverse_events (
  id, borrower_id, bank_id, event_type, headline, description,
  source_url, risk_score, event_date, created_at
) VALUES
  (
    'event-003',
    'borrower-002',
    'bank-001',
    'news',
    'CloudScale AI Faces Customer Churn in Key Vertical',
    'Major financial services customer migrates to competitor platform. Potential 12% revenue impact.',
    'https://fintech-news.com/cloudscale-churn',
    45,
    NOW() - INTERVAL '4 days',
    NOW()
  ),
  (
    'event-004',
    'borrower-005',
    'bank-002',
    'news',
    'BioPharma Solutions Phase 3 Trial Fails Efficacy Endpoint',
    'Lead drug candidate failed primary efficacy endpoint in pivotal trial. Stock down 32%.',
    'https://biotech-investor.com/biopharma-trial-fail',
    85,
    NOW() - INTERVAL '1 day',
    NOW()
  ),
  (
    'event-005',
    'borrower-010',
    'bank-001',
    'news',
    'Energy Resources Global Faces Regulatory Scrutiny',
    'Environmental Protection Agency launches investigation into emissions reporting.',
    'https://energy-news.com/erg-epa-investigation',
    55,
    NOW() - INTERVAL '3 days',
    NOW()
  );
```

### Step 22.3: Credit Rating Changes

```sql
INSERT INTO adverse_events (
  id, borrower_id, bank_id, event_type, headline, description,
  source_url, risk_score, event_date, created_at
) VALUES
  (
    'event-006',
    'borrower-002',
    'bank-001',
    'credit_rating_downgrade',
    'Moody''s Downgrades CloudScale AI to Ba1',
    'Rating downgrade reflects increased competitive pressure and customer concentration risk.',
    'https://moodys.com/credit-research',
    60,
    NOW() - INTERVAL '2 days',
    NOW()
  ),
  (
    'event-007',
    'borrower-005',
    'bank-002',
    'credit_rating_downgrade',
    'S&P Downgrades BioPharma Solutions to BB',
    'Multi-notch downgrade following trial failure. Outlook changed to negative.',
    'https://standardandpoors.com/ratings',
    75,
    NOW() - INTERVAL '1 day',
    NOW()
  );
```

### Step 22.4: Executive Changes

```sql
INSERT INTO adverse_events (
  id, borrower_id, bank_id, event_type, headline, description,
  source_url, risk_score, event_date, created_at
) VALUES
  (
    'event-008',
    'borrower-005',
    'bank-002',
    'executive_change',
    'BioPharma Solutions CEO Resigns Following Trial Failure',
    'Chief Executive Officer steps down amid shareholder pressure. COO assumes leadership.',
    'https://biopharma-news.com/ceo-resignation',
    40,
    NOW() - INTERVAL '12 hours',
    NOW()
  ),
  (
    'event-009',
    'borrower-002',
    'bank-001',
    'executive_change',
    'CloudScale AI CFO Departs to Join Competitor',
    'Chief Financial Officer leaves after 3 years, citing market opportunities.',
    'https://tech-insider.com/cloudscale-cfo',
    25,
    NOW() - INTERVAL '6 days',
    NOW()
  );
```

---

## 🔄 Part 23: Complete Population Script (PostgreSQL)

### Step 23.1: Full Seed Script

```bash
#!/bin/bash

# PostgreSQL Covenant Guardian Demo Data Seed Script
# Usage: psql -U your_user -d covenant_guardian -f seed_demo_data.sql

# Disable foreign key checks during import
SET session_replication role = replica;

-- Clear existing data (careful in production!)
TRUNCATE TABLE adverse_events CASCADE;
TRUNCATE TABLE alert_history CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE covenant_health CASCADE;
TRUNCATE TABLE covenants CASCADE;
TRUNCATE TABLE contracts CASCADE;
TRUNCATE TABLE borrowers CASCADE;
TRUNCATE TABLE banks CASCADE;

-- Re-enable constraints
SET session_replication role = DEFAULT;

-- Set timezone
SET timezone = 'UTC';

-- Insert Banks (from Part 18)
[All bank INSERT statements above]

-- Insert Borrowers (from Part 17)
[All borrower INSERT statements above]

-- Insert Contracts (from Part 18)
[All contract INSERT statements above]

-- Insert Covenants (from Part 19)
[All covenant INSERT statements above]

-- Insert Covenant Health (from Part 20)
[All covenant_health INSERT statements above]

-- Insert Alerts (from Part 21)
[All alert INSERT statements above]

-- Insert Adverse Events (from Part 22)
[All adverse_events INSERT statements above]

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contracts_bank_id ON contracts(bank_id);
CREATE INDEX IF NOT EXISTS idx_contracts_borrower_id ON contracts(borrower_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_covenants_contract_id ON covenants(contract_id);
CREATE INDEX IF NOT EXISTS idx_covenants_status_health ON covenant_health(status);
CREATE INDEX IF NOT EXISTS idx_alerts_bank_id ON alerts(bank_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_adverse_events_borrower_id ON adverse_events(borrower_id);

-- Verify data load
SELECT 
  'Banks' as entity, COUNT(*) as count FROM banks
UNION ALL
SELECT 'Borrowers', COUNT(*) FROM borrowers
UNION ALL
SELECT 'Contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'Covenants', COUNT(*) FROM covenants
UNION ALL
SELECT 'Covenant Health', COUNT(*) FROM covenant_health
UNION ALL
SELECT 'Alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'Adverse Events', COUNT(*) FROM adverse_events
ORDER BY 2 DESC;
```

---

## 📊 Part 24: Test Data Summary

### Summary Table

| Entity | Count | Details |
|--------|-------|---------|
| **Banks** | 3 | USA, UK, Singapore |
| **Borrowers** | 10 | Tech (3), Healthcare (3), Industrial (4) |
| **Contracts** | 10 | 5 Active, 2 Watch, 1 Default, 2 Closed |
| **Covenants** | 21 | Financial (15), Operational (3), Reporting (3) |
| **Covenant Health** | 21 | Compliant (3), Warning (6), Breached (3), Others (9) |
| **Alerts** | 8 | Critical (3), High (3), Medium (2) |
| **Adverse Events** | 9 | News (5), Rating Downgrade (2), Exec Change (2) |
| **Total Records** | ~82 | Production-ready test data |

---

## 🎯 Scenario Breakdown

### Scenario 1: Fully Compliant Borrower
**Company:** TechVision Solutions (borrower-001)
- **Contract:** LOAN-2024-0001 ($250M)
- **Status:** Active, all covenants compliant
- **Trend:** Stable, strong operational performance
- **Risk Level:** Low
- **Use Case:** Showcase healthy covenant monitoring dashboard

### Scenario 2: Warning Level Borrower
**Company:** CloudScale AI (borrower-002)
- **Contract:** LOAN-2023-0045 ($175M)
- **Status:** Watch, multiple covenants approaching limits
- **Alerts:** 3 high-severity warnings
- **Recent Event:** Customer churn, CFO departure
- **Use Case:** Demonstrate early warning system effectiveness

### Scenario 3: Default/Breached Borrower
**Company:** BioPharma Solutions (borrower-005)
- **Contract:** LOAN-2024-0008 ($125M)
- **Status:** Default, 3 covenants breached
- **Alerts:** 3 critical alerts
- **Critical Events:** Phase 3 trial failure, CEO resignation
- **Use Case:** Show crisis management and lender intervention

### Scenario 4: Diverse Portfolio
**Multiple Companies** across sectors
- **Tech:** Growth but execution risks
- **Healthcare:** Strong but regulatory exposure
- **Industrial:** Stable with cyclical patterns
- **Use Case:** Demonstrate cross-portfolio analytics

---

## 🚀 Loading Demo Data

### Method 1: Direct SQL Import

```bash
# Load all demo data
psql -U postgres -d covenant_guardian -f seed_demo_data.sql

# Verify load
psql -U postgres -d covenant_guardian -c "
  SELECT COUNT(*) as total_contracts FROM contracts;
  SELECT COUNT(*) as total_covenants FROM covenants;
  SELECT COUNT(*) as total_alerts FROM alerts;
"
```

### Method 2: Xano API (Recommended)

```bash
# Using Xano to populate via API
curl -X POST https://[workspace].xano.io/api/seed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [XANO_API_KEY]" \
  -d @demo_data.json
```

### Method 3: Node.js Script

```typescript
import { Pool } from 'pg';
import * as demoData from './demo-data.json';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDatabase() {
  try {
    // Load banks
    for (const bank of demoData.banks) {
      await pool.query(
        'INSERT INTO banks (id, name, country, subscription_tier) VALUES ($1, $2, $3, $4)',
        [bank.id, bank.name, bank.country, bank.subscription_tier]
      );
    }

    // Load borrowers
    for (const borrower of demoData.borrowers) {
      await pool.query(
        'INSERT INTO borrowers (id, bank_id, legal_name, ticker_symbol, industry) VALUES ($1, $2, $3, $4, $5)',
        [borrower.id, borrower.bank_id, borrower.legal_name, borrower.ticker_symbol, borrower.industry]
      );
    }

    // Continue for contracts, covenants, etc...
    console.log('✅ Demo data loaded successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await pool.end();
  }
}

seedDatabase();
```

---

## 📋 Verification Queries

### Check Data Integrity

```sql
-- 1. Verify contract-covenant relationship
SELECT c.contract_name, COUNT(cv.id) as covenant_count
FROM contracts c
LEFT JOIN covenants cv ON c.id = cv.contract_id
GROUP BY c.id, c.contract_name
ORDER BY covenant_count DESC;

-- 2. Alert distribution by severity
SELECT severity, COUNT(*) as count
FROM alerts
GROUP BY severity
ORDER BY count DESC;

-- 3. Covenant health distribution
SELECT status, COUNT(*) as count
FROM covenant_health
GROUP BY status
ORDER BY count DESC;

-- 4. Risk exposure by borrower
SELECT b.legal_name,
       COUNT(DISTINCT c.id) as contracts,
       COUNT(DISTINCT cv.id) as covenants,
       SUM(c.principal_amount) as total_exposure
FROM borrowers b
LEFT JOIN contracts c ON b.id = c.borrower_id
LEFT JOIN covenants cv ON c.id = cv.contract_id
GROUP BY b.id, b.legal_name
ORDER BY total_exposure DESC;

-- 5. Most recent alerts
SELECT title, severity, status, triggered_at
FROM alerts
ORDER BY triggered_at DESC
LIMIT 10;
```

---

## ✅ Data Load Checklist

- [ ] Create PostgreSQL database
- [ ] Run schema migrations
- [ ] Load demo banks (3 records)
- [ ] Load demo borrowers (10 records)
- [ ] Load demo contracts (10 records)
- [ ] Load demo covenants (21 records)
- [ ] Load covenant health (21 records)
- [ ] Load alerts (8 records)
- [ ] Load adverse events (9 records)
- [ ] Create indexes for performance
- [ ] Verify data integrity with queries
- [ ] Test React frontend connections
- [ ] Verify Xano API responses

**Demo data ready for testing!** 🎉

