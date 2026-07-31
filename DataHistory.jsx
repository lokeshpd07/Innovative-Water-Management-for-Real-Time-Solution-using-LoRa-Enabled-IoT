import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DataHistory() {
  const [history, setHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
 
  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('device_id')
        .order('device_id');

      if (!error && data) {
        const uniqueDevices = [...new Set(data.map(d => d.device_id))];
        setDevices(uniqueDevices);
        if (uniqueDevices.length > 0) {
          setSelectedDevice(uniqueDevices[0]);
        }
      }
    };

    fetchDevices();
  }, []);

  // Fetch history when device changes
  useEffect(() => {
    if (!selectedDevice) return;

    setLoading(true);

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('device_id', selectedDevice)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        // Reverse to show oldest first
        setHistory(data.reverse());
      }

      setLoading(false);
    };

    fetchHistory();

    // Subscribe to new data for this device
    const subscription = supabase
      .channel(`history_${selectedDevice}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data',
          filter: `device_id=eq.${selectedDevice}`
        },
        (payload) => {
          setHistory(prev => [...prev, payload.new]);
          // Keep only the last limit items
          if (prev.length > limit) {
            prev.shift();
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [selectedDevice, limit]);

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
            <option value="">Choose device...</option>
            {devices.map(device => (
              <option key={device} value={device}>
                {device}
              </option>
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
            <option value={500}>500</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading history...</p>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!loading && history.length > 0 && (
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
            <p>Showing {history.length} records from {selectedDevice}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && history.length === 0 && selectedDevice && (
        <div className="text-center py-8 bg-blue-50 rounded-lg border-2 border-blue-300">
          <p className="text-gray-600 text-lg">📭 No data for {selectedDevice}</p>
          <p className="text-sm text-gray-500 mt-2">
            Waiting for sensor readings...
          </p>
        </div>
      )}
    </div>
  );
}
