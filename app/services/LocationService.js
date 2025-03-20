import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { JourneysModel } from '../database/models';

// Background task name
const LOCATION_TRACKING_TASK = 'background-location-tracking';

// Service state
let isTracking = false;
let currentJourneyId = null;
let locationSubscription = null;
let pointSequence = 0;
let batteryCheckInterval = null;

/**
 * Handle background location updates
 */
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data: { locations }, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (!currentJourneyId) {
    // If no active journey but background task is running,
    // we need to start a new journey
    try {
      currentJourneyId = await startNewJourney(locations[0]);
    } catch (err) {
      console.error('Error starting journey in background task:', err);
      return;
    }
  }
  
  // Process each location update
  for (const location of locations) {
    try {
      await processLocationUpdate(location);
    } catch (err) {
      console.error('Error processing location in background task:', err);
    }
  }
});

/**
 * Get optimal tracking settings based on battery level and activity
 */
const getOptimalTrackingSettings = async () => {
  try {
    // Get current battery level
    const batteryLevel = await Battery.getBatteryLevelAsync();
    
    // Default settings
    const settings = {
      foreground: {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10, // meters
        timeInterval: 15000,  // 15 seconds
      },
      background: {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20, // meters
        timeInterval: 60000,  // 1 minute
      }
    };
    
    // Adjust based on battery level
    if (batteryLevel < 0.15) {
      // Critical battery - minimal updates
      settings.foreground.accuracy = Location.Accuracy.Low;
      settings.foreground.timeInterval = 60000; // 1 minute
      settings.foreground.distanceInterval = 50; // 50 meters
      
      settings.background.accuracy = Location.Accuracy.Low;
      settings.background.timeInterval = 300000; // 5 minutes
      settings.background.distanceInterval = 100; // 100 meters
    } else if (batteryLevel < 0.3) {
      // Low battery - reduced updates
      settings.foreground.timeInterval = 30000; // 30 seconds
      settings.foreground.distanceInterval = 30; // 30 meters
      
      settings.background.timeInterval = 180000; // 3 minutes
      settings.background.distanceInterval = 50; // 50 meters
    } else if (batteryLevel > 0.7) {
      // High battery - can be more frequent
      settings.foreground.accuracy = Location.Accuracy.High;
      settings.foreground.timeInterval = 10000; // 10 seconds
      
      settings.background.timeInterval = 45000; // 45 seconds
    }
    
    return settings;
  } catch (error) {
    console.warn('Error getting optimal tracking settings:', error);
    // Return default settings if there's an error
    return {
      foreground: {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
        timeInterval: 15000,
      },
      background: {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20,
        timeInterval: 60000,
      }
    };
  }
};

/**
 * Start tracking user location
 */
export const startLocationTracking = async () => {
  if (isTracking) return currentJourneyId;
  
  try {
    // Request permissions
    const foregroundPermission = await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== 'granted') {
      throw new Error('Foreground location permission denied');
    }
    
    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    if (backgroundPermission.status !== 'granted') {
      throw new Error('Background location permission denied');
    }
    
    // Get optimal tracking settings based on battery and activity
    const trackingSettings = await getOptimalTrackingSettings();
    
    // Start a new journey
    const location = await Location.getCurrentPositionAsync({
      accuracy: trackingSettings.foreground.accuracy
    });
    
    currentJourneyId = await startNewJourney(location);
    
    // Start foreground tracking
    locationSubscription = await Location.watchPositionAsync(
      trackingSettings.foreground,
      async (location) => {
        await processLocationUpdate(location);
      }
    );
    
    // Start background tracking
    await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
      ...trackingSettings.background,
      foregroundService: {
        notificationTitle: "SafeTack is monitoring your route",
        notificationBody: "Your safety is being monitored in the background",
      },
      // Optimize for battery life
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: true,
      // Reduce frequency when stationary
      deferredUpdatesInterval: 300000, // 5 minutes when deferred
      deferredUpdatesDistance: 100,    // 100 meters when deferred
    });
    
    // Set up periodic battery check to adjust tracking parameters
    const BATTERY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    batteryCheckInterval = setInterval(async () => {
      try {
        if (!isTracking) {
          clearInterval(batteryCheckInterval);
          return;
        }
        
        // Update tracking parameters based on current battery level
        const newSettings = await getOptimalTrackingSettings();
        
        // Update background tracking if significantly different
        if (Math.abs(newSettings.background.timeInterval - 
            trackingSettings.background.timeInterval) > 30000) {
          // Stop and restart with new settings
          await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
          await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
            ...newSettings.background,
            foregroundService: {
              notificationTitle: "SafeTack is monitoring your route",
              notificationBody: "Your safety is being monitored in the background",
            },
            activityType: Location.ActivityType.Fitness,
            pausesUpdatesAutomatically: true,
            deferredUpdatesInterval: 300000,
            deferredUpdatesDistance: 100,
          });
        }
      } catch (error) {
        console.warn('Error in battery check interval:', error);
      }
    }, BATTERY_CHECK_INTERVAL);
    
    isTracking = true;
    return currentJourneyId;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    throw error;
  }
};

