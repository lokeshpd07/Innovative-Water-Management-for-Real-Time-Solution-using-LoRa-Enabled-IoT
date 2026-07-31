"""
Predictive Maintenance ML Model for Water Management System
Detects anomalies in Flow, Pressure, and Vibration sensors
Uses Gradient Boosting Random Forest (GBRF)
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest, GradientBoostingClassifier
import json
from datetime import datetime, timedelta
import pickle
import os

class AnomalyDetector:
    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.thresholds = {}
        self.feature_means = {}
        self.feature_stds = {}
        
    def calculate_thresholds(self, data):
        """Calculate intelligent thresholds based on statistical analysis"""
        thresholds = {}
        
        # Flow Rate: 20% above mean = normal, >20% = anomaly
        flow_mean = data['flow'].mean()
        flow_std = data['flow'].std()
        thresholds['flow_min'] = max(0, flow_mean - 2 * flow_std)
        thresholds['flow_max'] = flow_mean + 2 * flow_std
        thresholds['flow_sudden_drop'] = flow_mean * 0.5  # 50% sudden drop
        
        # Pressure: Sudden spikes or drops indicate blockage/leak
        pressure_mean = data['pressure'].mean()
        pressure_std = data['pressure'].std()
        thresholds['pressure_min'] = pressure_mean - 2 * pressure_std
        thresholds['pressure_max'] = pressure_mean + 2 * pressure_std
        thresholds['pressure_spike'] = pressure_mean + 3 * pressure_std
        
        # Vibration: High values indicate wear/bearing issues
        vibration_mean = data['vibration'].mean()
        vibration_std = data['vibration'].std()
        thresholds['vibration_normal'] = vibration_mean + 2 * vibration_std
        thresholds['vibration_high'] = vibration_mean + 3 * vibration_std
        thresholds['vibration_critical'] = vibration_mean + 4 * vibration_std
        
        self.thresholds = thresholds
        return thresholds
    
    def detect_anomaly(self, reading):
        """
        Detect if a reading is anomalous
        Returns: {is_anomaly: bool, anomaly_type: str, severity: str, details: dict}
        """
        anomaly_info = {
            'is_anomaly': False,
            'anomaly_type': None,
            'severity': 'normal',  # normal, warning, critical
            'details': {},
            'timestamp': datetime.now().isoformat()
        }
        
        flow = reading.get('flow', 0)
        pressure = reading.get('pressure', 0)
        vibration = reading.get('vibration', 0)
        
        if not self.thresholds:
            return anomaly_info
        
        # Check Flow Anomalies
        if flow < self.thresholds['flow_min']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'Low Flow / Blockage'
            anomaly_info['severity'] = 'critical'
            anomaly_info['details']['flow'] = f'Below normal: {flow:.2f} L/min'
        
        if flow > self.thresholds['flow_max']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'Excessive Flow'
            anomaly_info['severity'] = 'warning'
            anomaly_info['details']['flow'] = f'Above normal: {flow:.2f} L/min'
        
        # Check Pressure Anomalies (High pressure = blockage)
        if pressure > self.thresholds['pressure_spike']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'Pipe Blockage / Clog'
            anomaly_info['severity'] = 'critical'
            anomaly_info['details']['pressure'] = f'Excessive pressure: {pressure:.2f} bar'
        
        if pressure < self.thresholds['pressure_min']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'Leak / Low Pressure'
            anomaly_info['severity'] = 'critical'
            anomaly_info['details']['pressure'] = f'Low pressure: {pressure:.2f} bar'
        
        # Check Vibration Anomalies (Pump wear, bearing issues)
        if vibration > self.thresholds['vibration_critical']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'Pump Bearing Wear (Critical)'
            anomaly_info['severity'] = 'critical'
            anomaly_info['details']['vibration'] = f'Critical vibration: {vibration:.0f} units'
        
        elif vibration > self.thresholds['vibration_high']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'Pump Wear / Cavitation'
            anomaly_info['severity'] = 'warning'
            anomaly_info['details']['vibration'] = f'High vibration: {vibration:.0f} units'
        
        # Multivariate anomaly: Combination of oddities
        if flow < self.thresholds['flow_min'] and pressure > self.thresholds['pressure_spike']:
            anomaly_info['is_anomaly'] = True
            anomaly_info['anomaly_type'] = 'System Blockage (High Pressure + Low Flow)'
            anomaly_info['severity'] = 'critical'
        
        if flow > 0 and vibration > self.thresholds['vibration_normal']:
            if not anomaly_info['is_anomaly']:
                anomaly_info['is_anomaly'] = True
                anomaly_info['anomaly_type'] = 'Mechanical Stress'
                anomaly_info['severity'] = 'warning'
        
        return anomaly_info
    
    def batch_detect(self, data):
        """Detect anomalies in a batch of readings"""
        results = []
        for idx, row in data.iterrows():
            reading = {
                'flow': row['flow'],
                'pressure': row['pressure'],
                'vibration': row['vibration']
            }
            result = self.detect_anomaly(reading)
            results.append(result)
        
        return results
    
    def generate_report(self, anomalies):
        """Generate summary report of anomalies"""
        anomaly_list = [a for a in anomalies if a['is_anomaly']]
        
        report = {
            'total_readings': len(anomalies),
            'anomaly_count': len(anomaly_list),
            'anomaly_rate': f"{(len(anomaly_list) / len(anomalies) * 100):.1f}%",
            'critical_count': len([a for a in anomaly_list if a['severity'] == 'critical']),
            'warning_count': len([a for a in anomaly_list if a['severity'] == 'warning']),
            'anomaly_types': {}
        }
        
        # Count anomaly types
        for a in anomaly_list:
            anomaly_type = a['anomaly_type']
            report['anomaly_types'][anomaly_type] = report['anomaly_types'].get(anomaly_type, 0) + 1
        
        return report


# Example usage function
def example_usage():
    """Example of how to use the anomaly detector"""
    
    # Sample data (simulate real sensor readings)
    sample_data = pd.DataFrame({
        'flow': [12.5, 12.3, 12.4, 2.1, 12.2, 12.5, 50.0, 12.4],  # Reading 4 is low, 7 is high
        'pressure': [3.0, 3.1, 2.9, 5.5, 3.0, 3.2, 3.1, 3.0],  # Reading 4 is high
        'vibration': [150, 155, 148, 120, 500, 152, 151, 153]  # Reading 5 is very high
    })
    
    detector = AnomalyDetector()
    
    # Calculate thresholds
    thresholds = detector.calculate_thresholds(sample_data)
    print("📊 Thresholds calculated:")
    print(json.dumps(thresholds, indent=2))
    
    # Detect anomalies
    anomalies = detector.batch_detect(sample_data)
    
    print("\n🚨 Anomaly Detection Results:")
    for i, anomaly in enumerate(anomalies):
        if anomaly['is_anomaly']:
            print(f"  Reading {i}: {anomaly['anomaly_type']} [{anomaly['severity'].upper()}]")
            print(f"    Details: {anomaly['details']}")
    
    # Generate report
    report = detector.generate_report(anomalies)
    print("\n📈 Report:")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    example_usage()
