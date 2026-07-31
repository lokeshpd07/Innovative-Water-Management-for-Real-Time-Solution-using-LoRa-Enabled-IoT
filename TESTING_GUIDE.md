# AquaSense IMS - End-to-End Testing Guide

Test each component of your system step-by-step.

---

## **Test 1: ESP32 Firmware Validation (5 minutes)**

### Objective
Verify sensors are reading correctly and payload is being sent.

### Steps
 
**1. Connect to Serial Monitor**
```
Arduino IDE → Tools → Serial Monitor
Baud Rate: 9600
```

**2. Expected Output (Every 30 seconds)**
```
Starting...
[Device initializing...]

Flow: X.XX L/min
Pressure: Y.YY MPa
Vibration: NNNN
----------------------
Packet Sent

Flow: X.XX L/min
Pressure: Y.YY MPa
Vibration: NNNN
----------------------
Packet Sent
```

### Debug Sensor Values

**Flow Sensor Issues:**
- If Flow is always 0.00:
  - Check YF-S201 connection to GPIO 3
  - Verify water is flowing through sensor
  - Check sensor isn't air-locked
  - Solution: Swap flow direction or check calibration constant (98.0)

**Pressure Sensor Issues:**
- If Pressure is always 0.00 or very high:
  - Check voltage on A5 (should be 0.5-4.5V under load)
  - Connect multimeter to sensor output
  - Verify sensor is powered (5V)
  - Check PRESSURE_MIN_V (0.5) and PRESSURE_MAX_V (4.5) calibration

**Vibration Sensor Issues:**
- If Vibration is always 0 or 1023:
  - Check SW-18010P connection to A0
  - Vibration should vary slightly (200-800 range at rest)
  - Tap the sensor to see value change

### ✅ Pass Criteria
- All three sensors show non-zero, reasonable values
- Values change over time
- "Packet Sent" appears every 30 seconds
- No error messages

---

## **Test 2: TTN Device Registration (5 minutes)**

### Objective
Verify device is registered and can join LoRaWAN network.

### Steps

**1. Go to TTN Console**
```
https://console.cloud.thethings.network/
```

**2. Find Your Device**
- Application → Devices
- Search for device ID

**3. Check Device Status**
- Look for device in list
- Click it

**4. Go to Live Data Tab**
- Power on your ESP32
- Wait 30 seconds for first transmission
- Should see green uplink message

### What to Look For in Live Data

```json
Uplink (Port 1):
{
  "f_port": 1,
  "frm_payload": "0c05012c0200",
  "decoded_payload": {
    "flow": 12.5,
    "pressure": 3,
    "vibration": 512
  },
  "rx_metadata": [
    {
      "rssi": -95,
      "snr": 8.5
    }
  ]
}
```

### ✅ Pass Criteria
- Green uplinks appear every 30 seconds
- `frm_payload` shows 12 hex characters (6 bytes)
- `decoded_payload` shows JSON with flow, pressure, vibration
- RSSI is between -120 and -60 dBm (signal strength)

### ❌ Troubleshooting

**No uplinks appearing:**
- Device not powered
- Credentials wrong in firmware
- Outside LoRa range
- Gateway not active

**Fix:**
```
1. Check device is powered
2. Verify DEVEUI and APPKEY match TTN Console
3. Move device closer to gateway
4. Check gateway is online (TTN Console → Gateways)
```

---

## **Test 3: Payload Formatter Validation (5 minutes)**

### Objective
Verify TTN can decode your binary payload correctly.

### Steps

**1. Go to TTN Payload Formatters**
```
Your Application → Payload Formatters → Uplink
```

**2. Should See JavaScript Code**
- (Code from TTN_PAYLOAD_FORMATTER.js)

**3. Test with Sample Payload**

**In the "Test" tab:**

| Field | Value |
|-------|-------|
| Payload (hex) | `0c05012c0200` |

**Expected Output:**
```json
{
  "data": {
    "flow": 12.5,
    "pressure": 3,
    "vibration": 512
  },
  "warnings": [],
  "errors": []
}
```

### Test Different Values

Try these hex payloads:

**All zeros (idle):**
```
Input:  00 00 00 00 00 00
Output: flow=0, pressure=0, vibration=0
```

**High flow:**
```
Input:  32 08 02 58 03 E8
Output: flow=50.8, pressure=6.00, vibration=1000
```

**Low pressure:**
```
Input:  0A 02 00 64 01 00
Output: flow=10.2, pressure=1.00, vibration=256
```

### ✅ Pass Criteria
- Formatter converts hex to JSON correctly
- No error messages
- Values match your firmware calculation

---

## **Test 4: Webhook Delivery (5 minutes)**

### Objective
Verify TTN sends data to your Vercel backend.

### Steps

**1. Go to TTN Webhooks**
```
Your Application → Integrations → Webhooks → supabase
```

**2. Check Recent Deliveries**
- You should see POST requests
- Status should be **200 OK** (green)
- Look for entries with "POST" method

**3. Click a Successful Delivery**
- View Request tab - should show your sensor data
- View Response tab - should show JSON response

### Expected Response
```json
{
  "success": true,
  "message": "Data received and stored successfully",
  "device_id": "node1",
  "data": [
    {
      "id": 123,
      "device_id": "node1",
      "flow": 12.5,
      "pressure": 3,
      "vibration": 512
    }
  ]
}
```

### ✅ Pass Criteria
- HTTP Status: 200 OK
- Response contains "success": true
- No error messages

### ❌ Troubleshooting

