import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Import services
import { startLocationTracking, stopLocationTracking, getTrackingStatus } from '../services/LocationService';
import { checkForDeviation, analyzeJourney } from '../services/RouteService';
import { initializeAlerts, handleDeviation, handleDeviationResponse, AlertSeverity } from '../services/AlertService';
import { schedulePeriodicCleanup } from '../services/DataRetentionService';
import { JourneysModel } from '../database/models';

// Create context
const SafetyContext = createContext();

// Notification response listener
const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
  const { deviationId } = response.notification.request.content.data;
  const actionId = response.actionIdentifier;
  
  // Map action identifiers to response types
  const responseMap = {
    'dismiss': 'dismissed',
    'confirm': 'confirm',
    'snooze': 'snoozed',
    'Notifications.DEFAULT_ACTION_IDENTIFIER': 'app_opened' // User tapped the notification
  };
  
  const responseType = responseMap[actionId] || 'unknown';
  
  // Pass to handler
  if (deviationId) {
    handleDeviationResponse(deviationId, responseType);
  }
});

export const SafetyProvider = ({ children }) => {
  // State
  const [isTracking, setIsTracking] = useState(false);
  const [currentJourney, setCurrentJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviationStatus, setDeviationStatus] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [cleanupSchedule, setCleanupSchedule] = useState(null);
  
  // Initialize on first load
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check location permissions
        const { status: foreStatus } = await Location.getForegroundPermissionsAsync();
        const { status: backStatus } = await Location.getBackgroundPermissionsAsync();
        
        setLocationPermission({
          foreground: foreStatus === 'granted',
          background: backStatus === 'granted'
        });
        
        // Check notification permissions
        const { status: notifStatus } = await Notifications.getPermissionsAsync();
        setNotificationPermission(notifStatus === 'granted');
        
        // Initialize alerts
        await initializeAlerts();
        
        // Schedule periodic data cleanup (once per day)
        if (!cleanupSchedule) {
          const cancelCleanup = schedulePeriodicCleanup(24 * 60 * 60 * 1000);
          setCleanupSchedule(cancelCleanup);
        }
        
        // Check if already tracking (app might have restarted)
        const status = getTrackingStatus();
        setIsTracking(status.isTracking);
        
        if (status.currentJourneyId) {
          setCurrentJourney({
            id: status.currentJourneyId,
            startTime: Date.now() // Approximate, since we don't know actual start time
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error initializing safety context:', err);
        setError('Failed to initialize safety monitoring');
        setLoading(false);
      }
    };
    
    initialize();
    
    // Clean up notification listener and data cleanup schedule
    return () => {
      Notifications.removeNotificationSubscription(notificationResponseListener);
      if (cleanupSchedule) {
        cleanupSchedule();
      }
    };
  }, []);
  
  // Request permissions
  const requestPermissions = async () => {
    try {
      // Request location permissions
      const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foreStatus !== 'granted') {
        setError('Location permission is required for safety monitoring');
        setLocationPermission({
          ...locationPermission,
          foreground: false
        });
        return false;
      }
      
      const { status: backStatus } = await Location.requestBackgroundPermissionsAsync();
      setLocationPermission({
        foreground: true,
        background: backStatus === 'granted'
      });
      
      // Request notification permissions
      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(notifStatus === 'granted');
      
      return foreStatus === 'granted' && backStatus === 'granted' && notifStatus === 'granted';
    } catch (err) {
      console.error('Error requesting permissions:', err);
      setError('Failed to request necessary permissions');
      return false;
    }
  };
  
  // Start tracking
  const startTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check permissions
      if (!locationPermission?.foreground || !locationPermission?.background) {
        const granted = await requestPermissions();
        if (!granted) {
          setError('Cannot start tracking without required permissions');
          setLoading(false);
          return false;
        }
      }
      
      // Start location tracking
      const journeyId = await startLocationTracking();
      
      setIsTracking(true);
      setCurrentJourney({
        id: journeyId,
        startTime: Date.now()
      });
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error starting tracking:', err);
      setError(`Failed to start tracking: ${err.message}`);
      setLoading(false);
      return false;
    }
  };
  
  // Stop tracking
  const stopTracking = async () => {
    try {
      setLoading(true);
      
      await stopLocationTracking();
      
      // Analyze the completed journey
      if (currentJourney) {
        analyzeJourney(currentJourney.id)
          .then(result => {
            if (result) {
              console.log('Journey analyzed:', result);
            }
          })
          .catch(err => {
            console.error('Error analyzing journey:', err);
          });
      }
      
      setIsTracking(false);
      setCurrentJourney(null);
      setDeviationStatus(null);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error stopping tracking:', err);
      setError(`Failed to stop tracking: ${err.message}`);
      setLoading(false);
      return false;
    }
  };
  
  // Check for route deviation
  const checkDeviation = async (position) => {
    if (!isTracking || !currentJourney) return null;
    
    try {
      const deviation = await checkForDeviation(currentJourney.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      
      if (deviation) {
        // Handle the deviation
        const alertResult = await handleDeviation(deviation, AlertSeverity.MEDIUM);
        setDeviationStatus({
          ...deviation,
          alertSent: alertResult.success,
          alertLevel: alertResult.alertLevel,
          timestamp: Date.now()
        });
        
        return deviation;
      }
      
      return null;
    } catch (err) {
      console.error('Error checking deviation:', err);
      return null;
    }
  };
  
  // Get journey details
  const getJourneyDetails = async (journeyId) => {
    try {
      const points = await JourneysModel.getJourneyPoints(journeyId || currentJourney?.id);
      return points;
    } catch (err) {
      console.error('Error getting journey details:', err);
      return [];
    }
  };
  
  // Context value
  const contextValue = {
    isTracking,
    currentJourney,
    loading,
    error,
    deviationStatus,
    locationPermission,
    notificationPermission,
    requestPermissions,
    startTracking,
    stopTracking,
    checkDeviation,
    getJourneyDetails
  };
  
  return (
    <SafetyContext.Provider value={contextValue}>
      {children}
    </SafetyContext.Provider>
  );
};

// Custom hook to use the safety context
export const useSafety = () => useContext(SafetyContext);

export default SafetyContext;