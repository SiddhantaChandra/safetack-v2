import React, { useEffect } from 'react';
import { Image, StyleSheet, View, ScrollView, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SafetyMap from '../../components/SafetyMap';
import SafetyStatus from '../../components/SafetyStatus';
import { useSafety } from '../contexts/SafetyContext';

export default function HomeScreen() {
  const { requestPermissions } = useSafety();
  
  // Request permissions on initial load
  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <SafetyMap />
      </View>
      
      <ScrollView style={styles.content}>
        <SafetyStatus />
        
        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.infoTitle}>SafeTack</ThemedText>
          <ThemedText style={styles.infoText}>
            SafeTack is now actively learning your regular routes. As you travel, 
            the app will automatically detect patterns and monitor for unusual deviations.
          </ThemedText>
          <ThemedText style={styles.infoText}>
            Your safety is our priority. All route data is processed on your device for maximum privacy.
          </ThemedText>
        </ThemedView>
      </ScrollView>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    height: '50%',
    width: '100%',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});