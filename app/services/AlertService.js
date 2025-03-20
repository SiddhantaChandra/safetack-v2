import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ContactsModel } from '../database/models';
import database from '../database/database';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Alert severity levels
export const AlertSeverity = {
  LOW: 'low',         // Minor deviation, just notify user
  MEDIUM: 'medium',   // Significant deviation, notify user with action required
  HIGH: 'high'        // Major deviation or no response, alert contacts
};

/**
 * Initialize alert system
 */
export const initializeAlerts = async () => {
  try {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Permission to send notifications was denied');
    }
    
    // Set up notification categories/actions for user responses
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('deviation', [
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            isDestructive: false,
          },
        },
        {
          identifier: 'confirm',
          buttonTitle: 'I Need Help',
          options: {
            isDestructive: true,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze (15 min)',
          options: {
            isDestructive: false,
          },
        },
      ]);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing alerts:', error);
    return false;
  }
};

/**
 * Handle a route deviation by notifying user and/or contacts
 */
export const handleDeviation = async (deviationData, severity = AlertSeverity.MEDIUM) => {
  try {
    // Mark deviation as having alert sent
    await database.executeQuery(
      'UPDATE DeviationEvents SET alert_sent = 1 WHERE id = ?',
      [deviationData.deviationId]
    );
    
    // For LOW severity, just notify the user
    if (severity === AlertSeverity.LOW) {
      await notifyUser(deviationData, false);
      return {
        success: true,
        alertLevel: 'user',
        notificationId: null
      };
    }
    
    // For MEDIUM severity, notify user with required response
    if (severity === AlertSeverity.MEDIUM) {
      const notificationId = await notifyUser(deviationData, true);
      
      // Set up a timeout to escalate if no response
      setTimeout(async () => {
        try {
          // Check if the deviation has been responded to
          const result = await database.executeQuery(
            'SELECT user_response FROM DeviationEvents WHERE id = ?',
            [deviationData.deviationId]
          );
          
          const userResponse = result.rows._array[0]?.user_response;
          
          // If no response, escalate to emergency contacts
          if (!userResponse) {
            await alertEmergencyContacts(deviationData);
            
            // Update the deviation with auto-escalation
            await database.executeQuery(
              'UPDATE DeviationEvents SET user_response = ? WHERE id = ?',
              ['auto_escalated', deviationData.deviationId]
            );
          }
        } catch (error) {
          console.error('Error in auto-escalation timeout:', error);
        }
      }, 60000); // 1 minute timeout for response
      
      return {
        success: true,
        alertLevel: 'user_with_timeout',
        notificationId
      };
    }
    
    // For HIGH severity, immediately alert emergency contacts
    if (severity === AlertSeverity.HIGH) {
      await notifyUser(deviationData, false);
      await alertEmergencyContacts(deviationData);
      
      return {
        success: true,
        alertLevel: 'emergency',
        notificationId: null
      };
    }
  } catch (error) {
    console.error('Error handling deviation alert:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Notify user of deviation
 */
const notifyUser = async (deviationData, requireResponse = false) => {
  try {
    // Format distance nicely
    const distanceText = formatDistance(deviationData.distance);
    
    // Prepare notification content
    const notificationContent = {
      title: 'Route Deviation Detected',
      body: `You are ${distanceText} away from your expected route.`,
      data: {
        deviationId: deviationData.deviationId,
        journeyId: deviationData.journeyId,
        routeId: deviationData.routeId,
        type: 'deviation'
      },
    };
    
    // Add category and priority for actionable notifications
    if (requireResponse) {
      notificationContent.categoryIdentifier = 'deviation';
      notificationContent.priority = 'high';
      
      // Android specific settings
      if (Platform.OS === 'android') {
        notificationContent.sticky = true;
        notificationContent.autoDismiss = false;
      }
    }
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Send immediately
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error sending user notification:', error);
    throw error;
  }
};

/**
 * Alert emergency contacts about a deviation
 */
const alertEmergencyContacts = async (deviationData) => {
  try {
    // Get active emergency contacts
    const contacts = await ContactsModel.getActiveContacts();
    if (!contacts || contacts.length === 0) {
      console.warn('No emergency contacts available to alert');
      return;
    }
    
    // In a real app, this would send SMS, email, or use a third-party service
    // For now, we'll just simulate the alerts and log them
    
    for (const contact of contacts) {
      console.log(`ALERT to ${contact.name}: User has deviated from their expected route.`);
      
      // Simulate sending SMS
      if (contact.phone_number) {
        // This would be implemented with a real SMS service
        console.log(`Simulated SMS to ${contact.phone_number}`);
      }
      
      // Simulate sending email
      if (contact.email) {
        // This would be implemented with a real email service
        console.log(`Simulated Email to ${contact.email}`);
      }
      
      // Record this alert in the database
      await database.executeQuery(
        `INSERT INTO AlertEvents (
          contact_id, deviation_id, alert_method, timestamp, message
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          contact.id,
          deviationData.deviationId,
          contact.phone_number ? 'sms' : 'email',
          Date.now(),
          generateAlertMessage(deviationData, contact)
        ]
      );
    }
    
    return contacts.length;
  } catch (error) {
    console.error('Error alerting emergency contacts:', error);
    throw error;
  }
};

/**
 * Handle user response to a deviation notification
 */
export const handleDeviationResponse = async (deviationId, response) => {
  try {
    // Update the deviation record with the user's response
    await database.executeQuery(
      'UPDATE DeviationEvents SET user_response = ? WHERE id = ?',
      [response, deviationId]
    );
    
    // If confirmed emergency, alert contacts
    if (response === 'confirm') {
      // Get the deviation data
      const result = await database.executeQuery(
        `SELECT d.*, j.matched_route_id 
         FROM DeviationEvents d
         JOIN Journeys j ON d.journey_id = j.id
         WHERE d.id = ?`,
        [deviationId]
      );
      
      if (result.rows.length > 0) {
        const deviationData = result.rows._array[0];
        
        await alertEmergencyContacts({
          deviationId,
          journeyId: deviationData.journey_id,
          routeId: deviationData.matched_route_id,
          distance: deviationData.deviation_distance,
          latitude: deviationData.latitude,
          longitude: deviationData.longitude
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error handling deviation response:', error);
    return false;
  }
};

/**
 * Format distance for user display
 */
const formatDistance = (distanceInMeters) => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} meters`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)} km`;
  }
};

/**
 * Generate alert message for emergency contacts
 */
const generateAlertMessage = (deviationData, contact) => {
  return `ALERT: SafeTack has detected that your contact has deviated significantly from their usual route. They are currently located at https://maps.google.com/?q=${deviationData.latitude},${deviationData.longitude}. Please try to contact them to check on their safety.`;
};