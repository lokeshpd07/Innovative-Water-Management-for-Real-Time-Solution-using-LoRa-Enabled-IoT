import { useState, useEffect } from 'react';

// ── Static demo data ────────────────────────────────────────────────────────
const DEMO_READINGS = {
  'flow-sensor-01': {
    device_id: 'flow-sensor-01',
    flow: 14.73,
    vibration: 0.42,
    pressure: 2.81,
    rssi: -87,
    snr: 7.25,
    received_at: new Date(Date.now() - 45_000).toISOString(), // 45 s ago
  },
  'pump-unit-02': {
    device_id: 'pump-unit-02',
    flow: 9.18,
    vibration: 1.97,
    pressure: 3.44,
    rssi: -72,
    snr: 10.50,
    received_at: new Date(Date.now() - 120_000).toISOString(), // 2 min ago
  },
  'pressure-node-03': {
    device_id: 'pressure-node-03',
    flow: 21.05,
    vibration: 0.31,
    pressure: 1.92,
    rssi: -95,
    snr: 4.80,
    received_at: new Date(Date.now() - 30_000).toISOString(), // 30 s ago
  },
};

// ── Simulate live updates by slightly randomising values every 3 s ──────────
function jitter(value, range = 0.5) {
  return +(value + (Math.random() * range * 2 - range)).toFixed(2);
}

export default function Dashboard() {
  const [latestReadings, setLatestReadings] = useState(DEMO_READINGS);

  // Simulate live sensor ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setLatestReadings(prev => {
        const updated = {};
        Object.entries(prev).forEach(([id, r]) => {
          updated[id] = {
            ...r,
            flow: jitter(r.flow, 0.3),
            vibration: jitter(r.vibration, 0.05),
            pressure: jitter(r.pressure, 0.1),
            received_at: new Date().toISOString(),
          };
        });
        return updated;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">🌊 AquaSense IMS Dashboard</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="capitalize text-gray-600">Demo Mode</span>
        </div>
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(latestReadings).map(([deviceId, reading]) => (
          <SensorCard key={deviceId} deviceId={deviceId} reading={reading} />
        ))}
      </div>
    </div>
  );
}

// ── Sensor Card Component ────────────────────────────────────────────────────
function SensorCard({ deviceId, reading }) {
  const getDeviceIcon = (id) => {
    if (id.toLowerCase().includes('flow')) return '💧';
    if (id.toLowerCase().includes('pump') || id.toLowerCase().includes('vibration')) return '📊';
    if (id.toLowerCase().includes('pressure')) return '⚙️';
    return '📡';
  };

  const isStale = () => {
    const receivedTime = new Date(reading.received_at).getTime();
    const now = new Date().getTime();
    return (now - receivedTime) > 5 * 60 * 1000; // 5 minutes
  };

  const staleClass = isStale() ? 'opacity-60 border-yellow-400' : 'border-blue-400';

  return (
    <div className={`bg-white border-2 ${staleClass} rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow`}>
      {/* Device Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-blue-800">
            {getDeviceIcon(deviceId)} {deviceId.toUpperCase()}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Device ID: {deviceId}</p>
        </div>
        {isStale() && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
            Stale
          </span>
        )}
      </div>

      {/* Sensor Readings */}
      <div className="space-y-3 mb-4">
        {/* Flow */}
        <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
          <span className="font-semibold text-gray-700">Flow Rate</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {reading.flow !== null ? reading.flow.toFixed(2) : '—'}
            </div>
            <div className="text-xs text-gray-500">L/min</div>
          </div>
        </div>

        {/* Vibration */}
        <div className="flex justify-between items-center bg-orange-50 p-3 rounded">
          <span className="font-semibold text-gray-700">Vibration</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">
              {reading.vibration !== null ? reading.vibration.toFixed(2) : '—'}
            </div>
            <div className="text-xs text-gray-500">m/s²</div>
          </div>
        </div>

        {/* Pressure */}
        <div className="flex justify-between items-center bg-green-50 p-3 rounded">
          <span className="font-semibold text-gray-700">Pressure</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {reading.pressure !== null ? reading.pressure.toFixed(2) : '—'}
            </div>
            <div className="text-xs text-gray-500">bar</div>
          </div>
        </div>
      </div>

      {/* Signal Quality */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">📡 RSSI</span>
          <span className="font-semibold">{reading.rssi || '—'} dBm</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">📶 SNR</span>
          <span className="font-semibold">
            {reading.snr !== null ? reading.snr.toFixed(2) : '—'} dB
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="border-t mt-3 pt-3 text-xs text-gray-500">
        <p className="font-semibold">
          🕐 {new Date(reading.received_at).toLocaleTimeString()}
        </p>
        <p>{new Date(reading.received_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
