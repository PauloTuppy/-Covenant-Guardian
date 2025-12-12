# Troubleshooting Guide
## Common Issues & Solutions

---

## 🎯 Quick Diagnostics

Run this before troubleshooting:

```bash
# Check Node version
node --version          # Should be 18+

# Check npm version
npm --version          # Should be 9+

# Check Docker
docker --version
docker-compose --version

# Check environment
cat .env               # Verify XANO_WORKSPACE_ID is set

# Check git status
git status
git branch -a
```

---

## 💻 Frontend Issues

### Issue: "Failed to fetch from API"

**Symptoms:**
- Console error: `TypeError: Failed to fetch`
- Network tab shows CORS errors
- Frontend loads but no data

**Solutions:**

1. **Verify API URL:**
```bash
# Check .env file
cat .env
# Should show: REACT_APP_API_BASE_URL=https://[workspace-id]-staging.xano.io/api

# Verify it's correct
echo $REACT_APP_API_BASE_URL
```

2. **Test API connectivity:**
```bash
# Direct curl request
curl https://[workspace-id]-staging.xano.io/api/contracts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return JSON, not HTML error
```

3. **Check CORS headers:**
```bash
# In browser console
fetch('https://[workspace-id]-staging.xano.io/api/contracts', {
  headers: { 'Authorization': 'Bearer TOKEN' }
}).then(r => r.json()).then(d => console.log(d))
```

4. **Verify Xano API is online:**
   - Go to https://[workspace-id]-staging.xano.io
   - Should load without errors
   - Check Xano dashboard for API status

5. **Check token validity:**
```javascript
// In browser console
const token = localStorage.getItem('token');
console.log('Token:', token);

// Decode JWT (use jwt.io)
// Check if expired: exp < Date.now()/1000
```

**If still failing:**
```bash
# Clear cache and rebuild
rm -rf node_modules build
npm install
npm run build
npm run dev

# Check browser console (F12)
# Look for actual error message
```

---

### Issue: "Docker container exits immediately"

**Symptoms:**
- `docker-compose up` shows error
- Container stops after few seconds
- Logs: "exited with code 1"

**Solutions:**

1. **Check logs:**
```bash
docker-compose logs frontend
# Look for specific error message
```

2. **Verify Node modules:**
```bash
# Clear and reinstall
rm -rf node_modules
npm install
```

3. **Check Docker build:**
```bash
# Rebuild image
docker-compose build --no-cache frontend

# Check Dockerfile
cat Dockerfile
# Ensure npm ci works
```

4. **Verify .env file:**
```bash
# Must exist and have XANO_WORKSPACE_ID
ls -la .env
grep XANO_WORKSPACE_ID .env
```

5. **Check port availability:**
```bash
# Is port 3000 already in use?
lsof -i :3000

# If yes, kill it
kill -9 <PID>
```

**If still failing:**
```bash
# Try building without cache
docker-compose down -v
docker system prune -a
docker-compose up --build
```

---

### Issue: "Hot Module Reload (HMR) not working"

**Symptoms:**
- Code changes don't update in browser
- Have to manually refresh
- Console: "WebSocket connection failed"

**Solutions:**

1. **Verify HMR is enabled:**
```bash
# In docker-compose.yml, check command:
# Should be: npm run dev (not npm start)

# Restart
docker-compose restart frontend
```

2. **Check WebSocket connection:**
```javascript
// Browser console
fetch('/__webpack_hmr')
  .then(r => console.log('HMR connected'))
  .catch(e => console.log('HMR failed'))
```

3. **Rebuild React cache:**
```bash
# Stop container
docker-compose down

# Clear cache
rm -rf node_modules/.cache
rm -rf build

# Restart
docker-compose up
```

4. **Check file permissions:**
```bash
# Ensure src directory is writable
chmod -R 755 src/
```

---

### Issue: "Tests fail locally but pass in CI"

**Symptoms:**
- `npm test` fails locally
- Same tests pass in GitHub Actions
- Timing or random failures

**Solutions:**

