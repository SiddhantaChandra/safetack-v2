import database from './database';

// Route-related interfaces
export interface RouteData {
  id?: number;
  name?: string;
  category?: string;
  confidence_score?: number;
  start_location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  end_location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  avg_duration?: number;
  times_traveled?: number;
  created_at?: number;
  updated_at?: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  sequence_number?: number;
}

export interface Route extends RouteData {
  points?: RoutePoint[];
}

// Journey-related interfaces
export interface JourneyData {
  id?: number;
  matched_route_id?: number | null;
  start_time: number;
  end_time?: number | null;
  distance?: number;
  transportation_mode?: string | null;
  has_deviation?: boolean;
}

export interface JourneyPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  timestamp: number;
  speed?: number | null;
  battery_level?: number | null;
  sequence_number: number;
}

export interface DeviationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  deviation_distance: number;
  alert_sent?: boolean;
  user_response?: string | null;
}

// Contact-related interfaces
export interface ContactData {
  name: string;
  phone_number?: string | null;
  email?: string | null;
  relationship?: string | null;
  priority?: number;
  is_active?: boolean;
}

export interface Contact extends ContactData {
  id: number;
  created_at: number;
}

/**
 * Routes Model - Handles operations for user's learned routes
 */
export class RoutesModel {
  /**
   * Create a new route 
   */
  static async createRoute(routeData: RouteData, routePoints: RoutePoint[]): Promise<number> {
    try {
      const now = Date.now();
      
      // Insert route
      const routeResult = await database.executeQuery(
        `INSERT INTO Routes (
          name, category, confidence_score, start_location, end_location, 
          avg_duration, times_traveled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          routeData.name || null,
          routeData.category || null,
          routeData.confidence_score || 0,
          JSON.stringify(routeData.start_location),
          JSON.stringify(routeData.end_location),
          routeData.avg_duration || 0,
          routeData.times_traveled || 1,
          now,
          now
        ]
      );
      
      const routeId = routeResult.insertId;
      
      if (!routeId) {
        throw new Error('Failed to insert route');
      }
      
      // Insert route points
      for (let i = 0; i < routePoints.length; i++) {
        const point = routePoints[i];
        await database.executeQuery(
          `INSERT INTO RoutePoints (
            route_id, latitude, longitude, accuracy, altitude, sequence_number
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            routeId,
            point.latitude,
            point.longitude,
            point.accuracy || null,
            point.altitude || null,
            i
          ]
        );
      }
      
      return routeId;
    } catch (error) {
      console.error('Error creating route:', error);
      throw error;
    }
  }
  
  /**
   * Get all routes
   */
  static async getRoutes(): Promise<Route[]> {
    try {
      const result = await database.executeQuery('SELECT * FROM Routes ORDER BY updated_at DESC');
      return result.rows._array;
    } catch (error) {
      console.error('Error getting routes:', error);
      throw error;
    }
  }
  
  /**
   * Get a route by ID including all route points
   */
  static async getRouteWithPoints(routeId: number): Promise<Route | null> {
    try {
      const routeResult = await database.executeQuery(
        'SELECT * FROM Routes WHERE id = ?',
        [routeId]
      );
      
      if (routeResult.rows.length === 0) {
        return null;
      }
      
      const route = routeResult.rows._array[0] as Route;
      
      const pointsResult = await database.executeQuery(
        'SELECT * FROM RoutePoints WHERE route_id = ? ORDER BY sequence_number',
        [routeId]
      );
      
      route.points = pointsResult.rows._array as RoutePoint[];
      return route;
    } catch (error) {
      console.error(`Error getting route with ID ${routeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update route confidence score and metadata
   */
  static async updateRouteConfidence(routeId: number, newConfidenceScore: number, newAvgDuration: number): Promise<void> {
    try {
      await database.executeQuery(
        `UPDATE Routes SET 
          confidence_score = ?,
          avg_duration = ?,
          times_traveled = times_traveled + 1,
          updated_at = ?
        WHERE id = ?`,
        [newConfidenceScore, newAvgDuration, Date.now(), routeId]
      );
    } catch (error) {
      console.error(`Error updating route confidence for ID ${routeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a route and all its points
   */
  static async deleteRoute(routeId: number): Promise<void> {
    try {
      await database.executeQuery('DELETE FROM Routes WHERE id = ?', [routeId]);
    } catch (error) {
      console.error(`Error deleting route with ID ${routeId}:`, error);
      throw error;
    }
  }
}

/**
 * Journeys Model - Handles operations for user journeys
 */
export class JourneysModel {
  /**
   * Create a new journey
   */
  static async createJourney(journeyData: JourneyData): Promise<number> {
    try {
      const result = await database.executeQuery(
        `INSERT INTO Journeys (
          matched_route_id, start_time, end_time, distance, 
          transportation_mode, has_deviation
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          journeyData.matched_route_id || null,
          journeyData.start_time,
          journeyData.end_time || null,
          journeyData.distance || 0,
          journeyData.transportation_mode || null,
          journeyData.has_deviation ? 1 : 0
        ]
      );
      
      if (!result.insertId) {
        throw new Error('Failed to insert journey');
      }
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating journey:', error);
      throw error;
    }
  }
  
  /**
   * Add location point to an existing journey
   */
  static async addJourneyPoint(journeyId: number, pointData: JourneyPoint): Promise<void> {
    try {
      await database.executeQuery(
        `INSERT INTO JourneyPoints (
          journey_id, latitude, longitude, accuracy, altitude,
          timestamp, speed, battery_level, sequence_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          journeyId,
          pointData.latitude,
          pointData.longitude,
          pointData.accuracy || null,
          pointData.altitude || null,
          pointData.timestamp,
          pointData.speed || null,
          pointData.battery_level || null,
          pointData.sequence_number
        ]
      );
    } catch (error) {
      console.error(`Error adding point to journey ID ${journeyId}:`, error);
      throw error;
    }
  }
  
  /**
   * Complete a journey by setting its end time
   */
  static async completeJourney(journeyId: number, endTime: number, distance: number, matchedRouteId: number | null = null): Promise<void> {
    try {
      await database.executeQuery(
        `UPDATE Journeys SET 
          end_time = ?, 
          distance = ?,
          matched_route_id = ?
        WHERE id = ?`,
        [endTime, distance, matchedRouteId, journeyId]
      );
    } catch (error) {
      console.error(`Error completing journey ID ${journeyId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get journey points for a specific journey
   */
  static async getJourneyPoints(journeyId?: number): Promise<JourneyPoint[]> {
    try {
      if (!journeyId) {
        return [];
      }
      
      const result = await database.executeQuery(
        'SELECT * FROM JourneyPoints WHERE journey_id = ? ORDER BY sequence_number',
        [journeyId]
      );
      
      return result.rows._array as JourneyPoint[];
    } catch (error) {
      console.error(`Error getting points for journey ID ${journeyId}:`, error);
      throw error;
    }
  }
  
  /**
   * Record a deviation event
   */
  static async recordDeviation(journeyId: number, deviationData: DeviationData): Promise<number> {
    try {
      const result = await database.executeQuery(
        `INSERT INTO DeviationEvents (
          journey_id, latitude, longitude, timestamp,
          deviation_distance, alert_sent, user_response
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          journeyId,
          deviationData.latitude,
          deviationData.longitude,
          deviationData.timestamp,
          deviationData.deviation_distance,
          deviationData.alert_sent ? 1 : 0,
          deviationData.user_response || null
        ]
      );
      
      // Update the journey to mark it as having a deviation
      await database.executeQuery(
        'UPDATE Journeys SET has_deviation = 1 WHERE id = ?',
        [journeyId]
      );
      
      if (!result.insertId) {
        throw new Error('Failed to insert deviation');
      }
      
      return result.insertId;
    } catch (error) {
      console.error(`Error recording deviation for journey ID ${journeyId}:`, error);
      throw error;
    }
  }
}

/**
 * Contacts Model - Handles operations for emergency contacts
 */
export class ContactsModel {
  /**
   * Create a new emergency contact
   */
  static async createContact(contactData: ContactData): Promise<number> {
    try {
      const result = await database.executeQuery(
        `INSERT INTO EmergencyContacts (
          name, phone_number, email, relationship, priority, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          contactData.name,
          contactData.phone_number || null,
          contactData.email || null,
          contactData.relationship || null,
          contactData.priority || 1,
          contactData.is_active !== undefined ? (contactData.is_active ? 1 : 0) : 1,
          Date.now()
        ]
      );
      
      if (!result.insertId) {
        throw new Error('Failed to insert contact');
      }
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }
  
  /**
   * Get all emergency contacts
   */
  static async getContacts(): Promise<Contact[]> {
    try {
      const result = await database.executeQuery(
        'SELECT * FROM EmergencyContacts ORDER BY priority'
      );
      
      return result.rows._array as Contact[];
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }
  
  /**
   * Update an emergency contact
   */
  static async updateContact(contactId: number, contactData: ContactData): Promise<void> {
    try {
      await database.executeQuery(
        `UPDATE EmergencyContacts SET
          name = ?,
          phone_number = ?,
          email = ?,
          relationship = ?,
          priority = ?,
          is_active = ?
        WHERE id = ?`,
        [
          contactData.name,
          contactData.phone_number || null,
          contactData.email || null,
          contactData.relationship || null,
          contactData.priority || 1,
          contactData.is_active !== undefined ? (contactData.is_active ? 1 : 0) : 1,
          contactId
        ]
      );
    } catch (error) {
      console.error(`Error updating contact ID ${contactId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an emergency contact
   */
  static async deleteContact(contactId: number): Promise<void> {
    try {
      await database.executeQuery(
        'DELETE FROM EmergencyContacts WHERE id = ?',
        [contactId]
      );
    } catch (error) {
      console.error(`Error deleting contact ID ${contactId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get active emergency contacts
   */
  static async getActiveContacts(): Promise<Contact[]> {
    try {
      const result = await database.executeQuery(
        'SELECT * FROM EmergencyContacts WHERE is_active = 1 ORDER BY priority'
      );
      
      return result.rows._array as Contact[];
    } catch (error) {
      console.error('Error getting active contacts:', error);
      throw error;
    }
  }
}