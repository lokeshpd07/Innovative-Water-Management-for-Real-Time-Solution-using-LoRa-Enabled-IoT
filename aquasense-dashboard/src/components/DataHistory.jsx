import { useState } from 'react';

// ── Static demo history data ─────────────────────────────────────────────────
const DEMO_DEVICES = ['flow-sensor-01', 'pump-unit-02', 'pressure-node-03'];

function generateHistory(deviceId, count = 50) {
  const base = {
    'flow-sensor-01':     { flow: 14.5, vibration: 0.40, pressure: 2.80, rssi: -87, snr: 7.25 },
    'pump-unit-02':       { flow: 9.0,  vibration: 1.90, pressure: 3.40, rssi: -72, snr: 10.50 },
    'pressure-node-03':   { flow: 21.0, vibration: 0.30, pressure: 1.90, rssi: -95, snr: 4.80 },
  }[deviceId] ?? { flow: 10, vibration: 0.5, pressure: 2.0, rssi: -80, snr: 8.0 };

  return Array.from({ length: count }, (_, i) => {
    const t = new Date(Date.now() - (count - i) * 60_000); // one entry per minute
    const jitter = (v, r) => +(v + (Math.random() * r * 2 - r)).toFixed(2);
    return {
      id: `${deviceId}-${i}`,
      device_id: deviceId,
      received_at: t.toISOString(),
      flow: jitter(base.flow, 0.5),
      vibration: jitter(base.vibration, 0.08),
      pressure: jitter(base.pressure, 0.15),
      rssi: base.rssi + Math.floor(Math.random() * 5 - 2),
      snr: jitter(base.snr, 0.4),
    };
  });
}

export default function DataHistory() {
  const [selectedDevice, setSelectedDevice] = useState(DEMO_DEVICES[0]);
  const [limit, setLimit] = useState(50);

  const history = generateHistory(selectedDevice, limit);

  return (
    <div className="p-6">
      {/* Header */}
      <h2 className="text-3xl font-bold text-blue-800 mb-6">📈 Data History</h2>

      {/* Controls */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Device
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600"
          >
            {DEMO_DEVICES.map(device => (
              <option key={device} value={device}>{device}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Show last N readings
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-4 py-2 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600"
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-gray-300 p-3 text-left">Time</th>
              <th className="border border-gray-300 p-3 text-right">Flow (L/min)</th>
              <th className="border border-gray-300 p-3 text-right">Vibration (m/s²)</th>
              <th className="border border-gray-300 p-3 text-right">Pressure (bar)</th>
              <th className="border border-gray-300 p-3 text-right">RSSI (dBm)</th>
              <th className="border border-gray-300 p-3 text-right">SNR (dB)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((reading, idx) => (
              <tr
                key={reading.id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'}
              >
                <td className="border border-gray-300 p-3 whitespace-nowrap text-sm">
                  <div className="font-semibold">
                    {new Date(reading.received_at).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(reading.received_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="border border-gray-300 p-3 text-right font-mono">
                  {reading.flow !== null ? reading.flow.toFixed(2) : '—'}
                </td>
                <td className="border border-gray-300 p-3 text-right font-mono">
                  {reading.vibration !== null ? reading.vibration.toFixed(2) : '—'}
                </td>
                <td className="border border-gray-300 p-3 text-right font-mono">
                  {reading.pressure !== null ? reading.pressure.toFixed(2) : '—'}
                </td>
                <td className="border border-gray-300 p-3 text-right font-mono">
                  {reading.rssi !== null ? reading.rssi : '—'}
                </td>
                <td className="border border-gray-300 p-3 text-right font-mono">
                  {reading.snr !== null ? reading.snr.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Info */}
        <div className="mt-4 text-sm text-gray-600">
          <p>Showing {history.length} simulated records from <strong>{selectedDevice}</strong></p>
        </div>
      </div>
    </div>
  );
}
