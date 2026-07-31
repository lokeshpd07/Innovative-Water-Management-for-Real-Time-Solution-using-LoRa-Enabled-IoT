# 🌊 AquaSense IMS - Master Setup Checklist

Complete implementation for your ESP32 LoRa sensor node with Supabase + React dashboard.

--- 

## **📋 Phase 1: Firmware Verification (Your Arduino Code)**

### Hardware Check
- [ ] ESP32 powered on and running
- [ ] YF-S201 flow sensor connected to GPIO 3
- [ ] SW-18010P vibration sensor connected to A0
- [ ] Pressure sensor connected to A5 (0.5-4.5V range)
- [ ] LoRa module connected (NSS→10, RST→9, DIO→2,6,7)

### Firmware Check
- [ ] Arduino IDE shows Serial output at 9600 baud
- [ ] "Starting..." message appears
- [ ] Every 30 seconds you see:
  ```
  Flow: X.XX L/min
  Pressure: Y.YY MPa
  Vibration: NNNN
  Packet Sent
  ```
- [ ] Values change when you run water/tap sensors
- [ ] No "TX pending" errors

**Your Device Credentials (from your sketch):**
- APPEUI: `22:00:00:00:00:00:00:00`
- DEVEUI: `59:65:07:D0:7E:D5:B3:70`
- APPKEY: `9F:89:58:03:6D:B8:C7:C2:E8:9C:BB:DA:A2:7A:03:95`

---

## **🛰️ Phase 2: TTN Setup (The Things Network)**

### 2.1 Device Registration
- [ ] Go to: https://console.cloud.thethings.network/
- [ ] Create Application (if not done)
- [ ] Register Device with:
  - Device ID: (choose a name like "node1")
  - DEVEUI: `59:65:07:D0:7E:D5:B3:70`
  - APPKEY: `9F:89:58:03:6D:B8:C7:C2:E8:9C:BB:DA:A2:7A:03:95`
- [ ] Save changes

### 2.2 Add Payload Formatter
- [ ] Go to: **Payload Formatters** → **Uplink**
- [ ] Change to: **JavaScript**
- [ ] Copy entire code from: `TTN_PAYLOAD_FORMATTER.js`
- [ ] Paste into TTN editor
- [ ] Click **Save changes**
- [ ] Test with hex: `0c05012c0200`
- [ ] Verify output: `{"flow": 12.5, "pressure": 3, "vibration": 512}`

### 2.3 Verify TTN Receive
- [ ] Go to: **Live Data** tab
- [ ] Power on your ESP32
- [ ] Wait 30 seconds
- [ ] Check for green uplink message
- [ ] Verify `decoded_payload` shows JSON
- [ ] RSSI should be between -120 to -60 dBm

---

## **☁️ Phase 3: Supabase Setup**

### 3.1 Create Project
- [ ] Go to: https://supabase.com
- [ ] Sign up / Log in
- [ ] Create new project
- [ ] Name: `aquasense-ims`
- [ ] Region: Singapore (or closest to India)
- [ ] Save password

### 3.2 Create Database Table
- [ ] Go to: **SQL Editor**
- [ ] Copy and run this SQL:
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
- [ ] Query executes without errors

### 3.3 Get Credentials
- [ ] Go to: **Settings** → **API**
- [ ] Copy these 3 values:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Save in a secure location

---

## **⚙️ Phase 4: Backend (Vercel)**

### 4.1 Create Project Folder
```bash
mkdir aquasense-ims-backend
cd aquasense-ims-backend
```

### 4.2 Copy Files
- [ ] `package.json`
- [ ] `vercel.json`
- [ ] Create folder: `api/`
- [ ] In `api/`: Add `ttn-webhook.js`
- [ ] In `api/`: Add `health.js`

### 4.3 Create `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```
- [ ] Replace with YOUR credentials from 3.3

### 4.4 Install Dependencies
```bash
npm install
```
- [ ] Should see `@supabase/supabase-js` installed

### 4.5 Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
- [ ] Get URL like: `https://aquasense-ims-backend.vercel.app/`
- [ ] Test: `curl https://your-url/api/health`
- [ ] Should return: `{"status": "ok"}`

### 4.6 Add Environment Variables to Vercel
- [ ] Go to: https://vercel.com/dashboard
- [ ] Click your project
- [ ] **Settings** → **Environment Variables**
- [ ] Add all 3 variables
- [ ] Redeploy: `vercel --prod`

---

## **🔗 Phase 5: TTN Webhook Configuration**

### 5.1 Add Webhook
- [ ] Go to TTN Console → Your App
- [ ] **Integrations** → **Webhooks**
- [ ] Click **Add webhook**
- [ ] Configure:
  - **Webhook ID**: `supabase`
  - **Webhook URL**: `https://your-vercel-url.vercel.app/api/ttn-webhook`
  - **Authorization**: (leave empty)
  - **Message types**: Check ✅ "Uplink message"
- [ ] Click **Create webhook**

### 5.2 Verify Webhook Delivery
- [ ] Go back to TTN Webhooks page
- [ ] Click `supabase` webhook
- [ ] Scroll to **Recent deliveries**
- [ ] Wait for device to transmit (30 sec)
- [ ] Should see POST request with:
  - Status: **200 OK** (green ✅)
  - Method: POST
  - Response: `{"success": true, ...}`

---

## **📊 Phase 6: Verify Supabase Data**

