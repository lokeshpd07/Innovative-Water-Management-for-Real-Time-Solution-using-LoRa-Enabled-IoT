-- Create the anomaly_alerts table for storing detected anomalies

CREATE TABLE anomaly_alerts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  device_id TEXT NOT NULL,
  anomaly_type TEXT,
  severity TEXT, -- 'normal', 'warning', 'critical'
  flow NUMERIC(10,2),
  pressure NUMERIC(10,2),
  vibration INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable real-time for anomaly alerts
ALTER PUBLICATION supabase_realtime ADD TABLE anomaly_alerts;

-- Create indexes for fast queries
CREATE INDEX idx_anomaly_device_id ON anomaly_alerts(device_id);
CREATE INDEX idx_anomaly_severity ON anomaly_alerts(severity);
CREATE INDEX idx_anomaly_created_at ON anomaly_alerts(created_at DESC);

-- Create a view for recent critical anomalies
CREATE VIEW recent_critical_anomalies AS
SELECT 
  device_id,
  anomaly_type,
  severity,
  flow,
  pressure,
  vibration,
  details,
  created_at
FROM anomaly_alerts
WHERE severity = 'critical'
ORDER BY created_at DESC
LIMIT 50;