1. **Run tests sequentially:**
```bash
# Jest runs parallel by default (causes flakes)
npm test -- --runInBand
```

2. **Clear Jest cache:**
```bash
npm test -- --clearCache
npm test -- --no-cache
```

3. **Check environment:**
```bash
# Verify .env.test exists
cat .env.test

# Or set specific env vars
NODE_ENV=test npm test
```

4. **Use exact same Node version as CI:**
```bash
# Check .github/workflows/main.yml
# Should show node-version: 18

node --version  # Verify matches
nvm use 18      # Switch if needed
npm test
```

5. **Check for timing issues:**
```javascript
// In test files, increase timeout
jest.setTimeout(10000)

// Or use waitFor with longer timeout
await waitFor(() => {
  expect(element).toBeInTheDocument()
}, { timeout: 5000 })
```

---

## 🔗 API Issues

### Issue: "401 Unauthorized"

**Symptoms:**
- All API calls return 401
- Error: "Invalid token"
- Even with valid token

**Solutions:**

1. **Verify token exists:**
```javascript
const token = localStorage.getItem('token');
console.log('Token:', token ? 'exists' : 'missing');
```

2. **Check token expiry:**
```javascript
// Decode JWT (without verifying signature)
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
const expiryDate = new Date(payload.exp * 1000);
console.log('Expires:', expiryDate);
console.log('Is expired:', expiryDate < new Date());
```

3. **Re-login to get fresh token:**
```bash
# Delete old token
localStorage.removeItem('token')

# Login again
# Should get new token with valid expiry
```

4. **Verify token format:**
```bash
# Should be: Bearer eyJhbGc...
# Not: eyJhbGc... (missing Bearer)

# Check in Network tab > Headers
# Authorization: Bearer ...
```

---

### Issue: "503 Service Unavailable"

**Symptoms:**
- Xano API returns 503 error
- "Backend service is temporarily unavailable"

**Solutions:**

1. **Check Xano status:**
   - Go to https://status.xano.com
   - Check if there are outages
   - Wait if maintenance in progress

2. **Verify workspace is active:**
```bash
# In Xano Dashboard
# Check workspace is not suspended
# Check subscription is active
```

3. **Check API rate limits:**
```bash
# In Xano Logs
# Look for rate limit errors
# Standard: 1000 req/hour
# If exceeded, wait for reset
```

4. **Restart Xano publishing:**
```bash
# In Xano Dashboard
# Unpublish branch
# Wait 30 seconds
# Republish branch
```

---

### Issue: "500 Internal Server Error"

**Symptoms:**
- Xano API returns 500
- Error varies each time
- Xano workflow crashed

**Solutions:**

1. **Check Xano logs:**
   - Xano Dashboard > Logs
   - Find failed request
   - See error message

2. **Debug workflow:**
```
In Xano Visual Builder:
1. Open workflow that failed
2. Click "Preview" to test
3. Check each step
4. See where it breaks
5. Fix the logic
6. Test again
7. Publish when fixed
```

3. **Check database:**
```sql
-- In Xano Database Manager
-- Verify tables exist
SELECT * FROM contracts LIMIT 1;
-- Verify data integrity
SELECT COUNT(*) FROM contracts;
```

4. **Contact Xano support:**
   - Provide error details
   - Include timestamp
   - Share workflow screenshot
   - Include test data

---

## 🗄️ Database Issues

### Issue: "Connection refused"

**Symptoms:**
- Cannot connect to database
- Error in Xano logs
- Data operations fail

**Solutions:**

1. **In Xano, verify database is active:**
   - Dashboard > Data > Settings
   - Check connection status
   - Verify credentials

2. **Check database backups:**
```
If corrupted:
1. Xano Dashboard > Backups
2. Restore from previous backup
3. Verify data integrity
4. Continue operations
```

3. **Clear cache & reconnect:**
```bash
# In Xano
1. Settings > Cache
2. Clear all caches
3. Retry operation
```

---

### Issue: "Constraint violation" (duplicate key, foreign key error)

