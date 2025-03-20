/**
 * SafeTack Helper Utilities
 */

/**
 * Format distance for user display
 * @param distanceInMeters - Distance in meters
 * @returns Formatted distance string
 */
export const formatDistance = (distanceInMeters?: number): string => {
  if (distanceInMeters === undefined || distanceInMeters === null) return 'Unknown';
  
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} meters`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }
};

/**
 * Format duration from milliseconds to readable string
 * @param duration - Duration in milliseconds
 * @returns Formatted duration string
 */
export const formatDuration = (duration?: number): string => {
  if (duration === null || duration === undefined) return 'Unknown';
  
  const totalMinutes = Math.floor(duration / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} min`;
  }
};

/**
 * Format date for display
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export const formatDate = (timestamp?: number): string => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Format time for display
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
export const formatTime = (timestamp?: number): string => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

interface LocationPoint {
  latitude: number;
  longitude: number;
  name?: string;
}

/**
 * Generate a descriptive name for a route
 * @param startPoint - Start location with coordinates
 * @param endPoint - End location with coordinates
 * @returns Generated route name
 */
export const generateRouteName = (startPoint?: LocationPoint, endPoint?: LocationPoint): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
  
  return `Route ${formatter.format(new Date())}`;
};

/**
 * Calculate confidence level text based on score
 * @param score - Confidence score between 0 and 1
 * @returns Confidence level text
 */
export const getConfidenceText = (score?: number): string => {
  if (!score && score !== 0) return 'Unknown';
  
  if (score >= 0.8) return 'Very High';
  if (score >= 0.6) return 'High';
  if (score >= 0.4) return 'Medium';
  if (score >= 0.2) return 'Low';
  return 'Very Low';
};

/**
 * Calculate confidence color based on score
 * @param score - Confidence score between 0 and 1
 * @returns Hex color code
 */
export const getConfidenceColor = (score?: number): string => {
  if (!score && score !== 0) return '#F44336'; // Default to red
  
  if (score >= 0.8) return '#4CAF50'; // Green
  if (score >= 0.6) return '#8BC34A'; // Light Green
  if (score >= 0.4) return '#FFC107'; // Amber
  if (score >= 0.2) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

/**
 * Detect transportation mode based on speed
 * @param speedMps - Speed in meters per second
 * @returns Detected transportation mode
 */
export const detectTransportationMode = (speedMps?: number): string => {
  if (speedMps === null || speedMps === undefined) {
    return 'unknown';
  }
  
  // Convert from m/s to km/h
  const speedKmh = speedMps * 3.6;
  
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
 * Get human readable name for transportation mode
 * @param mode - Transportation mode code
 * @returns Human readable name
 */
export const getTransportationName = (mode?: string): string => {
  if (!mode) return 'Unknown';
  
  const modes: Record<string, string> = {
    'walking': 'Walking',
    'cycling': 'Cycling',
    'driving': 'Driving',
    'unknown': 'Unknown'
  };
  
  return modes[mode] || 'Unknown';
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export const haversineDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
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