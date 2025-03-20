import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Import services
import { startLocationTracking, stopLocationTracking, getTrackingStatus } from '../services/LocationService';
import { checkForDeviation, analyzeJourney } from '../services/RouteService';
import { initializeAlerts, handleDeviation, handleDeviationResponse, AlertSeverity } from '../services/AlertService';
import { schedulePeriodicCleanup } from '../services/DataRetentionService';
import { JourneysModel } from '../database/models';

export interface LocationPermission {
  foreground: boolean;
  background: boolean;
}

export interface Journey {
  id: number;
  startTime: number;
}

export interface DeviationStatus {
  actual: {
    latitude: number;
    longitude: number;
  };
  expected: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  alertSent?: boolean;
  alertLevel?: string;
  timestamp?: number;
}

export interface TrackingStatus {
  isTracking: boolean;
  currentJourneyId?: number;
}

export interface Position {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
  };
  timestamp?: number;
}

export interface SafetyContextType {
  isTracking: boolean;
  currentJourney: Journey | null;
  loading: boolean;
  error: string | null;
  deviationStatus: DeviationStatus | null;
  locationPermission: LocationPermission | null;
  notificationPermission: boolean | null;
  requestPermissions: () => Promise<boolean>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<boolean>;
  checkDeviation: (position: Position) => Promise<DeviationStatus | null>;
  getJourneyDetails: (journeyId?: number) => Promise<any[]>;
}

// Create context
const SafetyContext = createContext<SafetyContextType | undefined>(undefined);

interface SafetyProviderProps {
  children: ReactNode;
}

// Notification response listener
const notificationResponseListener = Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data as { deviationId?: number };
  const actionId = response.actionIdentifier;
  
  // Map action identifiers to response types
  const responseMap: Record<string, string> = {
    'dismiss': 'dismissed',
    'confirm': 'confirm',
    'snooze': 'snoozed',
    'Notifications.DEFAULT_ACTION_IDENTIFIER': 'app_opened' // User tapped the notification
  };
  
  const responseType = responseMap[actionId] || 'unknown';
  
  // Pass to handler
  if (data.deviationId) {
    handleDeviationResponse(data.deviationId, responseType);
  }
});

export const SafetyProvider = ({ children }: SafetyProviderProps) => {
  // State
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentJourney, setCurrentJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deviationStatus, setDeviationStatus] = useState<DeviationStatus | null>(null);
  const [locationPermission, setLocationPermission] = useState<LocationPermission | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<boolean | null>(null);
  const [cleanupSchedule, setCleanupSchedule] = useState<(() => void) | null>(null);
  
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
      } catch (err: any) {
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
  const requestPermissions = async (): Promise<boolean> => {
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
    } catch (err: any) {
      console.error('Error requesting permissions:', err);
      setError('Failed to request necessary permissions');
      return false;
    }
  };
  
  // Start tracking
  const startTracking = async (): Promise<boolean> => {
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
    } catch (err: any) {
      console.error('Error starting tracking:', err);
      setError(`Failed to start tracking: ${err.message}`);
      setLoading(false);
      return false;
    }
  };
  
  // Stop tracking
  const stopTracking = async (): Promise<boolean> => {
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
    } catch (err: any) {
      console.error('Error stopping tracking:', err);
      setError(`Failed to stop tracking: ${err.message}`);
      setLoading(false);
      return false;
    }
  };
  
  // Check for route deviation
  const checkDeviation = async (position: Position): Promise<DeviationStatus | null> => {
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
  const getJourneyDetails = async (journeyId?: number): Promise<any[]> => {
    try {
      const points = await JourneysModel.getJourneyPoints(journeyId || currentJourney?.id);
      return points;
    } catch (err) {
      console.error('Error getting journey details:', err);
      return [];
    }
  };
  
  // Context value
  const contextValue: SafetyContextType = {
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
export const useSafety = (): SafetyContextType => {
  const context = useContext(SafetyContext);
  if (context === undefined) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};

export default SafetyContext;