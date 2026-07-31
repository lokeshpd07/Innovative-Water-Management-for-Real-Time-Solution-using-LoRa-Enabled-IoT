/**
 * TTN Payload Formatter for AquaSense IMS
 * 
 * This formatter decodes the binary payload from your ESP32 firmware.
 * 
 * Payload structure (6 bytes):
 * [0]   = Flow integer part (L/min)
 * [1]   = Flow decimal part (0-9)
 * [2-3] = Pressure (uint16, in 0.01 MPa units)
 * [4-5] = Vibration (uint16, raw ADC value)
 * 
 * Place this code in:
 * TTN Console → Application → Payload Formatters → Uplink
 */
 
function decodeUplink(bytes) {
  if (bytes.length < 6) {
    return {
      errors: ['Invalid payload length: ' + bytes.length],
      warnings: ['Expected 6 bytes'],
    };
  }

  // Extract flow rate
  const flowInt = bytes[0];
  const flowDec = bytes[1];
  const flow = flowInt + (flowDec / 10.0);

  // Extract pressure (uint16, big-endian)
  const pressureRaw = (bytes[2] << 8) | bytes[3];
  const pressure = pressureRaw / 100.0; // Convert from 0.01 MPa to MPa

  // Extract vibration (uint16, big-endian)
  const vibrationRaw = (bytes[4] << 8) | bytes[5];

  return {
    data: {
      flow: parseFloat(flow.toFixed(2)),           // L/min
      pressure: parseFloat(pressure.toFixed(2)),   // MPa
      vibration: vibrationRaw                       // Raw ADC value (0-1023)
    },
    warnings: [],
    errors: []
  };
}

// Optional: Encode function for downlinks (if needed later)
function encodeDownlink(object) {
  return {
    bytes: [],
    fPort: 1,
  };
}
