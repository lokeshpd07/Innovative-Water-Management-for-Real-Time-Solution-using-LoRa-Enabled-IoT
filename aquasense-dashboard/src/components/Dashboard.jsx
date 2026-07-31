import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ─── Thresholds for anomaly detection ────────────────────────────────────────
const THRESHOLDS = {
  flow:      { warning: 18,  critical: 22  },
  vibration: { warning: 1.5, critical: 2.2 },
  pressure:  { warning: 3.5, critical: 4.0 },
};

// ─── Initial base values per device ──────────────────────────────────────────
const BASES = {
  'flow-sensor-01':   { flow: 14.5, vibration: 0.40, pressure: 2.80, rssi: -87, snr: 7.25 },
  'pump-unit-02':     { flow: 9.0,  vibration: 1.90, pressure: 3.40, rssi: -72, snr: 10.50 },
  'pressure-node-03': { flow: 21.0, vibration: 0.30, pressure: 1.90, rssi: -95, snr: 4.80 },
};

const DEVICE_COLORS = {
  'flow-sensor-01':   '#3b82f6',
  'pump-unit-02':     '#f97316',
  'pressure-node-03': '#22c55e',
};

const DEVICE_ICONS = {
  'flow-sensor-01':   '💧',
  'pump-unit-02':     '⚙️',
  'pressure-node-03': '📊',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const jitter = (v, r) => +(v + (Math.random() * r * 2 - r)).toFixed(2);
const ts = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function makeReading(deviceId) {
  const b = BASES[deviceId];
  return {
    device_id:   deviceId,
    flow:        jitter(b.flow,      0.6),
    vibration:   jitter(b.vibration, 0.12),
    pressure:    jitter(b.pressure,  0.18),
    rssi:        b.rssi + Math.floor(Math.random() * 6 - 3),
    snr:         jitter(b.snr, 0.5),
    received_at: new Date().toISOString(),
  };
}

function getAlertLevel(metric, value) {
  const t = THRESHOLDS[metric];
  if (!t) return null;
  if (value >= t.critical) return 'critical';
  if (value >= t.warning)  return 'warning';
  return null;
}

function buildAlerts(readings) {
  const alerts = [];
  Object.values(readings).forEach(r => {
    ['flow', 'vibration', 'pressure'].forEach(m => {
      const level = getAlertLevel(m, r[m]);
      if (level) {
        alerts.push({
          id: `${r.device_id}-${m}`,
          device: r.device_id,
          metric: m,
          value: r[m],
          level,
          time: new Date(r.received_at).toLocaleTimeString(),
        });
      }
    });
  });
  return alerts;
}

// ─── Seed 30 historical points per device ────────────────────────────────────
function seedHistory() {
  const hist = {};
  Object.keys(BASES).forEach(id => {
    hist[id] = Array.from({ length: 30 }, (_, i) => {
      const b = BASES[id];
      const t = new Date(Date.now() - (30 - i) * 3000);
      return {
        time:      t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        flow:      jitter(b.flow,      0.6),
        vibration: jitter(b.vibration, 0.12),
        pressure:  jitter(b.pressure,  0.18),
      };
    });
  });
  return hist;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong> {unit}
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [readings,   setReadings]   = useState(() => {
    const r = {};
    Object.keys(BASES).forEach(id => { r[id] = makeReading(id); });
    return r;
  });
  const [history,    setHistory]    = useState(seedHistory);
  const [alerts,     setAlerts]     = useState([]);
  const [activeChart, setActiveChart] = useState('flow');
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const tickRef = useRef(0);

  // ── Live ticker every 2 s ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;

      setReadings(prev => {
        const updated = {};
        Object.keys(prev).forEach(id => { updated[id] = makeReading(id); });

        // Spike pump-unit-02 vibration every 15 ticks for demo drama
        if (tickRef.current % 15 === 0) {
          updated['pump-unit-02'].vibration = +(THRESHOLDS.vibration.critical + Math.random() * 0.3).toFixed(2);
        }
        // Spike flow-sensor-01 flow every 20 ticks
        if (tickRef.current % 20 === 0) {
          updated['flow-sensor-01'].flow = +(THRESHOLDS.flow.critical + Math.random() * 0.5).toFixed(2);
        }

        setAlerts(buildAlerts(updated));
        return updated;
      });

      setHistory(prev => {
        const next = { ...prev };
        const timeLabel = ts();
        Object.keys(BASES).forEach(id => {
          const b = BASES[id];
          const point = {
            time:      timeLabel,
            flow:      jitter(b.flow,      0.6),
            vibration: jitter(b.vibration, 0.12),
            pressure:  jitter(b.pressure,  0.18),
          };
          next[id] = [...prev[id].slice(-49), point];
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  // ── Chart series: all devices on one chart ─────────────────────────────────
  // Merge history by time index (they tick together)
  const chartData = (history['flow-sensor-01'] || []).map((pt, i) => {
    const row = { time: pt.time };
    Object.keys(BASES).forEach(id => {
      const h = history[id];
      if (h && h[i]) {
        row[`${id}_flow`]      = h[i].flow;
        row[`${id}_vibration`] = h[i].vibration;
        row[`${id}_pressure`]  = h[i].pressure;
      }
    });
    return row;
  });

  const metricConfig = {
    flow:      { label: 'Flow Rate',  unit: 'L/min', color: '#3b82f6', domain: [0, 30]  },
    vibration: { label: 'Vibration',  unit: 'm/s²',  color: '#f97316', domain: [0, 3]   },
    pressure:  { label: 'Pressure',   unit: 'bar',   color: '#22c55e', domain: [0, 5]   },
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Alert Banner ──────────────────────────────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map(a => (
            <div
              key={a.id}
              className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 shadow border ${
                a.level === 'critical'
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : 'bg-yellow-50 border-yellow-400 text-yellow-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{a.level === 'critical' ? '🚨' : '⚠️'}</span>
                <div>
                  <p className="font-bold text-sm capitalize">
                    {a.level.toUpperCase()} — {a.metric} anomaly on <span className="font-mono">{a.device}</span>
                  </p>
                  <p className="text-xs mt-0.5">
                    Value: <strong>{a.value}</strong> {metricConfig[a.metric]?.unit} &nbsp;·&nbsp; Detected at {a.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissedAlerts(prev => new Set([...prev, a.id]))}
                className="text-xs underline opacity-60 hover:opacity-100 shrink-0"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(readings).map(([id, r]) => {
          const hasAlert = visibleAlerts.some(a => a.device === id);
          return (
            <div
              key={id}
              className={`bg-white rounded-2xl shadow-md border-2 p-4 transition-all hover:shadow-lg ${
                hasAlert ? 'border-red-400' : 'border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{id}</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">
                    {DEVICE_ICONS[id]} {id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                </div>
                {hasAlert
                  ? <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full animate-pulse">ALERT</span>
                  : <span className="inline-block w-2.5 h-2.5 bg-green-400 rounded-full mt-1 animate-pulse"></span>
                }
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Flow', val: r.flow,      unit: 'L/min', metric: 'flow',      color: 'text-blue-600'  },
                  { label: 'Vibr', val: r.vibration, unit: 'm/s²',  metric: 'vibration', color: 'text-orange-500'},
                  { label: 'Pres', val: r.pressure,  unit: 'bar',   metric: 'pressure',  color: 'text-green-600' },
                ].map(({ label, val, unit, metric, color }) => {
                  const lvl = getAlertLevel(metric, val);
                  return (
                    <div
                      key={label}
                      className={`rounded-lg py-2 px-1 ${
                        lvl === 'critical' ? 'bg-red-50 ring-2 ring-red-400'
                        : lvl === 'warning' ? 'bg-yellow-50 ring-2 ring-yellow-400'
                        : 'bg-gray-50'
                      }`}
                    >
                      <p className={`text-xl font-black ${color}`}>{val}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
                      <p className="text-[9px] text-gray-300">{unit}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t flex justify-between text-xs text-gray-400">
                <span>📡 {r.rssi} dBm</span>
                <span>📶 SNR {r.snr} dB</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Chart Panel ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 md:p-6">
        {/* Tab selector */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-800">📈 Live Sensor Charts</h2>
          <div className="flex gap-2">
            {Object.entries(metricConfig).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setActiveChart(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeChart === key
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {Object.keys(BASES).map(id => (
                <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={DEVICE_COLORS[id]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={DEVICE_COLORS[id]} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              domain={metricConfig[activeChart].domain}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              unit={` ${metricConfig[activeChart].unit}`}
              width={70}
            />
            <Tooltip content={<CustomTooltip unit={metricConfig[activeChart].unit} />} />
            <Legend
              formatter={val => val.split('_')[0].replace(/-/g, ' ')}
              wrapperStyle={{ fontSize: 11 }}
            />
            {/* Threshold reference lines baked as extra lines */}
            {Object.keys(BASES).map(id => (
              <Area
                key={id}
                type="monotone"
                dataKey={`${id}_${activeChart}`}
                name={id}
                stroke={DEVICE_COLORS[id]}
                strokeWidth={2}
                fill={`url(#grad-${id})`}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        {/* Threshold legend */}
        <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap">
          <span>
            ⚠️ Warning threshold: <strong>{THRESHOLDS[activeChart].warning} {metricConfig[activeChart].unit}</strong>
          </span>
          <span>
            🚨 Critical threshold: <strong>{THRESHOLDS[activeChart].critical} {metricConfig[activeChart].unit}</strong>
          </span>
        </div>
      </div>

      {/* ── Alert Log Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 md:p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🔔 Active Alerts</h2>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-semibold">All systems normal</p>
            <p className="text-sm mt-1">No anomalies detected across all sensor nodes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left p-3 rounded-l-lg">Severity</th>
                  <th className="text-left p-3">Device</th>
                  <th className="text-left p-3">Metric</th>
                  <th className="text-right p-3">Value</th>
                  <th className="text-right p-3">Threshold</th>
                  <th className="text-right p-3">Time</th>
                  <th className="text-right p-3 rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleAlerts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        a.level === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.level === 'critical' ? '🚨' : '⚠️'} {a.level}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-700">{a.device}</td>
                    <td className="p-3 capitalize text-gray-700">{a.metric}</td>
                    <td className="p-3 text-right font-bold text-gray-900">
                      {a.value} <span className="text-gray-400 font-normal">{metricConfig[a.metric]?.unit}</span>
                    </td>
                    <td className="p-3 text-right text-gray-500">
                      &gt; {THRESHOLDS[a.metric][a.level]} {metricConfig[a.metric]?.unit}
                    </td>
                    <td className="p-3 text-right text-gray-400 text-xs">{a.time}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setDismissedAlerts(prev => new Set([...prev, a.id]))}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                      >
                        Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
