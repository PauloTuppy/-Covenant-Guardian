# Xano Functions Setup for Covenant Extraction

This document provides the Xano function configurations needed to implement server-side covenant extraction using Gemini AI.

## Required Xano Functions

### 1. Queue Covenant Extraction (`/xano/covenant-extraction/queue`)

**Method:** POST
**Purpose:** Queue a covenant extraction job for background processing

**Input Parameters:**
- `contract_id` (string, required)
- `contract_text` (text, required)
- `priority` (string, optional, default: "normal")

**Function Logic:**
```javascript
// Create extraction job record
const job = await this.addRecord('extraction_jobs', {
  contract_id: inputs.contract_id,
  status: 'pending',
  priority: inputs.priority || 'normal',
  progress_percentage: 0,
  extracted_covenants_count: 0,
  created_at: new Date().toISOString()
});

// Store contract text for processing
await this.addRecord('extraction_queue', {
  job_id: job.id,
  contract_id: inputs.contract_id,
  contract_text: inputs.contract_text,
  priority: inputs.priority || 'normal',
  retry_count: 0,
  max_retries: 3
});

// Trigger background processing (webhook or scheduled function)
// await this.runFunction('process_extraction_queue');

return { job_id: job.id };
```

### 2. Get Extraction Job Status (`/xano/covenant-extraction/jobs/{job_id}`)

**Method:** GET
**Purpose:** Get the status of a specific extraction job

**Function Logic:**
```javascript
const job = await this.getRecord('extraction_jobs', inputs.job_id);

if (!job) {
  return this.response('Job not found', 404);
}

return job;
```

### 3. Get Contract Extraction Status (`/contracts/{contract_id}/covenants/extraction-status`)

**Method:** GET
**Purpose:** Get extraction status for a specific contract

**Function Logic:**
```javascript
const job = await this.getRecords('extraction_jobs', {
  filter: { contract_id: inputs.contract_id },
  sort: [{ field: 'created_at', direction: 'desc' }],
  limit: 1
});

if (job.length === 0) {
  return this.response('No extraction job found', 404);
}

return job[0];
```

### 4. Process Extraction Queue (`process_extraction_queue`)

**Method:** Background Function (Scheduled or Webhook)
**Purpose:** Process pending extraction jobs using Gemini AI

**Function Logic:**
```javascript
// Get pending jobs
const pendingJobs = await this.getRecords('extraction_queue', {
  filter: { status: 'pending' },
  sort: [
    { field: 'priority', direction: 'desc' },
    { field: 'created_at', direction: 'asc' }
  ],
  limit: 5 // Process 5 jobs at a time
});

for (const queueItem of pendingJobs) {
  try {
    // Update job status to processing
    await this.editRecord('extraction_jobs', queueItem.job_id, {
      status: 'processing',
      started_at: new Date().toISOString(),
      progress_percentage: 10
    });

    // Call Gemini AI for covenant extraction
    const geminiResponse = await this.callGeminiAPI(queueItem.contract_text);
    
    // Update progress
    await this.editRecord('extraction_jobs', queueItem.job_id, {
      progress_percentage: 60
    });

    // Validate and classify covenants
    const validatedCovenants = this.validateCovenants(geminiResponse.covenants, queueItem.contract_id);
    
    // Update progress
    await this.editRecord('extraction_jobs', queueItem.job_id, {
      progress_percentage: 80
    });

    // Store covenants
    let storedCount = 0;
    for (const covenant of validatedCovenants) {
      await this.addRecord('covenants', {
        ...covenant,
        gemini_extracted: true,
        bank_id: this.user.bank_id
      });
      storedCount++;
    }

    // Complete job
    await this.editRecord('extraction_jobs', queueItem.job_id, {
      status: 'completed',
      progress_percentage: 100,
      extracted_covenants_count: storedCount,
      completed_at: new Date().toISOString()
    });

    // Remove from queue
    await this.deleteRecord('extraction_queue', queueItem.id);

  } catch (error) {
    // Handle retry logic
    const retryCount = queueItem.retry_count + 1;
    
    if (retryCount < queueItem.max_retries) {
      // Retry with exponential backoff
      await this.editRecord('extraction_queue', queueItem.id, {
        retry_count: retryCount,
        next_retry_at: new Date(Date.now() + Math.pow(2, retryCount) * 1000).toISOString()
      });
      
      await this.editRecord('extraction_jobs', queueItem.job_id, {
        status: 'pending',
        progress_percentage: 0
      });
    } else {
      // Mark as failed
      await this.editRecord('extraction_jobs', queueItem.job_id, {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      });
      
      await this.deleteRecord('extraction_queue', queueItem.id);
    }
  }
}
```

### 5. Gemini AI Helper Function (`callGeminiAPI`)