### 6.1 Check Database
- [ ] Go to: Supabase Console
- [ ] **Table Editor** → **sensor_data**
- [ ] Should see rows with:
  - `device_id`: Your device name
  - `flow`: Number (e.g., 12.50)
  - `pressure`: Number (e.g., 3.00)
  - `vibration`: Number (e.g., 512)
  - `rssi`: Negative number (e.g., -95)
  - `received_at`: Recent timestamp

### 6.2 Test Real-time
- [ ] Leave table open
- [ ] Trigger new transmission (wait 30 sec)
- [ ] New row appears automatically (no page refresh needed)

---

## **💻 Phase 7: React Dashboard**

### 7.1 Install Dependencies
```bash
# In your React project root
npm install @supabase/supabase-js
```

### 7.2 Create .env File
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```
- [ ] Use credentials from Supabase (Phase 3.3)

### 7.3 Copy React Files
- [ ] `src/lib/supabaseClient.js`
- [ ] `src/components/Dashboard.jsx`
- [ ] `src/components/DataHistory.jsx`
- [ ] Replace: `src/App.jsx`

### 7.4 Install Tailwind (Optional, needed for styling)
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 7.5 Run Dashboard
```bash
npm run dev
```
- [ ] Opens at: http://localhost:5173
- [ ] See "🌊 AquaSense IMS Dashboard"
- [ ] Sensor card visible with device ID
- [ ] Shows Flow, Vibration, Pressure values
- [ ] "connected" status visible

### 7.6 Test Real-time Updates
- [ ] Keep dashboard open
- [ ] Wait for device transmission (30 sec)
- [ ] Values update automatically
- [ ] Check History tab shows past readings

---

## **✅ Phase 8: Full System Validation**

### Complete End-to-End Test
- [ ] Firmware sending every 30 sec (Serial monitor)
- [ ] TTN Live Data shows green uplinks
- [ ] TTN Payload Formatter decodes correctly
- [ ] TTN Webhook shows 200 OK deliveries
- [ ] Supabase table has new rows
- [ ] React dashboard shows sensor card
- [ ] Real-time updates work (no page refresh)
- [ ] History tab displays data table

### Performance Check
- [ ] Time from transmission to dashboard: < 5 seconds
- [ ] All values accurate (match sensor readings)
- [ ] RSSI shows signal strength (-120 to -60 dBm range)

---

## **🚀 Phase 9: Production Deployment**

### Deploy React Dashboard to Vercel
```bash
vercel --prod
```
- [ ] Get public URL
- [ ] Access from phone/other devices
- [ ] Test over mobile network

### Set Up Monitoring
- [ ] Check Vercel logs: `vercel logs`
- [ ] Monitor Supabase performance
- [ ] Set up email alerts for errors

### Backup Configuration
- [ ] Export Supabase schema
- [ ] Document your Vercel environment variables
- [ ] Save TTN configuration

---

## **📱 Phase 10: Optional - Multi-Device Setup**

If you have 3 nodes (Flow, Vibration, Pressure):

### For Each Additional Node:
- [ ] Register new device in TTN
  - Different Device ID
  - Different DEVEUI (change last bytes)
  - Use same APPKEY
- [ ] Update firmware:
  ```c
  static const u1_t PROGMEM DEVEUI[8] = { 
    0x59, 0x65, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x71  // Change 0x70 to 0x71, 0x72, etc
  };
  ```
- [ ] Compile and upload
- [ ] Verify in TTN Live Data
- [ ] Verify in dashboard (separate cards)

---

## **🐛 Troubleshooting Quick Reference**

### No Serial Output
- Check USB cable is connected
- Check correct COM port selected
- Check baud rate is 9600
- Try Arduino → Tools → Reset Board

### No TTN Uplinks
- Check firmware credentials match TTN Console
- Check device is in range of gateway
- Check gateway is online (TTN Console → Gateways)
- Check antenna is connected (if applicable)

### Webhook Returns 500
- Check Vercel URL is correct
- Check environment variables in Vercel
- Run: `vercel logs` to see error details
- Verify SUPABASE_SERVICE_ROLE_KEY is set

### No Data in Supabase
- Check webhook is delivering (TTN Console)
- Check payload formatter is applied
- Run SQL: `SELECT COUNT(*) FROM sensor_data;`
- Check database creation SQL ran without errors

### Dashboard Shows "Stale Data"
- Check device is still transmitting
- Check TTN Live Data for recent uplinks
- Device may be out of range or powered off

---

## **📚 Documentation Files**

| File | Purpose |
|------|---------|
| **FIRMWARE_INTEGRATION_GUIDE.md** | Detailed firmware-specific setup |
| **TESTING_GUIDE.md** | Step-by-step testing for each phase |
| **QUICK_START.md** | Fast reference with commands |
| **TTN_PAYLOAD_FORMATTER.js** | Paste in TTN Console |
| **ttn-webhook.js** | Your Vercel webhook function |
| **Dashboard.jsx** | React real-time dashboard |
| **DataHistory.jsx** | Data table with filtering |
| **App.jsx** | Main React app component |

---

## **🎯 Success Criteria**

Your system is working when:

✅ Firmware transmits every 30 seconds  
✅ TTN receives and decodes data  
✅ Vercel webhook receives 200 OK  
✅ Supabase stores data in table  
✅ React dashboard shows live values  
✅ Real-time updates work  
✅ Values are accurate  

---

## **📞 Support Resources**

- **TTN Community**: https://www.thethingsnetwork.org/community/
- **Supabase Docs**: https://supabase.com/docs/
- **React Docs**: https://react.dev/
- **Arduino References**: https://www.arduino.cc/reference/

---

**Last Updated**: April 9, 2024  
**Status**: ✅ Ready for deployment  
**Estimated Setup Time**: 1-2 hours
