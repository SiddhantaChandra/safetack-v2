import { createClient } from '@supabase/supabase-js';
import { ContactsModel, RoutesModel, Contact, Route } from '../database/models';
import Constants from 'expo-constants';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

interface SyncResult {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
}

interface AlertData {
  latitude: number;
  longitude: number;
  deviation_distance: number;
  contacts_notified: number[];
  route_id?: number;
  journey_id?: number;
  user_response?: string | null;
}

interface AlertResult {
  success: boolean;
  id?: number;
  message?: string;
  error?: string;
}

/**
 * Synchronize local emergency contacts with Supabase
 * @returns {Promise<SyncResult>} Sync result object
 */
export const syncEmergencyContacts = async (): Promise<SyncResult> => {
  try {
    // Get local contacts
    const localContacts = await ContactsModel.getContacts();
    
    // Get user ID (in a real app, this would come from authentication)
    const userId = 'demo-user';
    
    // Upload contacts to Supabase
    const { data, error } = await supabase
      .from('emergency_contacts')
      .upsert(
        localContacts.map(contact => ({
          id: contact.id,
          user_id: userId,
          name: contact.name,
          phone_number: contact.phone_number,
          email: contact.email,
          relationship: contact.relationship,
          priority: contact.priority,
          is_active: contact.is_active === 1,
          created_at: new Date(contact.created_at).toISOString()
        })),
        { onConflict: 'user_id, id' }
      );
    
    if (error) throw error;
    
    return {
      success: true,
      count: localContacts.length,
      message: `Successfully synced ${localContacts.length} contacts`
    };
  } catch (error: any) {
    console.error('Error syncing contacts to Supabase:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Synchronize routes with Supabase for backup
 * @returns {Promise<SyncResult>} Sync result object
 */
export const syncRoutes = async (): Promise<SyncResult> => {
  try {
    // Get local routes
    const localRoutes = await RoutesModel.getRoutes();
    
    // Get user ID (in a real app, this would come from authentication)
    const userId = 'demo-user';
    
    // Prepare routes for upload
    const routesForSync = [];
    
    for (const route of localRoutes) {
      // Only sync routes with high confidence
      if (route.confidence_score && route.confidence_score >= 0.5) {
        const routeWithPoints = await RoutesModel.getRouteWithPoints(route.id!);
        
        if (routeWithPoints) {
          routesForSync.push({
            id: route.id,
            user_id: userId,
            name: route.name,
            category: route.category,
            confidence_score: route.confidence_score,
            start_location: route.start_location,
            end_location: route.end_location,
            avg_duration: route.avg_duration,
            times_traveled: route.times_traveled,
            points: routeWithPoints.points,
            created_at: new Date(route.created_at || 0).toISOString(),
            updated_at: new Date(route.updated_at || 0).toISOString(),
          });
        }
      }
    }
    
    // Upload routes to Supabase
    const { data, error } = await supabase
      .from('routes')
      .upsert(
        routesForSync,
        { onConflict: 'user_id, id' }
      );
    
    if (error) throw error;
    
    return {
      success: true,
      count: routesForSync.length,
      message: `Successfully synced ${routesForSync.length} routes`
    };
  } catch (error: any) {
    console.error('Error syncing routes to Supabase:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Record an emergency alert event in Supabase
 * @param {AlertData} alertData - Alert data
 * @returns {Promise<AlertResult>} Result object
 */
export const recordAlertEvent = async (alertData: AlertData): Promise<AlertResult> => {
  try {
    // Get user ID (in a real app, this would come from authentication)
    const userId = 'demo-user';
    
    // Record the alert in Supabase
    const { data, error } = await supabase
      .from('alert_events')
      .insert({
        user_id: userId,
        latitude: alertData.latitude,
        longitude: alertData.longitude,
        deviation_distance: alertData.deviation_distance,
        contacts_notified: alertData.contacts_notified,
        route_id: alertData.route_id,
        journey_id: alertData.journey_id,
        user_response: alertData.user_response || null,
        timestamp: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    return {
      success: true,
      id: data?.[0]?.id,
      message: 'Alert recorded successfully'
    };
  } catch (error: any) {
    console.error('Error recording alert event:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default supabase;