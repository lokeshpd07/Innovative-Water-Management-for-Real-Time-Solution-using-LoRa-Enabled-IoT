import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.' 
    });
  }
 
  try {
    // Extract TTN webhook payload
    const {
      end_device_ids,
      uplink_message,
      received_at
    } = req.body;

    // Validate required fields
    if (!end_device_ids || !uplink_message) {
      return res.status(400).json({ 
        error: 'Invalid TTN payload: missing end_device_ids or uplink_message' 
      });
    }

    const deviceId = end_device_ids.device_id;
    
    // Decode raw bytes (your firmware sends raw binary payload)
    // If TTN has a payload formatter, it will give you decoded_payload
    // Otherwise, we decode from the raw bytes
    let flow, pressure, vibration;

    const payload = uplink_message.decoded_payload || {};
    const rawBytes = uplink_message.frm_payload 
      ? Buffer.from(uplink_message.frm_payload, 'base64')
      : null;

    if (payload.flow !== undefined && payload.pressure !== undefined && payload.vibration !== undefined) {
      // Already decoded by TTN formatter
      flow = payload.flow;
      pressure = payload.pressure;
      vibration = payload.vibration;

      console.log(`[${deviceId}] Using TTN decoded payload`);
    } else if (rawBytes && rawBytes.length >= 6) {
      // Decode from raw bytes (matches your firmware)
      // Byte 0: Flow integer part
      // Byte 1: Flow decimal part (0-9)
      // Bytes 2-3: Pressure (uint16, in 0.01 MPa units)
      // Bytes 4-5: Vibration (uint16, raw ADC value)

      const flowInt = rawBytes[0];
      const flowDec = rawBytes[1];
      flow = flowInt + (flowDec / 10.0);

      const pressureRaw = (rawBytes[2] << 8) | rawBytes[3];
      pressure = pressureRaw / 100.0; // Convert from 0.01 MPa units to MPa

      const vibrationRaw = (rawBytes[4] << 8) | rawBytes[5];
      vibration = vibrationRaw; // Keep as raw ADC value

      console.log(`[${deviceId}] Decoded from raw bytes - Flow: ${flow}, Pressure: ${pressure}, Vibration: ${vibrationRaw}`);
    } else {
      console.warn(`[${deviceId}] Cannot decode payload - no formatter or raw bytes unavailable`);
      return res.status(200).json({ 
        warning: 'Payload could not be decoded. Configure TTN payload formatter or check raw bytes.',
        device_id: deviceId,
        suggestion: 'Add the JavaScript payload formatter in TTN Console (see instructions)'
      });
    }

    // Extract sensor readings
    const sensorReading = {
      device_id: deviceId,
      flow: flow !== undefined ? parseFloat(flow.toFixed(2)) : null,
      vibration: vibration !== undefined ? parseInt(vibration) : null,
      pressure: pressure !== undefined ? parseFloat(pressure.toFixed(2)) : null,
      rssi: uplink_message.rx_metadata?.[0]?.rssi || null,
      snr: uplink_message.rx_metadata?.[0]?.snr || null,
      received_at: received_at || new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('sensor_data')
      .insert([sensorReading])
      .select();

    if (error) {
      console.error('[Supabase Error]', error);
      return res.status(500).json({ 
        error: `Database error: ${error.message}`,
        code: error.code
      });
    }

    console.log(`✓ [${deviceId}] Data stored:`, {
      flow: sensorReading.flow,
      vibration: sensorReading.vibration,
      pressure: sensorReading.pressure,
      timestamp: sensorReading.received_at
    });

    return res.status(200).json({ 
      success: true,
      message: 'Data received and stored successfully',
      device_id: deviceId,
      data: data
    });

  } catch (error) {
    console.error('[Webhook Error]', error);
    return res.status(500).json({ 
      error: error.message,
      type: error.name
    });
  }
}
