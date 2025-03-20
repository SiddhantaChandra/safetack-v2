export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const requestBackgroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getBackgroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 0,
    accuracy: 5,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0
  },
  timestamp: Date.now()
});
export const watchPositionAsync = jest.fn().mockReturnValue({
  remove: jest.fn()
});
export const startLocationUpdatesAsync = jest.fn().mockResolvedValue();
export const stopLocationUpdatesAsync = jest.fn().mockResolvedValue();
export const hasStartedLocationUpdatesAsync = jest.fn().mockResolvedValue(false);

export const Accuracy = {
  Balanced: 3,
  High: 4,
  Highest: 5,
  Low: 2,
  Lowest: 1
};

export const ActivityType = {
  Fitness: 1,
  Other: 2,
  Automotive: 3
};