**Status 404 or Connection Refused:**
- Check Vercel URL is correct
- Test: `curl https://your-url.vercel.app/api/health`
- Should return status OK

**Status 500:**
- Check Vercel environment variables
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check Vercel logs: `vercel logs`

**Status 400:**
- Formatter not applied
- Device payload malformed
- Check "Request" tab for payload details

---

## **Test 5: Supabase Data Storage (5 minutes)**

### Objective
Verify data is saved to database correctly.

### Steps

**1. Go to Supabase Console**
```
https://app.supabase.com → Your Project
```

**2. Open sensor_data Table**
- Left sidebar → Table Editor → sensor_data
- OR use SQL Editor with query:
```sql
SELECT * FROM sensor_data 
ORDER BY received_at DESC 
LIMIT 10;
```

**3. Check Data**

| Column | Expected | Example |
|--------|----------|---------|
| device_id | Your device name | `node1` |
| flow | Decimal number | `12.50` |
| pressure | Decimal number | `3.00` |
| vibration | Integer | `512` |
| rssi | Negative number | `-95` |
| received_at | Recent timestamp | `2024-04-09 10:30:45` |

**4. Real-time Check**
- Keep table open
- Trigger a new transmission (power cycle device or wait 30s)
- New row should appear automatically

### ✅ Pass Criteria
- Table has rows with your device data
- Values match your sensor readings
- New rows appear every 30 seconds
- Timestamps are correct

### ❌ Troubleshooting

**Table is empty:**
- Webhook not delivering (check Test 4)
- Wrong service role key
- Database not created

**Fix:**
```sql
-- Create table if missing
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
```

---

## **Test 6: React Dashboard Real-time (5 minutes)**

### Objective
Verify React dashboard receives and displays live data.

### Steps

**1. Start React Dashboard**
```bash
npm run dev
```

**2. Open in Browser**
```
http://localhost:5173
```

**3. Check Initial Load**
- Should show "Live Dashboard" tab
- Sensor card appears with your device ID
- Shows current values: Flow, Vibration, Pressure
- Status shows "connected" (green dot)

**4. Test Real-time Updates**
- Leave dashboard open
- Wait for device to transmit (every 30 sec)
- Values should update automatically
- Timestamp should change

**5. Test History Tab**
- Click "History" tab
- Select your device from dropdown
- Should show table of last 50 readings
- Click a reading - all columns populated

### Check Browser Console (F12)
- No red errors
- Should see: "Real-time subscription active"

### ✅ Pass Criteria
- Dashboard loads without errors
- Sensor card shows current values
- Values update every 30 seconds
- History table shows past readings
- Connection status is "connected"

### ❌ Troubleshooting

**"Can't fetch data from Supabase"**
```
1. Check .env file has:
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
2. Reload page (Ctrl+R)
3. Check browser console (F12) for errors
```

**"No data showing"**
```
1. Check Supabase table has data (Test 5)
2. Check VITE_SUPABASE_ANON_KEY is correct
3. Check real-time is enabled:
   Supabase → SQL Editor →
   ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
```

---

## **Test 7: Multi-Device Setup (If applicable)**

### Objective
Verify system can handle multiple sensor nodes.

### Steps

**1. Register Second Device in TTN**
- Create new device with different Device ID
- Use same Application ID
- Use same payload formatter

**2. Update Firmware for Second Node**
```c
// Change in your .ino file:
static const u1_t PROGMEM DEVEUI[8] = { 
  0x59, 0x65, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x71  // Different last byte
};
```

**3. Deploy to Second ESP32**
- Compile and upload to second board

**4. Check TTN Live Data**
- Both devices should send uplinks
- Different device IDs

**5. Check Dashboard**
- Both devices appear as separate cards
- Each updates independently

---

## **Full System Test Checklist**

Use this checklist to verify entire flow:

- [ ] **Firmware**: Serial output shows correct sensor values every 30s
- [ ] **TTN Device**: Green uplinks appearing in Live Data
- [ ] **TTN Formatter**: Test payload decodes to correct JSON
- [ ] **TTN Webhook**: Recent deliveries showing 200 OK status
- [ ] **Supabase**: sensor_data table has rows with correct values
- [ ] **React Dashboard**: Shows sensor card with live values
- [ ] **Real-time**: Dashboard updates without refreshing page
- [ ] **History**: Data table shows past 50 readings
- [ ] **Multi-device** (if applicable): Each device shows separately

---

## **Performance Benchmarks**

Here's what to expect:

| Metric | Target | Actual |
|--------|--------|--------|
| Firmware to TTN | <5 sec | _____ |
| TTN to Webhook | <2 sec | _____ |
| Webhook to Supabase | <1 sec | _____ |
| Supabase to Dashboard | <1 sec | _____ |
| **Total E2E Latency** | **<10 sec** | _____ |

---

## **Next Steps**

Once all tests pass:

1. **Deploy Dashboard to Vercel**
   ```bash
   vercel --prod
   ```

2. **Monitor for 24 hours**
   - Check for missed transmissions
   - Verify data quality
   - Watch for anomalies

3. **Integrate with your GBRF model**
   - Export sensor data from Supabase
   - Feed into anomaly detection

4. **Add Alerting**
   - Email when pressure > 50 bar
   - Alert on vibration spikes
   - Downtime notifications

---

**Still having issues?** Check:
- FIRMWARE_INTEGRATION_GUIDE.md (detailed setup)
- SUPABASE_IMPLEMENTATION_GUIDE.md (full architecture)
- QUICK_START.md (quick reference)