**Symptoms:**
- Insert/update fails
- Error: "duplicate key value"
- Error: "violates foreign key constraint"

**Solutions:**

1. **Check for duplicates:**
```sql
-- Find duplicates
SELECT id, COUNT(*) FROM contracts GROUP BY id HAVING COUNT(*) > 1;

-- Delete duplicates
DELETE FROM contracts WHERE id IN (SELECT id FROM contracts GROUP BY id HAVING COUNT(*) > 1);
```

2. **Verify foreign key exists:**
```sql
-- Check if referenced record exists
SELECT * FROM banks WHERE id = 'bank-001';

-- If missing, create it or use different ID
```

3. **Disable and re-enable constraints (Xano):**
```
1. Xano Dashboard > Data > Settings
2. Temporarily disable constraints
3. Fix data
4. Re-enable constraints
5. Verify integrity
```

---

## 🔐 Authentication Issues

### Issue: "Login always fails"

**Symptoms:**
- Cannot login with any credentials
- Error: "Invalid email or password"
- Demo credentials don't work

**Solutions:**

1. **Verify user exists in database:**
```sql
SELECT * FROM users WHERE email = 'user@bank.com';
```

2. **Check password is hashed correctly:**
```
Xano should hash passwords automatically
If not, check auth workflow for password hashing
```

3. **Verify auth endpoint exists:**
```bash
# In Xano API list
# Should see: POST /auth/login
# Test with Xano Preview

# Example request:
curl -X POST https://[workspace]-staging.xano.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@bank.com","password":"password"}'
```

4. **Load demo users:**
```sql
INSERT INTO users (id, email, password_hash, bank_id, role) VALUES
  ('user-001', 'demo@bank.com', 'hashed_password', 'bank-001', 'analyst');

-- Or load from seed script
psql < seed_demo_data.sql
```

---

### Issue: "Token expires immediately"

**Symptoms:**
- Login succeeds but token immediately invalid
- 401 errors after login
- Token expiry is 0 or in past

**Solutions:**

1. **Check token generation:**
```
In Xano workflow:
1. Find auth/login endpoint
2. Check JWT generation
3. Verify expiry is set: exp = now + 3600 (1 hour)
4. Test in Xano Preview
```

2. **Verify server time:**
```bash
# Xano server time should match your time
# Large difference causes token issues

# Check:
date  # Your local time
# Compare with Xano logs timestamp
```

3. **Increase expiry for testing:**
```
Temporary fix (for dev only):
Set token expiry to 24 hours instead of 1 hour
Don't do this in production!
```

---

## 🚀 Deployment Issues

### Issue: "Vercel deployment fails"

**Symptoms:**
- GitHub Actions shows red X
- Vercel shows failed build
- Build logs show errors

**Solutions:**

1. **Check build logs:**
```
In Vercel Dashboard:
1. Click failed deployment
2. Click "View build logs"
3. Find specific error
4. Fix locally first
```

2. **Verify environment variables:**
```bash
# In Vercel Dashboard:
# Settings > Environment Variables
# Should have:
# - REACT_APP_API_BASE_URL
# - REACT_APP_ENV

# Test locally with same values:
REACT_APP_API_BASE_URL=... npm run build
```

3. **Test build locally:**
```bash
# Replicate Vercel's build process
npm ci              # Exact same as Vercel
npm run build       # Should succeed locally

# Check build output
ls -la build/
```

4. **Check Node version:**
```bash
# Vercel uses Node 18 by default
node --version     # Should be 18+

# If using different version:
# Create vercel.json with specific Node version
```

5. **Clear Vercel cache:**
```
In Vercel Dashboard:
1. Settings > Git
2. Click "Clear Cache"
3. Redeploy
```

---

### Issue: "Xano staging/main branch won't publish"

**Symptoms:**
- Publish button is grayed out
- Publish fails silently
- Error: "Cannot publish at this time"

**Solutions:**

1. **Check for conflicts:**
```
In Xano:
1. Branching page
2. Look for conflict warning
3. Resolve conflicts:
   - Keep local (your changes)
   - Keep remote (other person's changes)
   - Merge manually
4. Try publish again
```