**Purpose:** Call Gemini AI for covenant extraction

**Function Logic:**
```javascript
function callGeminiAPI(contractText) {
  const prompt = `
You are an expert financial analyst specializing in loan covenant extraction. Analyze the following contract text and extract all financial and operational covenants.

For each covenant found, provide:
1. covenant_name: A clear, descriptive name
2. covenant_type: One of "financial", "operational", "reporting", "other"
3. metric_name: The specific financial metric (e.g., "debt_to_ebitda", "current_ratio")
4. operator: The comparison operator ("<", "<=", ">", ">=", "=", "!=")
5. threshold_value: The numeric threshold (extract number only)
6. threshold_unit: The unit if applicable (e.g., "ratio", "dollars", "percent")
7. check_frequency: One of "monthly", "quarterly", "annually", "on_demand"
8. covenant_clause: The exact text from the contract
9. confidence_score: Your confidence in the extraction (0.0 to 1.0)

Contract Text:
${contractText}

Respond with valid JSON in this exact format:
{
  "covenants": [
    {
      "covenant_name": "string",
      "covenant_type": "financial|operational|reporting|other",
      "metric_name": "string",
      "operator": "<|<=|>|>=|=|!=",
      "threshold_value": number,
      "threshold_unit": "string",
      "check_frequency": "monthly|quarterly|annually|on_demand",
      "covenant_clause": "string",
      "confidence_score": number
    }
  ],
  "summary": "Brief summary of extraction results"
}

Focus on measurable, quantifiable covenants. If a covenant is unclear or ambiguous, set confidence_score below 0.7.
`;

  const response = fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}
```

### 6. Covenant Validation Helper Function (`validateCovenants`)

**Purpose:** Validate and classify extracted covenants

**Function Logic:**
```javascript
function validateCovenants(extractedCovenants, contractId) {
  const validatedCovenants = [];

  for (const extracted of extractedCovenants) {
    // Skip low-confidence covenants
    if (!extracted.covenant_name || extracted.confidence_score < 0.3) {
      continue;
    }

    // Classify covenant type
    const covenantType = this.classifyCovenantType(
      extracted.covenant_name,
      extracted.metric_name,
      extracted.covenant_clause
    );

    // Validate operator and threshold
    const validOperators = ['<', '<=', '>', '>=', '=', '!='];
    if (!validOperators.includes(extracted.operator)) {
      continue;
    }

    if (isNaN(extracted.threshold_value) || !isFinite(extracted.threshold_value)) {
      continue;
    }

    // Determine check frequency
    const checkFrequency = this.determineCheckFrequency(
      extracted.check_frequency,
      extracted.covenant_clause
    );

    validatedCovenants.push({
      contract_id: contractId,
      covenant_name: extracted.covenant_name.trim(),
      covenant_type: covenantType,
      metric_name: extracted.metric_name?.trim() || null,
      operator: extracted.operator,
      threshold_value: extracted.threshold_value,
      threshold_unit: extracted.threshold_unit?.trim() || null,
      check_frequency: checkFrequency,
      covenant_clause: extracted.covenant_clause?.trim() || null,
    });
  }

  return validatedCovenants;
}
```

## Required Database Tables

### extraction_jobs
- `id` (auto-increment primary key)
- `contract_id` (string, foreign key)
- `bank_id` (string, foreign key)
- `status` (enum: pending, processing, completed, failed)
- `progress_percentage` (integer, 0-100)
- `extracted_covenants_count` (integer)
- `error_message` (text, nullable)
- `started_at` (datetime, nullable)
- `completed_at` (datetime, nullable)
- `created_at` (datetime)
- `updated_at` (datetime)

### extraction_queue
- `id` (auto-increment primary key)
- `job_id` (string, foreign key to extraction_jobs)
- `contract_id` (string, foreign key)
- `contract_text` (text)
- `priority` (enum: low, normal, high)
- `retry_count` (integer, default 0)
- `max_retries` (integer, default 3)
- `next_retry_at` (datetime, nullable)
- `created_at` (datetime)

## Environment Variables

Add these to your Xano environment:
- `GEMINI_API_KEY`: Your Google Gemini API key

## Scheduled Functions

Set up a scheduled function to run `process_extraction_queue` every 1-2 minutes to process pending extraction jobs.

## Security Considerations

1. Ensure all functions check user authentication and bank_id isolation
2. Validate all input parameters
3. Implement rate limiting for Gemini API calls
4. Log all extraction activities for audit purposes
5. Sanitize contract text before sending to Gemini API


---

# Scheduled Workflows Setup

This section documents the Xano scheduled functions required for automated workflows.

## Scheduled Workflow Functions

### 1. Covenant Health Check (`/xano/scheduled-workflows/jobs/covenant_health_check/trigger`)

