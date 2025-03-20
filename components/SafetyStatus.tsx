import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafety } from '../app/contexts/SafetyContext';

interface DeviationStatus {
  actual: {
    latitude: number;
    longitude: number;
  };
  expected: {
    latitude: number;
    longitude: number;
  };
  distance: number;
}

interface Journey {
  id: number;
  startTime: number;
}

export default function SafetyStatus() {
  const { 
    isTracking, 
    loading, 
    error, 
    currentJourney, 
    deviationStatus,
    startTracking, 
    stopTracking 
  } = useSafety();

  // Calculate journey duration if active
  const getJourneyDuration = (): string | null => {
    if (!currentJourney) return null;
    
    const duration = Date.now() - currentJourney.startTime;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Handle toggle tracking
  const handleToggleTracking = async (): Promise<void> => {
    if (isTracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  return (
    <View style={styles.container}>
      {/* Status indicator */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusIndicator, 
          { 
            backgroundColor: isTracking 
              ? (deviationStatus ? '#FF9800' : '#4CAF50') 
              : '#9E9E9E' 
          }
        ]} />
        
        <Text style={styles.statusText}>
          {isTracking 
            ? (deviationStatus 
                ? 'Deviation Detected' 
                : 'Actively Monitoring')
            : 'Monitoring Inactive'}
        </Text>
      </View>

      {/* Journey info */}
      {isTracking && currentJourney && (
        <View style={styles.journeyInfo}>
          <Ionicons name="time-outline" size={18} color="#555" />
          <Text style={styles.journeyText}>
            Active: {getJourneyDuration()}
          </Text>
        </View>
      )}

      {/* Deviation info */}
      {deviationStatus && (
        <View style={styles.deviationInfo}>
          <Ionicons name="warning-outline" size={18} color="#FF9800" />
          <Text style={styles.deviationText}>
            {Math.round(deviationStatus.distance)}m from expected route
          </Text>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={18} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Toggle tracking button */}
      <TouchableOpacity 
        style={[
          styles.button, 
          { backgroundColor: isTracking ? '#F44336' : '#4CAF50' }
        ]}
        onPress={handleToggleTracking}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons 
              name={isTracking ? 'stop-circle-outline' : 'play-circle-outline'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.buttonText}>
              {isTracking ? 'Stop Monitoring' : 'Start Monitoring'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  journeyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  journeyText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 6,
  },
  deviationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
  },
  deviationText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    marginLeft: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    padding: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});