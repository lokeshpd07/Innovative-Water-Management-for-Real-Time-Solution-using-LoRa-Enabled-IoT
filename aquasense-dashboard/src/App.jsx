import { useState } from 'react';
import Dashboard from './components/Dashboard';
import DataHistory from './components/DataHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50">
      {/* ── Demo Notice Banner ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-amber-400 text-amber-900 text-center text-sm font-semibold py-2 px-4 shadow-md flex items-center justify-center gap-2">
        <span>🧪</span>
        <span>
          This is a <strong>demo version</strong> of AquaSense IMS — all sensor readings are simulated and do not reflect real device data.
        </span>
        <span>🧪</span>
      </div>

      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-3xl">🌊</div>
              <div>
                <h1 className="text-2xl font-bold">AquaSense IMS</h1>
                <p className="text-xs text-blue-200">LoRa Water Management System</p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'live'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-blue-500 hover:bg-blue-400 text-white'
                }`}
              >
                📊 Live Dashboard
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-blue-500 hover:bg-blue-400 text-white'
                }`}
              >
                📈 History
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'live' && <Dashboard />}
        {activeTab === 'history' && <DataHistory />}
      </main>

      {/* Footer */}
      <footer className="bg-blue-800 text-white mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">
            AquaSense IMS powered by TTN • Supabase • Vercel
          </p>
          <p className="text-xs text-blue-300 mt-1">
            Real-time water management monitoring system
          </p>
        </div>
      </footer>
    </div>
  );
}
