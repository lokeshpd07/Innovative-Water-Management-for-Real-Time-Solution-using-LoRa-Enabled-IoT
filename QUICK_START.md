# AquaSense IMS - Quick Start Guide

## **PART 1: BACKEND SETUP (5 minutes)**

### 1. Create Vercel + Supabase Backend

```bash
# Create backend project folder
mkdir aquasense-ims-backend
cd aquasense-ims-backend

# Copy the files:
# - ttn-webhook.js → api/ttn-webhook.js
# - health.js → api/health.js
# - package.json
# - vercel.json
# - .env.local.example → rename to .env.local

# Fill in your Supabase credentials
nano .env.local
``` 

### 2. Deploy to Vercel

```bash
# Install Vercel CLI globally (if not already done)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
npm run deploy
# OR
vercel --prod

# You'll get a URL like: https://aquasense-ims-backend.vercel.app/
# SAVE THIS URL - you'll need it for TTN
```

### 3. Add Environment Variables to Vercel

```bash
# Option A: Via Web Dashboard
# Go to https://vercel.com/dashboard
# Click your project → Settings → Environment Variables
# Add:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
# Then redeploy

# Option B: Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

---

## **PART 2: SUPABASE SETUP (5 minutes)**

### 1. Create Supabase Project

```
Go to: https://supabase.com
Sign up → Create New Organization → Create New Project
Name: aquasense-ims
Region: Singapore (or closest to India)
```

### 2. Create Database Table

In Supabase Console → SQL Editor, paste and run:

```sql
CREATE TABLE sensor_data (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  device_id TEXT NOT NULL,
  flow DECIMAL(10, 2),
  vibration DECIMAL(10, 2),
  pressure DECIMAL(10, 2),
  rssi INT,
  snr DECIMAL(5, 2),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;

CREATE INDEX idx_device_id ON sensor_data(device_id);
CREATE INDEX idx_received_at ON sensor_data(received_at DESC);
```

### 3. Get Credentials

Go to: Supabase Console → Settings → API

Copy:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (⚠️ KEEP SECRET!)

---

## **PART 2B: TTN PAYLOAD FORMATTER SETUP (2 minutes)**

### **Critical Step: Your firmware sends raw binary data**

Your ESP32 firmware sends:
- Byte 0: Flow integer
- Byte 1: Flow decimal (0-9)
- Bytes 2-3: Pressure (0.01 MPa units)
- Bytes 4-5: Vibration (raw ADC)

TTN MUST decode this.

### Add Formatter in TTN Console

```
Go to: https://console.cloud.thethings.network/
Your App → Payload Formatters → Uplink

Select: JavaScript

Copy-paste the entire code from: TTN_PAYLOAD_FORMATTER.js

Click Save
```

**Test it:**
```
Click "Test" tab
Paste hex: 00 00 00 00 00 00
Should output:
{
  "flow": 0,
  "pressure": 0,
  "vibration": 0
}
```

---

### 1. Add Webhook in TTN

```
TTN Console → Your Application → Integrations → Webhooks
Click "Add webhook"

Webhook ID: supabase
Webhook URL: https://your-vercel-url.vercel.app/api/ttn-webhook
Authorization: (leave empty)
Message types: Check "Uplink message"

Click "Create webhook"
```

### 2. Test Webhook

```bash
# Check recent deliveries in TTN Console
# Integrations → Webhooks → supabase → Recent deliveries
# Should see POST requests with status 200

# Manual test:
curl -X POST https://your-vercel-url.vercel.app/api/ttn-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "end_device_ids": {"device_id": "test-device"},
    "uplink_message": {
      "decoded_payload": {
        "flow": 12.5,
        "vibration": 2.3,
        "pressure": 45.2
      },
      "rx_metadata": [{"rssi": -95}]
    },
    "received_at": "2024-04-08T10:30:00Z"
  }'
```

---

## **PART 4: REACT FRONTEND SETUP (10 minutes)**

### 1. Install Dependencies

```bash
# In your React project root
npm install @supabase/supabase-js
```

### 2. Add Environment File

Create `.env` file in your React project root:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Create lib/supabaseClient.js

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4. Update Your Components

Copy these files:
- `Dashboard.jsx` → `src/components/Dashboard.jsx`
- `DataHistory.jsx` → `src/components/DataHistory.jsx`
- `App.jsx` → `src/App.jsx`
- `supabaseClient.js` → `src/lib/supabaseClient.js`

### 5. Run Locally

```bash
npm run dev
```

Open http://localhost:5173 and wait for sensor data!

---

## **PART 5: TROUBLESHOOTING**

### Problem: "Can't fetch data from Supabase"

**Solution:**
```bash
# Check credentials in .env file
# Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
# Restart dev server: npm run dev
```

### Problem: "Webhook returning 500 error"

**Solution:**
```bash
# Check Vercel logs
vercel logs

# Common causes:
# 1. Missing environment variables in Vercel
# 2. Service role key is wrong
# 3. Table doesn't exist in Supabase

# Fix: Add env vars again and redeploy
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

### Problem: "Real-time updates not working"

**Solution:**
```sql
-- In Supabase SQL Editor:
-- Check if real-time is enabled
SELECT tablename FROM pg_tables WHERE schemaname='public';

-- Re-enable real-time:
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
```

### Problem: "No data showing in TTN Webhook"

**Solution:**
1. Check device is sending data (TTN Console → Live Data)
2. Check TTN has payload decode function configured
3. Check webhook URL is correct
4. Check firewall/CORS isn't blocking

---

## **TESTING CHECKLIST**

- [ ] Vercel backend deployed (test with `/api/health`)
- [ ] Supabase project created with table
- [ ] Webhook added in TTN
- [ ] First webhook delivery successful (check Recent deliveries)
- [ ] Data appears in Supabase Console
- [ ] React dashboard receives data
- [ ] Real-time updates work (open 2 browser tabs, watch updates)

---

## **NEXT STEPS**

1. Deploy React dashboard to Vercel too (optional)
2. Add authentication if multiple users
3. Add data visualization charts
4. Set up Supabase backups
5. Add MQTT for alternate data source

---

## **DEPLOYMENT CHECKLIST**

Before going to production:

- [ ] Environment variables secured (not in .env file, only in Vercel)
- [ ] Service Role Key never exposed in frontend
- [ ] Database backups enabled in Supabase
- [ ] Row-Level Security policies set up
- [ ] Custom domain configured (optional)
- [ ] Error logging set up
- [ ] Monitoring alerts configured

---

**Questions?** Check the detailed SUPABASE_IMPLEMENTATION_GUIDE.md
