import database from '../database/database';

/**
 * SafeTack Data Retention Service
 * Handles cleaning up old data to keep database size manageable
 */

// Default data retention periods (in milliseconds)
const DEFAULT_RETENTION_PERIODS = {
  journeyPoints: 30 * 24 * 60 * 60 * 1000, // 30 days
  journeys: 90 * 24 * 60 * 60 * 1000,      // 90 days
  deviationEvents: 90 * 24 * 60 * 60 * 1000, // 90 days
  alertEvents: 90 * 24 * 60 * 60 * 1000    // 90 days
};

/**
 * Clean up old journey points that exceed retention period
 * @param {number} retentionPeriod Time in milliseconds to keep journey points
 * @returns {Promise<number>} Number of deleted points
 */
export const cleanupJourneyPoints = async (retentionPeriod = DEFAULT_RETENTION_PERIODS.journeyPoints) => {
  try {
    const cutoffTime = Date.now() - retentionPeriod;
    
    // Delete journey points older than cutoff time
    const result = await database.executeQuery(
      `DELETE FROM JourneyPoints
       WHERE timestamp < ?
       AND journey_id IN (
         SELECT id FROM Journeys
         WHERE end_time IS NOT NULL
       )`,
      [cutoffTime]
    );
    
    return result.rowsAffected;
  } catch (error) {
    console.error('Error cleaning up journey points:', error);
    throw error;
  }
};

/**
 * Clean up old journeys that exceed retention period
 * @param {number} retentionPeriod Time in milliseconds to keep journeys
 * @returns {Promise<number>} Number of deleted journeys
 */
export const cleanupJourneys = async (retentionPeriod = DEFAULT_RETENTION_PERIODS.journeys) => {
  try {
    const cutoffTime = Date.now() - retentionPeriod;
    
    // Delete journeys older than cutoff time and not part of a route
    const result = await database.executeQuery(
      `DELETE FROM Journeys
       WHERE end_time < ?
       AND (matched_route_id IS NULL OR matched_route_id = 0)`,
      [cutoffTime]
    );
    
    return result.rowsAffected;
  } catch (error) {
    console.error('Error cleaning up journeys:', error);
    throw error;
  }
};

/**
 * Clean up old deviation events that exceed retention period
 * @param {number} retentionPeriod Time in milliseconds to keep deviation events
 * @returns {Promise<number>} Number of deleted events
 */
export const cleanupDeviationEvents = async (retentionPeriod = DEFAULT_RETENTION_PERIODS.deviationEvents) => {
  try {
    const cutoffTime = Date.now() - retentionPeriod;
    
    // Delete deviation events older than cutoff time
    const result = await database.executeQuery(
      `DELETE FROM DeviationEvents
       WHERE timestamp < ?`,
      [cutoffTime]
    );
    
    return result.rowsAffected;
  } catch (error) {
    console.error('Error cleaning up deviation events:', error);
    throw error;
  }
};

/**
 * Clean up old alert events that exceed retention period
 * @param {number} retentionPeriod Time in milliseconds to keep alert events
 * @returns {Promise<number>} Number of deleted events
 */
export const cleanupAlertEvents = async (retentionPeriod = DEFAULT_RETENTION_PERIODS.alertEvents) => {
  try {
    const cutoffTime = Date.now() - retentionPeriod;
    
    // Delete alert events older than cutoff time
    const result = await database.executeQuery(
      `DELETE FROM AlertEvents
       WHERE timestamp < ?`,
      [cutoffTime]
    );
    
    return result.rowsAffected;
  } catch (error) {
    console.error('Error cleaning up alert events:', error);
    throw error;
  }
};

/**
 * Run a comprehensive cleanup of all old data
 * @param {Object} retentionPeriods Custom retention periods (optional)
 * @returns {Promise<Object>} Summary of cleanup results
 */
export const runComprehensiveCleanup = async (retentionPeriods = DEFAULT_RETENTION_PERIODS) => {
  try {
    // Run cleanup operations in sequence
    const journeyPointsDeleted = await cleanupJourneyPoints(retentionPeriods.journeyPoints);
    const journeysDeleted = await cleanupJourneys(retentionPeriods.journeys);
    const deviationEventsDeleted = await cleanupDeviationEvents(retentionPeriods.deviationEvents);
    const alertEventsDeleted = await cleanupAlertEvents(retentionPeriods.alertEvents);
    
    // Run VACUUM to reclaim space
    await database.executeQuery('VACUUM');
    
    return {
      success: true,
      journeyPointsDeleted,
      journeysDeleted,
      deviationEventsDeleted,
      alertEventsDeleted,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error running comprehensive cleanup:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
};

/**
 * Schedule periodic cleanup based on specified interval
 * @param {number} intervalMs Time in milliseconds between cleanups
 * @returns {Function} Function to cancel the scheduled cleanup
 */
export const schedulePeriodicCleanup = (intervalMs = 24 * 60 * 60 * 1000) => { // Default: daily
  const interval = setInterval(async () => {
    try {
      console.log('Running scheduled data cleanup');
      await runComprehensiveCleanup();
      console.log('Scheduled data cleanup completed');
    } catch (error) {
      console.error('Error in scheduled data cleanup:', error);
    }
  }, intervalMs);
  
  // Return function to cancel the interval
  return () => clearInterval(interval);
};

export default {
  cleanupJourneyPoints,
  cleanupJourneys,
  cleanupDeviationEvents,
  cleanupAlertEvents,
  runComprehensiveCleanup,
  schedulePeriodicCleanup,
  DEFAULT_RETENTION_PERIODS
};