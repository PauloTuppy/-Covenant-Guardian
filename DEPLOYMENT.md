# Covenant Guardian - Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the Covenant Guardian system, covering development, staging, and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Setup](#database-setup)
7. [Xano Backend Configuration](#xano-backend-configuration)
8. [Multi-Tenant Configuration](#multi-tenant-configuration)
9. [Monitoring and Health Checks](#monitoring-and-health-checks)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Docker**: v24.x or higher (for containerized deployment)
- **PostgreSQL**: v15.x or higher
- **Git**: v2.x or higher

### Required Accounts

- **Xano**: Workspace with API endpoints configured
- **Google Cloud**: Gemini AI API access
- **Vercel** (optional): For frontend hosting
- **GitHub**: For CI/CD integration

### Environment Variables

Create `.env` files for each environment:

```bash
# .env.development
VITE_API_BASE_URL=https://your-workspace-staging.xano.io/api
VITE_ENV=development
VITE_ENABLE_PBT=true
VITE_ENABLE_AUDIT_LOGS=true
VITE_ENABLE_MULTI_TENANT=true

# .env.staging
VITE_API_BASE_URL=https://your-workspace-staging.xano.io/api
VITE_ENV=staging
VITE_ENABLE_PBT=true
VITE_ENABLE_AUDIT_LOGS=true
VITE_ENABLE_MULTI_TENANT=true

# .env.production
VITE_API_BASE_URL=https://your-workspace.xano.io/api
VITE_ENV=production
VITE_ENABLE_PBT=false
VITE_ENABLE_AUDIT_LOGS=true
VITE_ENABLE_MULTI_TENANT=true
```

---

## Development Deployment

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/covenant-guardian.git
   cd covenant-guardian
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

### Docker Development Setup

1. **Start all services**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Initialize database**:
   ```bash
   docker exec -it covenant-guardian-db psql -U postgres -d covenant_guardian -f /docker-entrypoint-initdb.d/01-schema.sql
   ```

3. **View logs**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f frontend
   ```

4. **Stop services**:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run property-based tests only
npm run test:pbt

# Run with coverage
npm run test:coverage

# Run integration tests
npm test -- --testPathPattern=integration
```

---

## Staging Deployment

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables configured in Xano staging
- [ ] Database migrations applied to staging
- [ ] Gemini AI API keys configured
- [ ] Multi-tenant isolation verified

### Deployment Steps

1. **Merge to staging branch**:
   ```bash
   git checkout staging
   git merge develop
   git push origin staging
   ```

2. **Verify Xano staging environment**:
   - Navigate to Xano dashboard
   - Switch to staging branch
   - Verify all API endpoints are published
   - Test authentication endpoints

3. **Deploy frontend to staging**:
   ```bash
   # Build for staging
   npm run build -- --mode staging
   
   # Deploy to Vercel staging
   vercel --env staging
   ```

4. **Run smoke tests**:
   ```bash
   npm run test:e2e -- --env staging
   ```

---

## Production Deployment

### Pre-Production Checklist

- [ ] Staging environment fully tested
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Stakeholder approval obtained

### Deployment Process

1. **Create production release**:
   ```bash
   git checkout main
   git merge staging
   git tag -a v1.x.x -m "Release v1.x.x"
   git push origin main --tags
   ```

2. **Deploy Xano backend**:
   - In Xano dashboard, merge staging → main
   - Publish all endpoints to production
   - Verify API health: `https://your-workspace.xano.io/api/health`

3. **Deploy frontend**:
   ```bash
   # Use the deployment script
   ./scripts/deploy-production.sh
   ```

4. **Verify deployment**:
   - Check application health endpoint
   - Verify authentication flow
   - Test critical user journeys
   - Monitor error rates

### Zero-Downtime Deployment

For zero-downtime deployments:

1. **Blue-Green Deployment**:
   ```bash
   # Deploy to green environment
   docker-compose -f docker-compose.green.yml up -d
   
   # Health check green
   curl https://green.covenant-guardian.com/health
   
   # Switch traffic
   # Update load balancer to point to green
   
   # Decommission blue
   docker-compose -f docker-compose.blue.yml down
   ```

---

## Database Setup

### Initial Schema Setup

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost -d covenant_guardian

# Run schema creation
\i schema.sql

# Run initialization scripts
\i scripts/init-database.sql
```

### Database Migrations

```bash
# Apply pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Check migration status
npm run db:status
```

### Multi-Tenant Database Configuration

The database schema enforces multi-tenant isolation through:

1. **Bank ID Foreign Keys**: All tables include `bank_id` column
2. **Row-Level Security**: PostgreSQL RLS policies
3. **Composite Indexes**: Optimized for tenant-filtered queries

```sql
-- Example RLS policy
CREATE POLICY bank_isolation ON contracts
  USING (bank_id = current_setting('app.current_bank_id')::uuid);
```

### Database Backup

```bash
# Create backup
pg_dump -U postgres -h localhost covenant_guardian > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres -h localhost covenant_guardian < backup_20250101.sql
```

---

## Xano Backend Configuration

### API Endpoint Setup

1. **Authentication Endpoints**:
   - `POST /auth/login` - User authentication
   - `POST /auth/refresh` - Token refresh
   - `POST /auth/logout` - Session termination

2. **Contract Endpoints**:
   - `POST /contracts/create` - Create contract
   - `GET /contracts` - List contracts (with bank filtering)
   - `GET /contracts/{id}` - Get contract details

3. **Covenant Endpoints**:
   - `GET /covenants/{id}/health` - Covenant health status
   - `POST /covenants/extract` - Trigger AI extraction

### Xano Function Configuration

Configure scheduled functions for:

- **Covenant Health Checks**: Every 6 hours
- **Alert Escalation**: Every hour
- **News Ingestion**: Daily at 6 AM
- **Report Generation**: Weekly on Mondays

### Gemini AI Integration

```javascript
// Xano function for Gemini integration
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function extractCovenants(contractText) {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Extract financial covenants from: ${contractText}`
        }]
      }]
    })
  });
  
  return response.json();
}
```

---

## Multi-Tenant Configuration

### Tenant Isolation Verification

Run the multi-tenant isolation tests:

```bash
npm test -- --testPathPattern=multiTenant
```

### Adding New Tenants

1. **Create bank record**:
   ```sql
   INSERT INTO banks (id, name, domain, settings)
   VALUES (uuid_generate_v4(), 'New Bank', 'newbank.com', '{}');
   ```

2. **Create admin user**:
   ```sql
   INSERT INTO users (id, bank_id, email, role, password_hash)
   VALUES (uuid_generate_v4(), '<bank_id>', 'admin@newbank.com', 'admin', '<hash>');
   ```

3. **Configure API access**:
   - Generate API keys in Xano
   - Configure rate limits
   - Set up webhook endpoints

---

## Monitoring and Health Checks

### Health Check Endpoints

- **Application Health**: `GET /health`
- **Database Health**: `GET /health/db`
- **External Services**: `GET /health/external`

### Monitoring Setup

1. **Application Metrics**:
   - Response times
   - Error rates
   - Active users
   - API call volumes

2. **Database Metrics**:
   - Query performance
   - Connection pool usage
   - Storage utilization

3. **Alert Thresholds**:
   - Error rate > 1%: Warning
   - Error rate > 5%: Critical
   - Response time > 2s: Warning
   - Response time > 5s: Critical

### Log Management

```bash
# View application logs
docker logs covenant-guardian-frontend -f

# View database logs
docker logs covenant-guardian-db -f

# Export logs for analysis
docker logs covenant-guardian-frontend > logs/app_$(date +%Y%m%d).log
```

---

## Rollback Procedures

### Frontend Rollback

```bash
# Rollback to previous version
vercel rollback

# Or deploy specific version
git checkout v1.x.x
npm run build
vercel --prod
```

### Backend Rollback (Xano)

1. Navigate to Xano dashboard
2. Go to Version History
3. Select previous stable version
4. Click "Restore"
5. Publish to production

### Database Rollback

```bash
# Rollback last migration
npm run db:rollback

# Restore from backup
psql -U postgres -h localhost covenant_guardian < backup_YYYYMMDD.sql
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Symptoms**: 401 errors, token refresh failures

**Solutions**:
- Verify JWT secret configuration
- Check token expiration settings
- Validate Xano auth endpoint

#### 2. Multi-Tenant Data Leakage

**Symptoms**: Users seeing data from other banks

**Solutions**:
- Verify bank_id in all API requests
- Check RLS policies are enabled
- Review API middleware configuration

#### 3. Gemini AI Extraction Failures

**Symptoms**: Covenant extraction timeouts or errors

**Solutions**:
- Check Gemini API key validity
- Verify rate limits not exceeded
- Review document size limits

#### 4. Database Connection Issues

**Symptoms**: Connection timeouts, pool exhaustion

**Solutions**:
- Increase connection pool size
- Check database server resources
- Review long-running queries

### Support Contacts

- **Technical Support**: support@covenant-guardian.com
- **Security Issues**: security@covenant-guardian.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

---

## Appendix

### Environment Variable Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Xano API base URL | Yes | - |
| `VITE_ENV` | Environment name | Yes | development |
| `VITE_ENABLE_PBT` | Enable property tests | No | false |
| `VITE_ENABLE_AUDIT_LOGS` | Enable audit logging | No | true |
| `VITE_ENABLE_MULTI_TENANT` | Enable multi-tenant | No | true |

### Deployment Checklist Template

```markdown
## Deployment Checklist - v1.x.x

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Deployment
- [ ] Database backup created
- [ ] Xano backend deployed
- [ ] Frontend deployed
- [ ] Health checks passing

### Post-Deployment
- [ ] Smoke tests completed
- [ ] Monitoring verified
- [ ] Stakeholders notified
- [ ] Rollback plan tested
```