**Method:** POST
**Schedule:** Daily at 6 AM (cron: `0 6 * * *`)
**Purpose:** Calculate covenant compliance status for all active covenants (Requirement 3.1)

**Function Logic:**
```javascript
// Get all covenants due for health check
const today = new Date().toISOString().split('T')[0];
const covenants = await this.getRecords('covenants', {
  filter: {
    next_check_date: { $lte: today }
  },
  join: ['contracts', 'borrowers']
});

const results = {
  processed: 0,
  failed: 0,
  compliant: 0,
  warning: 0,
  breached: 0
};

for (const covenant of covenants) {
  try {
    // Get latest financial data for borrower
    const financialData = await this.getRecords('financial_metrics', {
      filter: { borrower_id: covenant.contract.borrower_id },
      sort: [{ field: 'period_date', direction: 'desc' }],
      limit: 1
    });

    // Calculate covenant health
    const health = await this.calculateCovenantHealth(covenant, financialData[0]);
    
    // Update or create covenant_health record
    await this.upsertRecord('covenant_health', {
      covenant_id: covenant.id,
      ...health,
      last_calculated: new Date().toISOString()
    });

    // Create alert if status changed to warning or breached
    if (health.status !== 'compliant') {
      await this.createCovenantAlert(covenant, health);
    }

    results.processed++;
    results[health.status]++;

    // Update next check date
    await this.editRecord('covenants', covenant.id, {
      next_check_date: this.calculateNextCheckDate(covenant.check_frequency)
    });
  } catch (error) {
    results.failed++;
    console.error(`Failed to process covenant ${covenant.id}:`, error);
  }
}

return results;
```

### 2. Daily News Ingestion (`/xano/scheduled-workflows/jobs/daily_news_ingestion/trigger`)

**Method:** POST
**Schedule:** Daily at 7 AM (cron: `0 7 * * *`)
**Purpose:** Ingest and analyze news for all monitored borrowers (Requirement 6.1)

**Function Logic:**
```javascript
// Get all borrowers to monitor
const borrowers = await this.getRecords('borrowers');

const results = {
  events_found: 0,
  high_risk_events: 0,
  alerts_created: 0
};

for (const borrower of borrowers) {
  try {
    // Build search query
    const searchTerms = [borrower.legal_name];
    if (borrower.ticker_symbol) {
      searchTerms.push(borrower.ticker_symbol);
    }

    // Fetch news from configured sources
    const newsItems = await this.fetchNewsFromSources(searchTerms);

    for (const newsItem of newsItems) {
      // Analyze with Gemini AI
      const riskAssessment = await this.analyzeNewsWithGemini(newsItem, borrower);

      // Store adverse event
      const event = await this.addRecord('adverse_events', {
        borrower_id: borrower.id,
        bank_id: borrower.bank_id,
        event_type: this.classifyEventType(newsItem),
        headline: newsItem.title,
        description: newsItem.description,
        source_url: newsItem.url,
        risk_score: riskAssessment.risk_score,
        gemini_analyzed: true,
        event_date: newsItem.publishedAt || new Date().toISOString()
      });

      results.events_found++;

      // Create alert for high-risk events
      if (riskAssessment.risk_score >= 7) {
        results.high_risk_events++;
        await this.createAdverseEventAlert(event, borrower, riskAssessment);
        results.alerts_created++;
      }
    }
  } catch (error) {
    console.error(`Failed to process news for ${borrower.legal_name}:`, error);
  }
}

return results;
```

### 3. Automated Report Generation (`/xano/scheduled-workflows/jobs/automated_report_generation/trigger`)

**Method:** POST
**Schedule:** Weekly on Monday at 8 AM (cron: `0 8 * * 1`)
**Purpose:** Generate scheduled portfolio and covenant reports (Requirement 8.1)

**Function Logic:**
```javascript
// Get report configurations
const reportConfigs = await this.getRecords('report_configs', {
  filter: { enabled: true }
});

const results = {
  reports_generated: 0,
  errors: []
};

for (const config of reportConfigs) {
  try {
    // Calculate date range
    const dateRange = this.calculateReportDateRange(config.frequency);

    // Gather report data
    const reportData = await this.gatherReportData(dateRange, config.report_type);

    // Generate AI summary if enabled
    if (config.include_ai_summary) {
      reportData.ai_summary = await this.generateAISummary(reportData);
    }

    // Store report
    await this.addRecord('risk_reports', {
      bank_id: this.user.bank_id,
      report_type: config.report_type,
      report_date: new Date().toISOString(),
      ...reportData
    });

    results.reports_generated++;
  } catch (error) {
    results.errors.push(`${config.report_type}: ${error.message}`);
  }
}

return results;
```

