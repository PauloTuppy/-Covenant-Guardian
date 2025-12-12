/**
 * Xano API Test Script
 * Run with: node scripts/test-xano-api.js
 */

const XANO_BASE_URL = 'https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p';

async function testEndpoint(name, url, method = 'GET', body = null) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   ${method} ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📦 Response:`, JSON.stringify(data, null, 2).substring(0, 500));
      return { success: true, data };
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   📦 Error:`, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Xano API Test Suite');
  console.log('='.repeat(50));
  console.log(`Base URL: ${XANO_BASE_URL}`);
  
  const results = {
    passed: 0,
    failed: 0,
  };
  
  // Test 1: GET /banks
  const banksResult = await testEndpoint('Banks List', `${XANO_BASE_URL}/banks`);
  banksResult.success ? results.passed++ : results.failed++;
  
  // Test 2: GET /contracts
  const contractsResult = await testEndpoint('Contracts List', `${XANO_BASE_URL}/contracts`);
  contractsResult.success ? results.passed++ : results.failed++;
  
  // Test 3: GET /covenants
  const covenantsResult = await testEndpoint('Covenants List', `${XANO_BASE_URL}/covenants`);
  covenantsResult.success ? results.passed++ : results.failed++;
  
  // Test 4: GET /covenant_health (New endpoint)
  const healthResult = await testEndpoint(
    'Covenant Health',
    `${XANO_BASE_URL}/covenant_health`
  );
  healthResult.success ? results.passed++ : results.failed++;
  
  // Test 5: GET /alerts (New endpoint)
  const alertsResult = await testEndpoint(
    'Alerts',
    `${XANO_BASE_URL}/alerts`
  );
  alertsResult.success ? results.passed++ : results.failed++;
  
  // Test 6: GET /portfolio_summary (New endpoint)
  const summaryResult = await testEndpoint(
    'Portfolio Summary',
    `${XANO_BASE_URL}/portfolio_summary`
  );
  summaryResult.success ? results.passed++ : results.failed++;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log('='.repeat(50));
  
  return results;
}

// Test local covenant analysis (fallback)
async function testLocalAnalysis() {
  console.log('\n🧪 Testing Local Covenant Analysis (Fallback)');
  console.log('='.repeat(50));
  
  // Fetch covenants
  const response = await fetch(`${XANO_BASE_URL}/covenants`);
  const covenants = await response.json();
  
  // Filter for contract_id = 1
  const contractCovenants = covenants.filter(c => c.contract_id === 1);
  console.log(`📦 Found ${contractCovenants.length} covenants for contract #1`);
  
  // Perform local analysis
  const breached = [];
  const warning = [];
  const compliant = [];
  
  contractCovenants.forEach(cov => {
    if (cov.current_value < cov.threshold_value * 0.9) {
      breached.push(cov.covenant_name);
    } else if (cov.current_value < cov.threshold_value) {
      warning.push(cov.covenant_name);
    } else {
      compliant.push(cov.covenant_name);
    }
  });
  
  // Determine risk level
  let risk_level = 'low';
  if (breached.length > 0) {
    risk_level = breached.length >= 2 ? 'critical' : 'high';
  } else if (warning.length > 0) {
    risk_level = warning.length >= 2 ? 'high' : 'medium';
  }
  
  console.log('\n📊 Analysis Results:');
  console.log(`   Risk Level: ${risk_level.toUpperCase()}`);
  console.log(`   ❌ Breached: ${breached.length} - ${breached.join(', ') || 'None'}`);
  console.log(`   ⚠️  Warning: ${warning.length} - ${warning.join(', ') || 'None'}`);
  console.log(`   ✅ Compliant: ${compliant.length} - ${compliant.join(', ') || 'None'}`);
  
  console.log('\n📋 Covenant Details:');
  contractCovenants.forEach(cov => {
    const status = cov.current_value < cov.threshold_value * 0.9 ? '❌' :
                   cov.current_value < cov.threshold_value ? '⚠️' : '✅';
    console.log(`   ${status} ${cov.covenant_name}: ${cov.current_value} vs ${cov.threshold_value}`);
  });
}

// Run tests
runTests()
  .then(() => testLocalAnalysis())
  .catch(console.error);
