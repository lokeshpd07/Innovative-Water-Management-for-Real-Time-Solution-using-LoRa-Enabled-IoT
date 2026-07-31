import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Anomaly Detection Logic
 * Detects issues in Flow, Pressure, and Vibration sensors
 */

function calculateThresholds(stats) {
  return {
    flow_min: Math.max(0, stats.flow.mean - 2 * stats.flow.std),
    flow_max: stats.flow.mean + 2 * stats.flow.std,
    flow_sudden_drop: stats.flow.mean * 0.5,
    
    pressure_min: stats.pressure.mean - 2 * stats.pressure.std,
    pressure_max: stats.pressure.mean + 2 * stats.pressure.std,
    pressure_spike: stats.pressure.mean + 3 * stats.pressure.std,
    
    vibration_normal: stats.vibration.mean + 2 * stats.vibration.std,
    vibration_high: stats.vibration.mean + 3 * stats.vibration.std,
    vibration_critical: stats.vibration.mean + 4 * stats.vibration.std,
  };
}

function detectAnomaly(reading, thresholds) {
  const { flow, pressure, vibration } = reading;
  
  let anomalyInfo = {
    is_anomaly: false,
    anomaly_type: null,
    severity: 'normal', // normal, warning, critical
    details: {},
    timestamp: new Date().toISOString(),
  };
  
  // Check Flow Anomalies
  if (flow < thresholds.flow_min) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'Low Flow / Blockage';
    anomalyInfo.severity = 'critical';
    anomalyInfo.details.flow = `Below normal: ${flow.toFixed(2)} L/min`;
  }
  
  if (flow > thresholds.flow_max) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'Excessive Flow';
    anomalyInfo.severity = 'warning';
    anomalyInfo.details.flow = `Above normal: ${flow.toFixed(2)} L/min`;
  }
  
  // Check Pressure Anomalies
  if (pressure > thresholds.pressure_spike) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'Pipe Blockage / Clog';
    anomalyInfo.severity = 'critical';
    anomalyInfo.details.pressure = `Excessive pressure: ${pressure.toFixed(2)} bar`;
  }
  
  if (pressure < thresholds.pressure_min) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'Leak / Low Pressure';
    anomalyInfo.severity = 'critical';
    anomalyInfo.details.pressure = `Low pressure: ${pressure.toFixed(2)} bar`;
  }
  
  // Check Vibration Anomalies
  if (vibration > thresholds.vibration_critical) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'Pump Bearing Wear (Critical)';
    anomalyInfo.severity = 'critical';
    anomalyInfo.details.vibration = `Critical vibration: ${vibration.toFixed(0)} units`;
  } else if (vibration > thresholds.vibration_high) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'Pump Wear / Cavitation';
    anomalyInfo.severity = 'warning';
    anomalyInfo.details.vibration = `High vibration: ${vibration.toFixed(0)} units`;
  }
  
  // Multivariate anomaly detection
  if (flow < thresholds.flow_min && pressure > thresholds.pressure_spike) {
    anomalyInfo.is_anomaly = true;
    anomalyInfo.anomaly_type = 'System Blockage (High Pressure + Low Flow)';
    anomalyInfo.severity = 'critical';
  }
  
  return anomalyInfo;
}

async function getHistoricalStats(deviceId, lookback = 100) {
  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('flow, pressure, vibration')
      .eq('device_id', deviceId)
      .order('received_at', { ascending: false })
      .limit(lookback);

    if (error) throw error;

    if (!data || data.length === 0) {
      return null;
    }

    // Calculate statistics
    const flows = data.map(d => d.flow || 0);
    const pressures = data.map(d => d.pressure || 0);
    const vibrations = data.map(d => d.vibration || 0);

    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = (arr) => {
      const m = mean(arr);
      const variance = arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length;
      return Math.sqrt(variance);
    };

    return {
      flow: { mean: mean(flows), std: std(flows) },
      pressure: { mean: mean(pressures), std: std(pressures) },
      vibration: { mean: mean(vibrations), std: std(vibrations) },
    };
  } catch (error) {
    console.error('Error getting historical stats:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { device_id, flow, pressure, vibration } = req.body;

    if (!device_id || flow === undefined || pressure === undefined || vibration === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get historical data to calculate thresholds
    const stats = await getHistoricalStats(device_id);

    let anomalyResult = {
      is_anomaly: false,
      anomaly_type: null,
      severity: 'normal',
      details: {},
    };

    if (stats) {
      const thresholds = calculateThresholds(stats);
      const reading = { flow, pressure, vibration };
      anomalyResult = detectAnomaly(reading, thresholds);
    }

    // Store anomaly alert if detected
    if (anomalyResult.is_anomaly) {
      const { error: insertError } = await supabase
        .from('anomaly_alerts')
        .insert([
          {
            device_id,
            anomaly_type: anomalyResult.anomaly_type,
            severity: anomalyResult.severity,
            flow,
            pressure,
            vibration,
            details: anomalyResult.details,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error('Error storing anomaly alert:', insertError);
      }
    }

    return res.status(200).json({
      success: true,
      device_id,
      anomaly_detected: anomalyResult.is_anomaly,
      anomaly: anomalyResult,
    });
  } catch (error) {
    console.error('[Anomaly Detection Error]', error);
    return res.status(500).json({
      error: error.message,
      type: error.name,
    });
  }
}
