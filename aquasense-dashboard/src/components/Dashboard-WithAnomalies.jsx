import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [latestReadings, setLatestReadings] = useState({});
  const [anomalies, setAnomalies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    const fetchLatestReadings = async () => {
      try {
        setConnectionStatus('loading');

        const { data, error } = await supabase
          .from('sensor_data')
          .select('*')
          .order('received_at', { ascending: false })
          .limit(100);

        if (error) throw error;

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
      .subscribe();

    // Subscribe to anomaly alerts
    const anomalySubscription = supabase
      .channel('anomaly_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anomaly_alerts'
        },
        (payload) => {
          const alert = payload.new;
          setAnomalies(prev => ({
            ...prev,
            [alert.device_id]: alert
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      anomalySubscription.unsubscribe();
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
        <div>
          <h1 className="text-3xl font-bold text-blue-800">🌊 AquaSense IMS Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Real-time Monitoring & Predictive Maintenance</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {getStatusIndicator()}
          <span className="capitalize text-gray-600">{connectionStatus}</span>
        </div>
      </div>

      {/* Anomaly Summary */}
      {Object.keys(anomalies).length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="font-bold text-red-800">Active Anomalies Detected</h3>
              <p className="text-sm text-red-700">
                {Object.keys(anomalies).length} device(s) with alerts - Check details below
              </p>
            </div>
          </div>
        </div>
      )}

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
            <SensorCard 
              key={deviceId} 
              deviceId={deviceId} 
              reading={reading}
              anomaly={anomalies[deviceId]}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Enhanced Sensor Card Component with Anomaly Badge
function SensorCard({ deviceId, reading, anomaly }) {
  const getDeviceIcon = (id) => {
    if (id.toLowerCase().includes('flow')) return '💧';
    if (id.toLowerCase().includes('vibration')) return '📊';
    if (id.toLowerCase().includes('pressure')) return '⚙️';
    return '📡';
  };

  const isStale = () => {
    const receivedTime = new Date(reading.received_at).getTime();
    const now = new Date().getTime();
    return (now - receivedTime) > 5 * 60 * 1000;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default: return 'border-blue-400';
    }
  };

  const staleClass = isStale() ? 'opacity-60 border-yellow-400' : 'border-blue-400';
  const anomalyBorder = anomaly ? getSeverityColor(anomaly.severity) : '';

  return (
    <div className={`bg-white border-2 ${staleClass} ${anomalyBorder} rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow relative`}>
      {/* Anomaly Badge */}
      {anomaly && (
        <div className={`absolute top-0 right-0 w-full rounded-t-lg p-2 ${
          anomaly.severity === 'critical' 
            ? 'bg-red-500 text-white' 
            : 'bg-yellow-500 text-white'
        }`}>
          <div className="text-sm font-bold flex items-center gap-1">
            <span>{anomaly.severity === 'critical' ? '🚨' : '⚠️'}</span>
            {anomaly.anomaly_type}
          </div>
        </div>
      )}

      {/* Device Header */}
      <div className={`flex justify-between items-start ${anomaly ? 'mt-12' : 'mb-4'}`}>
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
        <MetricBox 
          label="Flow Rate" 
          value={reading.flow} 
          unit="L/min"
          color="blue"
          highlight={anomaly?.anomaly_type?.includes('Flow')}
        />

        {/* Vibration */}
        <MetricBox 
          label="Vibration" 
          value={reading.vibration} 
          unit="units"
          color="orange"
          highlight={anomaly?.anomaly_type?.includes('Pump')}
        />

        {/* Pressure */}
        <MetricBox 
          label="Pressure" 
          value={reading.pressure} 
          unit="bar"
          color="green"
          highlight={anomaly?.anomaly_type?.includes('Blockage') || anomaly?.anomaly_type?.includes('Leak')}
        />
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

// Reusable Metric Box Component
function MetricBox({ label, value, unit, color, highlight }) {
  const colorMap = {
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    green: 'bg-green-50',
  };

  const textColorMap = {
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
  };

  return (
    <div className={`flex justify-between items-center ${colorMap[color]} p-3 rounded ${highlight ? 'ring-2 ring-red-500' : ''}`}>
      <span className="font-semibold text-gray-700">{label}</span>
      <div className="text-right">
        <div className={`text-2xl font-bold ${textColorMap[color]}`}>
          {value !== null ? value.toFixed(2) : '—'}
        </div>
        <div className="text-xs text-gray-500">{unit}</div>
      </div>
    </div>
  );
}
