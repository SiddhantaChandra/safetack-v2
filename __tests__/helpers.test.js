import {
  formatDistance,
  formatDuration,
  formatDate,
  getConfidenceText,
  getConfidenceColor,
  detectTransportationMode,
  haversineDistance
} from '../app/utils/helpers';

describe('Helper Utilities', () => {
  describe('formatDistance', () => {
    it('formats distances in meters correctly', () => {
      expect(formatDistance(500)).toBe('500 meters');
      expect(formatDistance(50)).toBe('50 meters');
      expect(formatDistance(999)).toBe('999 meters');
    });

    it('formats distances in kilometers correctly', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(1500)).toBe('1.5 km');
      expect(formatDistance(2750)).toBe('2.8 km');
    });

    it('handles edge cases', () => {
      expect(formatDistance(0)).toBe('0 meters');
      expect(formatDistance(null)).toBe('Unknown');
      expect(formatDistance(undefined)).toBe('Unknown');
    });
  });

  describe('formatDuration', () => {
    it('formats durations in minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1 min');    // 1 minute
      expect(formatDuration(300000)).toBe('5 min');   // 5 minutes
      expect(formatDuration(540000)).toBe('9 min');   // 9 minutes
    });

    it('formats durations in hours and minutes correctly', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');        // 1 hour
      expect(formatDuration(3660000)).toBe('1h 1m');        // 1 hour, 1 minute
      expect(formatDuration(7230000)).toBe('2h 0m');        // 2 hours, 3 minutes (floored)
      expect(formatDuration(9000000)).toBe('2h 30m');       // 2 hours, 30 minutes
    });

    it('handles edge cases', () => {
      expect(formatDuration(0)).toBe('0 min');
      expect(formatDuration(null)).toBe('Unknown');
      expect(formatDuration(undefined)).toBe('Unknown');
    });
  });

  describe('formatDate', () => {
    it('formats timestamps correctly', () => {
      const mockDate = new Date('2023-05-15');
      const timestamp = mockDate.getTime();
      
      // This test may fail in different timezones or locale settings
      // We're just checking that it returns something that looks like a date
      expect(formatDate(timestamp)).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    });

    it('handles edge cases', () => {
      expect(formatDate(null)).toBe('Unknown');
      expect(formatDate(undefined)).toBe('Unknown');
    });
  });

  describe('getConfidenceText', () => {
    it('returns correct confidence level text based on score', () => {
      expect(getConfidenceText(0.9)).toBe('Very High');
      expect(getConfidenceText(0.7)).toBe('High');
      expect(getConfidenceText(0.5)).toBe('Medium');
      expect(getConfidenceText(0.3)).toBe('Low');
      expect(getConfidenceText(0.1)).toBe('Very Low');
    });

    it('handles edge cases', () => {
      expect(getConfidenceText(1)).toBe('Very High');
      expect(getConfidenceText(0)).toBe('Very Low');
    });
  });

  describe('getConfidenceColor', () => {
    it('returns correct color for confidence levels', () => {
      expect(getConfidenceColor(0.9)).toBe('#4CAF50'); // Green
      expect(getConfidenceColor(0.7)).toBe('#8BC34A'); // Light Green
      expect(getConfidenceColor(0.5)).toBe('#FFC107'); // Amber
      expect(getConfidenceColor(0.3)).toBe('#FF9800'); // Orange
      expect(getConfidenceColor(0.1)).toBe('#F44336'); // Red
    });

    it('handles edge cases', () => {
      expect(getConfidenceColor(1)).toBe('#4CAF50');
      expect(getConfidenceColor(0)).toBe('#F44336');
    });
  });

  describe('detectTransportationMode', () => {
    it('detects correct transportation mode based on speed', () => {
      expect(detectTransportationMode(1.5)).toBe('walking');        // 5.4 km/h
      expect(detectTransportationMode(5)).toBe('cycling');          // 18 km/h
      expect(detectTransportationMode(15)).toBe('driving');         // 54 km/h
      expect(detectTransportationMode(50)).toBe('driving');         // 180 km/h
      expect(detectTransportationMode(70)).toBe('unknown');         // 252 km/h
    });

    it('handles edge cases', () => {
      expect(detectTransportationMode(null)).toBe('unknown');
      expect(detectTransportationMode(undefined)).toBe('unknown');
      expect(detectTransportationMode(0)).toBe('walking');
    });
  });

  describe('haversineDistance', () => {
    it('calculates distances correctly', () => {
      // New York to Los Angeles: ~3,940 km
      const newYork = [40.7128, -74.0060];
      const losAngeles = [34.0522, -118.2437];
      
      const distance = haversineDistance(
        newYork[0], newYork[1], 
        losAngeles[0], losAngeles[1]
      );
      
      // Allow some margin of error in the calculation
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('returns 0 for identical coordinates', () => {
      const coordinates = [40.7128, -74.0060];
      
      const distance = haversineDistance(
        coordinates[0], coordinates[1], 
        coordinates[0], coordinates[1]
      );
      
      expect(distance).toBe(0);
    });
  });
});