/**
 * Stop tracking user location
 */
export const stopLocationTracking = async () => {
  if (!isTracking) return;
  
  try {
    // Stop foreground tracking
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    
    // Stop background tracking
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
    }
    
    // Clear battery check interval
    if (batteryCheckInterval) {
      clearInterval(batteryCheckInterval);
      batteryCheckInterval = null;
    }
    
    // Complete the current journey
    if (currentJourneyId) {
      // Get the last point to calculate total distance
      const points = await JourneysModel.getJourneyPoints(currentJourneyId);
      const totalDistance = calculateTotalDistance(points);
      
      await JourneysModel.completeJourney(currentJourneyId, Date.now(), totalDistance);
      currentJourneyId = null;
      pointSequence = 0;
    }
    
    isTracking = false;
  } catch (error) {
    console.error('Error stopping location tracking:', error);
    throw error;
  }
};

/**
 * Get tracking status
 */
export const getTrackingStatus = () => {
  return {
    isTracking,
    currentJourneyId
  };
};

/**
 * Start a new journey with initial location
 */
const startNewJourney = async (location) => {
  // Create a new journey
  const journeyId = await JourneysModel.createJourney({
    start_time: Date.now(),
    transportation_mode: detectTransportationMode(location)
  });
  
  // Add first point
  await addJourneyPoint(journeyId, location);
  
  // Reset sequence counter
  pointSequence = 1;
  
  return journeyId;
};

/**
 * Process a new location update
 */
const processLocationUpdate = async (location) => {
  if (!currentJourneyId) return;
  
  await addJourneyPoint(currentJourneyId, location);
};

/**
 * Add a location point to the current journey
 */
const addJourneyPoint = async (journeyId, location) => {
  try {
    // Get battery level
    const batteryLevel = await Battery.getBatteryLevelAsync();
    
    await JourneysModel.addJourneyPoint(journeyId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      timestamp: location.timestamp || Date.now(),
      speed: location.coords.speed,
      battery_level: batteryLevel,
      sequence_number: pointSequence++
    });
  } catch (error) {
    console.error('Error adding journey point:', error);
    throw error;
  }
};

/**
 * Detect transportation mode based on speed
 */
const detectTransportationMode = (location) => {
  const speed = location.coords.speed;
  
  if (speed === null || speed === undefined) {
    return 'unknown';
  }
  
  // Convert from m/s to km/h
  const speedKmh = speed * 3.6;
  
  if (speedKmh < 6) {
    return 'walking';
  } else if (speedKmh < 20) {
    return 'cycling';
  } else if (speedKmh < 200) {
    return 'driving';
  } else {
    return 'unknown';
  }
};

/**
 * Calculate total distance of a journey from points
 */
const calculateTotalDistance = (points) => {
  if (!points || points.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];
    
    totalDistance += haversineDistance(
      prevPoint.latitude,
      prevPoint.longitude,
      currentPoint.latitude,
      currentPoint.longitude
    );
  }
  
  return totalDistance;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
};