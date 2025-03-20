/**
 * SafeTack Helper Utilities
 */

/**
 * Format distance for user display
 * @param {number} distanceInMeters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceInMeters) => {
  if (!distanceInMeters && distanceInMeters !== 0) return 'Unknown';
  
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} meters`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }
};

/**
 * Format duration from milliseconds to readable string
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (duration) => {
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
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Format time for display
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time string
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Generate a descriptive name for a route
 * @param {Object} startPoint - Start location with coordinates
 * @param {Object} endPoint - End location with coordinates
 * @returns {string} Generated route name
 */
export const generateRouteName = (startPoint, endPoint) => {
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
 * @param {number} score - Confidence score between 0 and 1
 * @returns {string} Confidence level text
 */
export const getConfidenceText = (score) => {
  if (score >= 0.8) return 'Very High';
  if (score >= 0.6) return 'High';
  if (score >= 0.4) return 'Medium';
  if (score >= 0.2) return 'Low';
  return 'Very Low';
};

/**
 * Calculate confidence color based on score
 * @param {number} score - Confidence score between 0 and 1
 * @returns {string} Hex color code
 */
export const getConfidenceColor = (score) => {
  if (score >= 0.8) return '#4CAF50'; // Green
  if (score >= 0.6) return '#8BC34A'; // Light Green
  if (score >= 0.4) return '#FFC107'; // Amber
  if (score >= 0.2) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

/**
 * Detect transportation mode based on speed
 * @param {number} speedMps - Speed in meters per second
 * @returns {string} Detected transportation mode
 */
export const detectTransportationMode = (speedMps) => {
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
 * @param {string} mode - Transportation mode code
 * @returns {string} Human readable name
 */
export const getTransportationName = (mode) => {
  const modes = {
    'walking': 'Walking',
    'cycling': 'Cycling',
    'driving': 'Driving',
    'unknown': 'Unknown'
  };
  
  return modes[mode] || 'Unknown';
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
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