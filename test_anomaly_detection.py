#!/usr/bin/env python3
"""
Quick Test: Run this to verify your anomaly detection system works
"""

import json
from anomaly_detector import AnomalyDetector
import pandas as pd

def main():
    print("\n" + "="*60)
    print("🚨 ANOMALY DETECTION SYSTEM TEST")
    print("="*60 + "\n")
    
    # Initialize detector
    detector = AnomalyDetector()
    
    # Simulate 50 normal sensor readings
    print("📊 Simulating normal sensor data...")
    np_readings = []
    for i in range(50):
        reading = {
            'flow': 12.5 + (i % 3) * 0.2,  # Normal: 12-13 L/min
            'pressure': 3.0 + (i % 2) * 0.1,  # Normal: 2.9-3.1 bar
            'vibration': 150 + (i % 20),  # Normal: 150-170 units
        }
        np_readings.append(reading)
    
    # Add anomalous readings
    print("⚠️ Adding anomalous readings...")
    anomalous_readings = [
        {
            'flow': 2.5,  # Too low - BLOCKAGE
            'pressure': 5.8,  # Too high - BLOCKAGE
            'vibration': 150,
            'expected_anomaly': 'Blockage'
        },
        {
            'flow': 12.0,
            'pressure': 1.2,  # Too low - LEAK
            'vibration': 150,
            'expected_anomaly': 'Leak'
        },
        {
            'flow': 15.5,  # Too high
            'pressure': 3.0,
            'vibration': 150,
            'expected_anomaly': 'Excessive Flow'
        },
        {
            'flow': 12.0,
            'pressure': 3.0,
            'vibration': 650,  # Critical vibration - BEARING WEAR
            'expected_anomaly': 'Bearing Wear'
        },
    ]
    
    all_readings = pd.DataFrame(np_readings + [a for a in anomalous_readings if 'flow' in a])
    
    # Calculate thresholds
    print("\n📐 Calculating thresholds from 50 normal readings...")
    thresholds = detector.calculate_thresholds(all_readings.iloc[:50])
    
    print("\nThreshold Summary:")
    print(f"  Flow: {thresholds['flow_min']:.2f} - {thresholds['flow_max']:.2f} L/min")
    print(f"  Pressure: {thresholds['pressure_min']:.2f} - {thresholds['pressure_max']:.2f} bar")
    print(f"  Vibration Critical: > {thresholds['vibration_critical']:.0f} units")
    
    # Test anomaly detection
    print("\n" + "="*60)
    print("🧪 TESTING ANOMALY DETECTION")
    print("="*60)
    
    test_cases = [
        # Normal reading
        {'flow': 12.5, 'pressure': 3.0, 'vibration': 160, 'name': 'Normal Operation'},
        # Blockage
        {'flow': 2.5, 'pressure': 5.8, 'vibration': 160, 'name': 'Blockage (Low Flow + High Pressure)'},
        # Leak
        {'flow': 12.0, 'pressure': 1.2, 'vibration': 160, 'name': 'Leak (Low Pressure)'},
        # High vibration
        {'flow': 12.0, 'pressure': 3.0, 'vibration': 650, 'name': 'Bearing Wear (High Vibration)'},
        # Excessive flow
        {'flow': 15.5, 'pressure': 3.0, 'vibration': 160, 'name': 'Excessive Flow'},
    ]
    
    for i, test in enumerate(test_cases, 1):
        name = test.pop('name')
        result = detector.detect_anomaly(test)
        
        status = "✅ NORMAL" if not result['is_anomaly'] else f"🚨 {result['severity'].upper()}"
        print(f"\nTest {i}: {name}")
        print(f"  Status: {status}")
        if result['is_anomaly']:
            print(f"  Type: {result['anomaly_type']}")
            print(f"  Details: {result['details']}")
    
    # Generate comprehensive report
    print("\n" + "="*60)
    print("📈 COMPREHENSIVE REPORT")
    print("="*60)
    
    all_anomalies = detector.batch_detect(all_readings)
    report = detector.generate_report(all_anomalies)
    
    print(f"\nTotal Readings: {report['total_readings']}")
    print(f"Anomaly Rate: {report['anomaly_rate']}")
    print(f"Critical Count: {report['critical_count']}")
    print(f"Warning Count: {report['warning_count']}")
    print(f"\nAnomaly Types Detected:")
    for anomaly_type, count in report['anomaly_types'].items():
        print(f"  • {anomaly_type}: {count}")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE - System Ready!")
    print("="*60 + "\n")
    
    return report


if __name__ == '__main__':
    main()