2. **Check for unsaved changes:**
```
1. Visual Builder shows unsaved dots
2. Save each change (Cmd+S or Ctrl+S)
3. Build completes (watch for green checkmark)
4. Then publish
```

3. **Wait for Xano to finish building:**
```
1. Small icon next to branch name
2. Should show green checkmark when complete
3. Don't publish while building
4. Wait for build to finish
5. Then publish
```

---

## 📊 Performance Issues

### Issue: "Dashboard loads slowly"

**Symptoms:**
- Page takes >3 seconds to load
- Charts render slowly
- Filtering is sluggish

**Solutions:**

1. **Check network speed:**
```javascript
// In browser DevTools > Network tab
// Look for slow requests
// Should all be <500ms

// Time to First Paint (TTP)
// Should be <2 seconds
```

2. **Check for n+1 queries:**
```
In Xano logs:
1. Look for repeated queries
2. Should fetch all data in single query
3. Refactor if looping over results
```

3. **Paginate large datasets:**
```javascript
// Instead of fetching all:
GET /contracts  // Returns 10,000+ results (slow!)

// Use pagination:
GET /contracts?page=1&limit=20  // Returns 20 results (fast!)
```

4. **Enable caching:**
```javascript
// In Axios interceptor:
const cacheConfig = {
  headers: {
    'Cache-Control': 'max-age=3600'
  }
}
```

5. **Optimize images & assets:**
```bash
# Check bundle size
npm run build
# Look for large packages
npm analyze

# If too large:
# Remove unused dependencies
# Lazy-load components
# Use code-splitting
```

---

## 📞 Getting Help

### Before asking for help, try:

1. ✅ **Search documentation:**
   - README.md
   - XANO.md
   - This troubleshooting guide

2. ✅ **Check logs:**
   - Browser console (F12)
   - Xano logs
   - GitHub Actions logs
   - Vercel build logs

3. ✅ **Search community:**
   - GitHub Issues
   - Stack Overflow
   - Xano Community Forum

4. ✅ **Minimal reproduction:**
   - Create simple test case
   - Share exact steps to reproduce
   - Include error messages

### Ask for help with:

- **GitHub Issues:** For bugs in code
- **Xano Community:** For backend issues
- **Discord:** For general discussion
- **Email Support:** For account issues

### When asking for help, include:

```
1. Error message (full, not just summary)
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment:
   - Node version: `node --version`
   - npm version: `npm --version`
   - OS: macOS/Windows/Linux
6. Relevant code snippet
7. Screenshot if applicable
```

---

## 🆘 Emergency Procedures

### Database corrupted

1. **Immediately:** Don't make more changes
2. **In Xano:** Go to Backups
3. **Restore:** Pick most recent good backup
4. **Verify:** Check data integrity
5. **Document:** What happened

### API completely down

1. **Check status:** https://status.xano.com
2. **If maintenance:** Wait for completion
3. **If outage:** Contact Xano support
4. **Tell users:** Update status page
5. **Monitor:** Watch for resolution

### Security breach suspected

1. **Immediate actions:**
   - Revoke all API keys
   - Force all users to re-login
   - Change admin passwords
2. **Investigation:**
   - Check logs for suspicious activity
   - See what data was accessed
   - Determine scope of breach
3. **Notification:**
   - Inform affected users
   - Document incident
   - File report if required
4. **Prevention:**
   - Enable 2FA
   - Rotate credentials
   - Update security policies

---

## 📈 Monitoring Checklist

Daily:
- [ ] Check error rate < 0.1%
- [ ] Check API response time < 200ms
- [ ] Verify backups completed
- [ ] Review alert logs

Weekly:
- [ ] Check coverage reports
- [ ] Review slow queries
- [ ] Check disk usage
- [ ] Verify data integrity

Monthly:
- [ ] Performance review
- [ ] Security audit
- [ ] Cost analysis
- [ ] Capacity planning

---

**Still stuck? Check the specific docs or reach out to support! 🚀**