### 4. Data Backup (`/xano/scheduled-workflows/jobs/data_backup/trigger`)

**Method:** POST
**Schedule:** Daily at 2 AM (cron: `0 2 * * *`)
**Purpose:** Backup database and clean up old backups

**Function Logic:**
```javascript
const backupConfig = inputs.config || {
  backup_type: 'incremental',
  retention_days: 30,
  storage_location: 'default'
};

// Trigger database backup
const backup = await this.createDatabaseBackup(backupConfig);

// Clean up old backups
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - backupConfig.retention_days);

const oldBackups = await this.getRecords('backups', {
  filter: { created_at: { $lt: cutoffDate.toISOString() } }
});

let deletedCount = 0;
for (const oldBackup of oldBackups) {
  await this.deleteBackupFile(oldBackup.storage_path);
  await this.deleteRecord('backups', oldBackup.id);
  deletedCount++;
}

return {
  backup_id: backup.id,
  tables_backed_up: backup.tables,
  size_bytes: backup.size,
  backups_cleaned: deletedCount
};
```

### 5. Database Maintenance (`/xano/scheduled-workflows/jobs/database_maintenance/trigger`)

**Method:** POST
**Schedule:** Weekly on Sunday at 3 AM (cron: `0 3 * * 0`)
**Purpose:** Run database maintenance tasks

**Function Logic:**
```javascript
const tasks = [
  { name: 'vacuum_analyze', sql: 'VACUUM ANALYZE' },
  { name: 'refresh_materialized_views', fn: 'refreshMaterializedViews' },
  { name: 'cleanup_audit_logs', fn: 'archiveOldAuditLogs' },
  { name: 'update_statistics', sql: 'ANALYZE' }
];

const results = [];

for (const task of tasks) {
  try {
    if (task.sql) {
      await this.executeSQL(task.sql);
    } else if (task.fn) {
      await this[task.fn]();
    }
    results.push({ task: task.name, status: 'completed' });
  } catch (error) {
    results.push({ task: task.name, status: 'failed', error: error.message });
  }
}

return { tasks: results };
```

## Workflow Management Endpoints

### Get Scheduled Jobs (`/xano/scheduled-workflows/jobs`)

**Method:** GET
**Purpose:** List all scheduled job configurations

### Update Job Config (`/xano/scheduled-workflows/jobs/{job_name}`)

**Method:** PUT
**Purpose:** Update job configuration (enable/disable, change schedule)

### Get Job History (`/xano/scheduled-workflows/jobs/{job_name}/history`)

**Method:** GET
**Purpose:** Get execution history for a job

## Required Database Tables

### scheduled_jobs
- `id` (auto-increment primary key)
- `job_name` (string, unique)
- `schedule` (string, cron expression)
- `enabled` (boolean, default true)
- `last_run` (datetime, nullable)
- `next_run` (datetime, nullable)
- `status` (enum: idle, running, completed, failed)
- `error_message` (text, nullable)
- `created_at` (datetime)
- `updated_at` (datetime)

### job_execution_history
- `id` (auto-increment primary key)
- `job_name` (string)
- `started_at` (datetime)
- `completed_at` (datetime)
- `status` (enum: success, partial, failed)
- `items_processed` (integer)
- `items_failed` (integer)
- `details` (json)
- `created_at` (datetime)

### news_sources
- `id` (auto-increment primary key)
- `source_name` (string)
- `api_endpoint` (string)
- `api_key_env` (string)
- `enabled` (boolean)
- `created_at` (datetime)
- `updated_at` (datetime)

### report_configs
- `id` (auto-increment primary key)
- `bank_id` (string, foreign key)
- `report_type` (enum: portfolio_summary, borrower_deep_dive, covenant_analysis)
- `frequency` (enum: daily, weekly, monthly)
- `enabled` (boolean)
- `include_ai_summary` (boolean)
- `created_at` (datetime)
- `updated_at` (datetime)

### backups
- `id` (auto-increment primary key)
- `backup_type` (enum: full, incremental)
- `storage_path` (string)
- `size_bytes` (bigint)
- `tables` (json array)
- `created_at` (datetime)

## Environment Variables

Add these to your Xano environment:
- `NEWS_API_KEY`: API key for news service (e.g., NewsAPI)
- `BACKUP_STORAGE_PATH`: Path for backup storage

## Cron Schedule Reference

| Workflow | Schedule | Cron Expression |
|----------|----------|-----------------|
| Covenant Health Check | Daily 6 AM | `0 6 * * *` |
| News Ingestion | Daily 7 AM | `0 7 * * *` |
| Report Generation | Monday 8 AM | `0 8 * * 1` |
| Data Backup | Daily 2 AM | `0 2 * * *` |
| Database Maintenance | Sunday 3 AM | `0 3 * * 0` |
