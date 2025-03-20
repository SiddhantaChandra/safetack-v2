import * as SQLite from 'expo-sqlite';

/**
 * SafeTack Database Service
 * Handles local database setup and operations
 */
export class Database {
  static instance = null;
  db = null;

  /**
   * Get singleton database instance
   */
  static getInstance() {
    if (Database.instance === null) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize the database connection
   */
  constructor() {
    this.db = SQLite.openDatabase('safetack.db');
    this.setupTables();
  }

  /**
   * Create all required database tables and indexes
   */
  setupTables() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        // Routes table - Established paths with confidence scores
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS Routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            category TEXT,
            confidence_score REAL DEFAULT 0,
            start_location TEXT,
            end_location TEXT,
            avg_duration INTEGER,
            times_traveled INTEGER DEFAULT 0,
            created_at INTEGER,
            updated_at INTEGER
          );`
        );
        
        // Create index on Routes updated_at for faster sorting
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_routes_updated_at ON Routes(updated_at);`
        );

        // RoutePoints table - GPS coordinates defining route paths
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS RoutePoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER,
            latitude REAL,
            longitude REAL,
            accuracy REAL,
            altitude REAL,
            sequence_number INTEGER,
            FOREIGN KEY (route_id) REFERENCES Routes(id) ON DELETE CASCADE
          );`
        );
        
        // Create indexes for RoutePoints
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_route_points_route_id ON RoutePoints(route_id);`
        );
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_route_points_sequence ON RoutePoints(route_id, sequence_number);`
        );

        // Journeys table - Complete travel sessions with metadata
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS Journeys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matched_route_id INTEGER,
            start_time INTEGER,
            end_time INTEGER,
            distance REAL,
            transportation_mode TEXT,
            has_deviation BOOLEAN DEFAULT 0,
            FOREIGN KEY (matched_route_id) REFERENCES Routes(id)
          );`
        );
        
        // Create indexes for Journeys
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_journeys_matched_route_id ON Journeys(matched_route_id);`
        );
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_journeys_start_time ON Journeys(start_time);`
        );

        // JourneyPoints table - GPS coordinates for individual journeys
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS JourneyPoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journey_id INTEGER,
            latitude REAL,
            longitude REAL,
            accuracy REAL,
            altitude REAL,
            timestamp INTEGER,
            speed REAL,
            battery_level REAL,
            sequence_number INTEGER,
            FOREIGN KEY (journey_id) REFERENCES Journeys(id) ON DELETE CASCADE
          );`
        );
        
        // Create indexes for JourneyPoints
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_journey_points_journey_id ON JourneyPoints(journey_id);`
        );
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_journey_points_sequence ON JourneyPoints(journey_id, sequence_number);`
        );
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_journey_points_timestamp ON JourneyPoints(timestamp);`
        );

        // EmergencyContacts table - Trusted contacts for alerts
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS EmergencyContacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            phone_number TEXT,
            email TEXT,
            relationship TEXT,
            priority INTEGER,
            is_active BOOLEAN DEFAULT 1,
            created_at INTEGER
          );`
        );
        
        // Create index for EmergencyContacts
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active ON EmergencyContacts(is_active, priority);`
        );

        // DeviationEvents table - Record of detected deviations
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS DeviationEvents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journey_id INTEGER,
            latitude REAL,
            longitude REAL,
            timestamp INTEGER,
            deviation_distance REAL,
            alert_sent BOOLEAN DEFAULT 0,
            user_response TEXT,
            FOREIGN KEY (journey_id) REFERENCES Journeys(id) ON DELETE CASCADE
          );`
        );
        
        // Create indexes for DeviationEvents
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_deviation_events_journey_id ON DeviationEvents(journey_id);`
        );
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_deviation_events_response ON DeviationEvents(user_response);`
        );
        
        // Create table for alert events
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS AlertEvents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER,
            deviation_id INTEGER,
            alert_method TEXT,
            timestamp INTEGER,
            message TEXT,
            delivery_status TEXT,
            FOREIGN KEY (contact_id) REFERENCES EmergencyContacts(id),
            FOREIGN KEY (deviation_id) REFERENCES DeviationEvents(id) ON DELETE CASCADE
          );`
        );
        
        // Create index for AlertEvents
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_alert_events_deviation_id ON AlertEvents(deviation_id);`
        );
        
      }, reject, resolve);
    });
  }

  /**
   * Execute a SQL query with parameters
   */
  executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          query, 
          params, 
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  }
}

// Export a singleton database instance
export default Database.getInstance();