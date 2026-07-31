# 🚨 Predictive Maintenance ML System - Setup Guide

## Overview
This system detects anomalies in Flow, Pressure, and Vibration sensors using intelligent threshold-based anomaly detection.

**Anomalies Detected:**
- ✅ Low Flow / Pipe Blockage
- ✅ High Pressure / Clogs
- ✅ Low Pressure / Leaks
- ✅ High Vibration / Pump Wear
- ✅ System Blockage (combined indicators)

---

## Step 1: Create Anomaly Alerts Table

Go to **Supabase Console** → **SQL Editor** → Create New Query

Copy and run this SQL:

```sql
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

ALTER PUBLICATION supabase_realtime ADD TABLE anomaly_alerts;

CREATE INDEX idx_anomaly_device_id ON anomaly_alerts(device_id);
CREATE INDEX idx_anomaly_severity ON anomaly_alerts(severity);
CREATE INDEX idx_anomaly_created_at ON anomaly_alerts(created_at DESC);
```

✅ Table created!

---

## Step 2: Add Anomaly Detection API to Backend

Copy `api/anomaly-detection.js` to your Vercel backend folder:

```
your-backend/
├── api/
│   ├── ttn-webhook.js
│   ├── health.js
│   └── anomaly-detection.js  ← ADD THIS
└── package.json
```

Then redeploy:

```powershell
vercel --prod
```

Your API endpoint: `https://waterr-eight.vercel.app/api/anomaly-detection`

---

## Step 3: Update TTN Webhook to Call Anomaly Detection

Edit your TTN webhook configuration to call anomaly detection after storing data.

Or modify `ttn-webhook.js` to call the anomaly detection endpoint:

```javascript
// After storing sensor data in Supabase:
const anomalyResponse = await fetch('https://your-vercel-url/api/anomaly-detection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_id: deviceId,
    flow: sensorReading.flow,
    pressure: sensorReading.pressure,
    vibration: sensorReading.vibration,
  })
});

const anomaly = await anomalyResponse.json();
console.log('Anomaly detection result:', anomaly);
```

---

## Step 4: Update Dashboard to Show Alerts

Replace your current Dashboard.jsx with `Dashboard-WithAnomalies.jsx`:

```bash
cp Dashboard-WithAnomalies.jsx src/components/Dashboard.jsx
```

Then redeploy your React dashboard:

```powershell
cd aquasense-dashboard
npm run build
vercel --prod
```

---

## Step 5: Test the System

### Local Testing

Run the Python script to understand the anomaly detection:

```bash
python anomaly_detector.py
```

Output:
```
📊 Thresholds calculated:
{
  "flow_min": 10.5,
  "flow_max": 14.2,
  ...
}

🚨 Anomaly Detection Results:
  Reading 3: Low Flow / Blockage [CRITICAL]
  Reading 6: Excessive Flow [WARNING]

📈 Report:
{
  "total_readings": 8,
  "anomaly_count": 2,
  "anomaly_rate": "25.0%",
  "critical_count": 1,
  "warning_count": 1
}
```

### Real-World Testing

Once your Arduino UNO sends data:

1. **Check Supabase** → `anomaly_alerts` table
2. **Open Dashboard** → Should show:
   - 🚨 Red badge for CRITICAL anomalies
   - ⚠️ Yellow badge for WARNING anomalies
   - Red ring around affected metrics
   - Anomaly details

---

## Anomaly Types & Thresholds

### 🚰 Flow Anomalies

| Condition | Severity | Action |
|-----------|----------|--------|
| Flow < mean - 2σ | 🔴 CRITICAL | Check for blockage/clog |
| Flow > mean + 2σ | 🟡 WARNING | Monitor system pressure |

**Interpretation:**
- Low flow + High pressure = **BLOCKAGE**
- Low flow + Low pressure = **LEAK**

### ⚙️ Pressure Anomalies

| Condition | Severity | Action |
|-----------|----------|--------|
| Pressure > mean + 3σ | 🔴 CRITICAL | System blockage suspected |
| Pressure < mean - 2σ | 🔴 CRITICAL | Possible leak |

### 📊 Vibration Anomalies

| Condition | Severity | Action |
|-----------|----------|--------|
| Vibration > mean + 4σ | 🔴 CRITICAL | Bearing wear - URGENT maintenance |
| Vibration > mean + 3σ | 🟡 WARNING | Pump cavitation/wear starting |

---

## How It Works

### Threshold Calculation

When the first data arrives:

1. System **fetches last 100 readings** from Supabase
2. **Calculates mean & std dev** for each sensor
3. **Sets smart thresholds** using statistical bounds:
   - Normal range: mean ± 2σ
   - Warning: mean + 3σ
   - Critical: mean + 4σ

### Real-Time Detection

For each new reading:

1. **Compares against thresholds**
2. **Detects anomaly type** (if any)
3. **Sets severity level**
4. **Stores in `anomaly_alerts` table**
5. **Dashboard shows badge immediately** (real-time subscription)

---

## Files You Need

```
d:\waterr\
├── anomaly_detector.py                 # ML logic (Python)
├── api/
│   └── anomaly-detection.js            # API endpoint
├── aquasense-dashboard/
│   └── src/components/
│       ├── Dashboard.jsx               # OLD - Replace with below
│       └── Dashboard-WithAnomalies.jsx # NEW - Rename to Dashboard.jsx
└── create_anomaly_alerts_table.sql     # SQL for Supabase
```

---

## Troubleshooting

### Dashboard shows "Invalid API key"
- Check `.env` file has correct Supabase URL and key
- Restart dev server: `npm run dev`

### No anomalies detected
- Sensor data is normal (good!)
- Or not enough historical data yet (system needs ~10-20 readings)

### Anomalies stored but not showing on dashboard
- Make sure you're subscribed to `anomaly_alerts` stream
- Check browser console for errors
- Verify Supabase real-time is enabled

---

## What's Next?

✅ **Immediate (Your 2-Day Project):**
- Deploy system (done!)
- Test with Arduino data
- Monitor alerts

📊 **Future Enhancements:**
- GBRF model for more accurate predictions
- Time-series analysis for pattern detection
- Email alerts
- Historical anomaly reports
- Maintenance scheduling based on alerts

---

## Support

For issues:
1. Check Supabase logs
2. Check Vercel function logs: `vercel logs`
3. Check browser console (F12)
4. Verify all tables exist in Supabase
