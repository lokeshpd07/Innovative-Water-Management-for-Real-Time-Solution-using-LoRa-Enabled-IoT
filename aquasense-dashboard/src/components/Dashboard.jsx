import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [latestReadings, setLatestReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Fetch initial data
    const fetchLatestReadings = async () => {
      try {
        setConnectionStatus('loading');

        // Get last reading from each device
        const { data, error } = await supabase
          .from('sensor_data')
          .select('*')
          .order('received_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Group by device_id to get latest per device
        const grouped = {};
        data.forEach(reading => {
          if (!grouped[reading.device_id]) {
            grouped[reading.device_id] = reading;
          }
        });

        setLatestReadings(grouped);
        setConnectionStatus('connected');
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setConnectionStatus('error');
        setLoading(false);
      }
    };

    fetchLatestReadings();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('sensor_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data'
        },
        (payload) => {
          const newReading = payload.new;
          setLatestReadings(prev => ({
            ...prev,
            [newReading.device_id]: newReading
          }));
          setConnectionStatus('connected');
        }
      )
      .on('error', (error) => {
        console.error('Subscription error:', error);
        setConnectionStatus('error');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active');
        }
      });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>;
      case 'loading':
        return <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>;
      case 'error':
        return <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>;
      default:
        return <span className="inline-block w-3 h-3 bg-gray-500 rounded-full"></span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading sensors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-400 rounded-lg">
        <h2 className="text-red-800 font-bold text-lg">⚠️ Connection Error</h2>
        <p className="text-red-700 mt-2">{error}</p>
        <p className="text-sm text-red-600 mt-2">
          Make sure Supabase credentials are correct in .env file
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">🌊 AquaSense IMS Dashboard</h1>
        <div className="flex items-center gap-2 text-sm">
          {getStatusIndicator()}
          <span className="capitalize text-gray-600">{connectionStatus}</span>
        </div>
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(latestReadings).length === 0 ? (
          <div className="col-span-full p-8 text-center bg-blue-50 rounded-lg border-2 border-blue-300">
            <p className="text-gray-600 text-lg">
              ⏳ Waiting for sensor data from TTN...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure your devices are sending data and webhook is configured.
            </p>
          </div>
        ) : (
          Object.entries(latestReadings).map(([deviceId, reading]) => (
            <SensorCard key={deviceId} deviceId={deviceId} reading={reading} />
          ))
        )}
      </div>
    </div>
  );
}

// Sensor Card Component
function SensorCard({ deviceId, reading }) {
  const getDeviceIcon = (id) => {
    if (id.toLowerCase().includes('flow')) return '💧';
    if (id.toLowerCase().includes('vibration')) return '📊';
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
