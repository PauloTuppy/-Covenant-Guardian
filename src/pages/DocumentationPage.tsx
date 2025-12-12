import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Database, Cpu, FileText, AlertTriangle, Settings, BookOpen } from 'lucide-react';

const DocumentationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <nav className="px-8 py-6 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Covenant Guardian</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
          <p className="text-gray-400 text-lg">Complete guide to Covenant Guardian - AI-powered loan covenant monitoring system</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <a href="#overview" className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-primary transition-colors">
            <BookOpen className="h-6 w-6 text-primary mb-2" />
            <h3 className="text-white font-semibold">Overview</h3>
            <p className="text-gray-400 text-sm">System architecture & features</p>
          </a>
          <a href="#api" className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-primary transition-colors">
            <Database className="h-6 w-6 text-green-400 mb-2" />
            <h3 className="text-white font-semibold">API Reference</h3>
            <p className="text-gray-400 text-sm">Endpoints & data models</p>
          </a>
          <a href="#ai" className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-primary transition-colors">
            <Cpu className="h-6 w-6 text-purple-400 mb-2" />
            <h3 className="text-white font-semibold">AI Agent</h3>
            <p className="text-gray-400 text-sm">Gemini integration guide</p>
          </a>
        </div>

        {/* Overview Section */}
        <section id="overview" className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Overview
          </h2>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">What is Covenant Guardian?</h3>
            <p className="text-gray-300 mb-4">
              Covenant Guardian is an AI-powered loan covenant monitoring and compliance system built for financial institutions. 
              It provides real-time tracking of loan covenants, automated breach detection, and intelligent risk assessment.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-4 bg-gray-900 rounded-lg">
                <div className="text-3xl font-bold text-primary">3</div>
                <div className="text-gray-400 text-sm">Contracts</div>
              </div>
              <div className="text-center p-4 bg-gray-900 rounded-lg">
                <div className="text-3xl font-bold text-green-400">9</div>
                <div className="text-gray-400 text-sm">Covenants</div>
              </div>
              <div className="text-center p-4 bg-gray-900 rounded-lg">
                <div className="text-3xl font-bold text-yellow-400">2</div>
                <div className="text-gray-400 text-sm">Warnings</div>
              </div>
              <div className="text-center p-4 bg-gray-900 rounded-lg">
                <div className="text-3xl font-bold text-red-400">2</div>
                <div className="text-gray-400 text-sm">Breaches</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Architecture</h3>
            <pre className="text-gray-300 text-sm overflow-x-auto bg-gray-900 p-4 rounded-lg">
{`┌─────────────────────────────────────────────────────┐
│                 FRONTEND (React)                     │
│   Dashboard │ Contracts │ Alerts │ Reports          │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴───────────────────────────┐
│                   XANO BACKEND                       │
│   REST API  │  AI Agent  │  PostgreSQL Database     │
│                    │                                 │
│              Gemini AI (Free Credits)               │
└─────────────────────────────────────────────────────┘`}
            </pre>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Tech Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'React 18', desc: 'Frontend Framework', color: 'text-blue-400' },
              { name: 'TypeScript', desc: 'Type Safety', color: 'text-blue-300' },
              { name: 'Vite', desc: 'Build Tool', color: 'text-purple-400' },
              { name: 'TailwindCSS', desc: 'Styling', color: 'text-cyan-400' },
              { name: 'Xano', desc: 'Backend & Database', color: 'text-green-400' },
              { name: 'Gemini AI', desc: 'AI Analysis', color: 'text-yellow-400' },
            ].map((tech) => (
              <div key={tech.name} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className={`font-semibold ${tech.color}`}>{tech.name}</div>
                <div className="text-gray-400 text-sm">{tech.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* API Reference */}
        <section id="api" className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Database className="h-6 w-6 text-green-400" />
            API Reference
          </h2>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Base URL</h3>
            <code className="text-green-400 bg-gray-900 px-3 py-1 rounded">
              https://xue3-u0pk-dusa.n7e.xano.io/api:WV7ozm8p
            </code>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Endpoint</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Method</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {[
                  { endpoint: '/contracts', method: 'GET', desc: 'List all contracts' },
                  { endpoint: '/contracts', method: 'POST', desc: 'Create new contract' },
                  { endpoint: '/contracts/{id}', method: 'PATCH', desc: 'Update contract' },
                  { endpoint: '/covenants', method: 'GET', desc: 'List all covenants' },
                  { endpoint: '/covenants/{id}', method: 'PATCH', desc: 'Update covenant' },
                  { endpoint: '/banks', method: 'GET', desc: 'List all banks' },
                  { endpoint: '/alerts', method: 'GET', desc: 'List alerts' },
                  { endpoint: '/covenant_health', method: 'GET', desc: 'Get health metrics' },
                  { endpoint: '/portfolio_summary', method: 'GET', desc: 'Portfolio summary' },
                ].map((api) => (
                  <tr key={api.endpoint + api.method}>
                    <td className="px-4 py-3 font-mono text-sm text-gray-300">{api.endpoint}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        api.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                        api.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {api.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{api.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Demo Data */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" />
            Demo Data
          </h2>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Contracts</h3>
              <div className="space-y-3">
                {[
                  { name: 'Term Loan Facility - Acme Corp', status: 'active', amount: '$5,000,000' },
                  { name: 'Revolving Credit - Tech Innovations', status: 'watch', amount: '$2,500,000' },
                  { name: 'Equipment Finance - Global Manufacturing', status: 'active', amount: '$8,000,000' },
                ].map((contract) => (
                  <div key={contract.name} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300">{contract.name}</span>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        contract.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {contract.status}
                      </span>
                      <span className="text-gray-400">{contract.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Covenants</h3>
              <div className="space-y-2">
                {[
                  { name: 'Debt/EBITDA Ratio', status: 'compliant', current: '2.8', threshold: '≤ 3.5' },
                  { name: 'Current Ratio', status: 'breached', current: '0.95', threshold: '≥ 1.25' },
                  { name: 'Interest Coverage', status: 'compliant', current: '3.2', threshold: '≥ 2.5' },
                  { name: 'Maximum Leverage', status: 'warning', current: '3.85', threshold: '≤ 4.0' },
                  { name: 'Quick Ratio', status: 'breached', current: '0.85', threshold: '≥ 1.0' },
                ].map((cov) => (
                  <div key={cov.name} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                    <span className="text-gray-300">{cov.name}</span>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        cov.status === 'compliant' ? 'bg-green-500/20 text-green-400' :
                        cov.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {cov.status === 'compliant' ? '✓' : cov.status === 'warning' ? '⚠' : '✗'} {cov.status}
                      </span>
                      <span className="text-gray-400 font-mono text-sm">{cov.current} / {cov.threshold}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* AI Agent */}
        <section id="ai" className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-purple-400" />
            AI Agent Configuration
          </h2>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-gray-400 text-sm">Model Host</div>
                <div className="text-white font-medium">Xano Test Model (Free Gemini)</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-gray-400 text-sm">Temperature</div>
                <div className="text-white font-medium">0.2 (Deterministic)</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-gray-400 text-sm">Max Steps</div>
                <div className="text-white font-medium">5</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="text-gray-400 text-sm">Connected Tools</div>
                <div className="text-white font-medium">get_covenant_data</div>
              </div>
            </div>
            
            <h4 className="text-white font-medium mb-2">Capabilities</h4>
            <ul className="text-gray-300 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Automated covenant compliance analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Breach detection and risk scoring
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Intelligent recommendations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Contract document extraction
              </li>
            </ul>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
            Troubleshooting
          </h2>
          
          <div className="space-y-4">
            {[
              { q: 'API returns 404', a: 'Check endpoint path matches Xano configuration. Verify API group ID in URL (api:WV7ozm8p)' },
              { q: 'Empty data in dashboard', a: 'Verify Xano database has seeded data. Check browser console for API errors.' },
              { q: 'AI Agent not responding', a: 'Verify agent is published (not DRAFT). Check Xano Test Model is selected.' },
            ].map((item) => (
              <div key={item.q} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-2">{item.q}</h4>
                <p className="text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="h-6 w-6 text-gray-400" />
            Quick Start
          </h2>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <pre className="text-gray-300 text-sm overflow-x-auto">
{`# Clone repository
git clone <repository-url>
cd covenant-guardian

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev

# Open browser
http://localhost:3000`}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm pt-8 border-t border-gray-800">
          <p>Covenant Guardian v1.0.0 | Built for LMA Edge Hackathon 2024</p>
        </div>
      </main>
    </div>
  );
};

export default DocumentationPage;
