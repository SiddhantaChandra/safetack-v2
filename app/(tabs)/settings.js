import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Switch, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Linking,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useSafety } from '../contexts/SafetyContext';
import { useUser } from '../contexts/UserContext';
import database from '../database/database';
import { syncEmergencyContacts, syncRoutes } from '../services/SupabaseService';

export default function SettingsScreen() {
  const { locationPermission, notificationPermission, requestPermissions } = useSafety();
  const { user, signOut, isGuest, setGuest } = useUser();
  const [syncLoading, setSyncLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    deviationThreshold: 100, // meters
    alertTimeout: 60, // seconds
    trackingFrequency: 'balanced', // 'high', 'balanced', 'low'
    batteryOptimization: true,
    pauseDuringNight: true,
    nightStartHour: 23,
    nightEndHour: 6,
    autoSyncToCloud: false,
    dataRetentionDays: 30
  });

  // Toggle a boolean setting
  const toggleSetting = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key]
    });
    
    // Save to local storage or database in real app
    // This is a simplified implementation
    console.log(`Setting ${key} changed to ${!settings[key]}`);
  };
  
  // Handle tracking frequency change
  const handleFrequencyChange = (value) => {
    setSettings({
      ...settings,
      trackingFrequency: value
    });
    
    // Save to local storage or database in real app
    console.log(`Tracking frequency changed to ${value}`);
  };
  
  // Handle sync with Supabase
  const handleSyncData = async () => {
    try {
      setSyncLoading(true);
      
      // Sync contacts and routes
      const contactsResult = await syncEmergencyContacts();
      const routesResult = await syncRoutes();
      
      setSyncLoading(false);
      
      if (contactsResult.success && routesResult.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${contactsResult.count} contacts and ${routesResult.count} routes to your cloud account.`
        );
      } else {
        Alert.alert(
          'Sync Error',
          'There was a problem syncing your data. Please try again later.'
        );
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      setSyncLoading(false);
      Alert.alert('Error', 'Failed to sync data');
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      const { success, error } = await signOut();
      
      if (!success) {
        throw error || new Error('Failed to sign out');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };
  
  // Clear all data
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your routes, journeys, and tracking data. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real app, this would clear all tables
              // This is a simplified implementation
              await database.executeQuery('DELETE FROM Journeys');
              await database.executeQuery('DELETE FROM JourneyPoints');
              await database.executeQuery('DELETE FROM Routes');
              await database.executeQuery('DELETE FROM RoutePoints');
              await database.executeQuery('DELETE FROM DeviationEvents');
              
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Permission section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location</Text>
              <Text style={styles.settingDescription}>
                Required for tracking your routes
              </Text>
            </View>
            
            <View style={styles.permissionStatus}>
              {locationPermission?.foreground && locationPermission?.background ? (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              ) : (
                <TouchableOpacity 
                  style={styles.permissionButton}
                  onPress={requestPermissions}
                >
                  <Text style={styles.permissionButtonText}>Grant</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Required for alerts and reminders
              </Text>
            </View>
            
            <View style={styles.permissionStatus}>
              {notificationPermission ? (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              ) : (
                <TouchableOpacity 
                  style={styles.permissionButton}
                  onPress={requestPermissions}
                >
                  <Text style={styles.permissionButtonText}>Grant</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* Alert settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Alerts</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Deviation Threshold</Text>
              <Text style={styles.settingDescription}>
                Distance to trigger deviation alerts
              </Text>
            </View>
            
            <View style={styles.valueSelector}>
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.deviationThreshold === 50 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, deviationThreshold: 50})}
              >
                <Text style={settings.deviationThreshold === 50 ? styles.selectedValueText : styles.valueText}>
                  50m
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.deviationThreshold === 100 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, deviationThreshold: 100})}
              >
                <Text style={settings.deviationThreshold === 100 ? styles.selectedValueText : styles.valueText}>
                  100m
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.deviationThreshold === 200 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, deviationThreshold: 200})}
              >
                <Text style={settings.deviationThreshold === 200 ? styles.selectedValueText : styles.valueText}>
                  200m
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Alert Timeout</Text>
              <Text style={styles.settingDescription}>
                Time before alerting emergency contacts
              </Text>
            </View>
            
            <View style={styles.valueSelector}>
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.alertTimeout === 30 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, alertTimeout: 30})}
              >
                <Text style={settings.alertTimeout === 30 ? styles.selectedValueText : styles.valueText}>
                  30s
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.alertTimeout === 60 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, alertTimeout: 60})}
              >
                <Text style={settings.alertTimeout === 60 ? styles.selectedValueText : styles.valueText}>
                  60s
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.alertTimeout === 120 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, alertTimeout: 120})}
              >
                <Text style={settings.alertTimeout === 120 ? styles.selectedValueText : styles.valueText}>
                  2m
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Battery optimization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Battery & Performance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Tracking Precision</Text>
              <Text style={styles.settingDescription}>
                Higher precision uses more battery
              </Text>
            </View>
            
            <View style={styles.valueSelector}>
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.trackingFrequency === 'high' && styles.selectedValue
                ]}
                onPress={() => handleFrequencyChange('high')}
              >
                <Text style={settings.trackingFrequency === 'high' ? styles.selectedValueText : styles.valueText}>
                  High
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.trackingFrequency === 'balanced' && styles.selectedValue
                ]}
                onPress={() => handleFrequencyChange('balanced')}
              >
                <Text style={settings.trackingFrequency === 'balanced' ? styles.selectedValueText : styles.valueText}>
                  Balanced
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.trackingFrequency === 'low' && styles.selectedValue
                ]}
                onPress={() => handleFrequencyChange('low')}
              >
                <Text style={settings.trackingFrequency === 'low' ? styles.selectedValueText : styles.valueText}>
                  Low
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Battery Optimization</Text>
              <Text style={styles.settingDescription}>
                Reduce tracking frequency when battery is low
              </Text>
            </View>
            
            <Switch
              value={settings.batteryOptimization}
              onValueChange={() => toggleSetting('batteryOptimization')}
              trackColor={{ false: '#ccc', true: '#81D4FA' }}
              thumbColor={settings.batteryOptimization ? '#2196F3' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Pause During Night</Text>
              <Text style={styles.settingDescription}>
                Reduce tracking frequency during night hours
              </Text>
            </View>
            
            <Switch
              value={settings.pauseDuringNight}
              onValueChange={() => toggleSetting('pauseDuringNight')}
              trackColor={{ false: '#ccc', true: '#81D4FA' }}
              thumbColor={settings.pauseDuringNight ? '#2196F3' : '#f4f3f4'}
            />
          </View>
        </View>
        
        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto-Sync to Cloud</Text>
              <Text style={styles.settingDescription}>
                Backup routes and contacts to Supabase
              </Text>
            </View>
            
            <Switch
              value={settings.autoSyncToCloud}
              onValueChange={() => toggleSetting('autoSyncToCloud')}
              trackColor={{ false: '#ccc', true: '#81D4FA' }}
              thumbColor={settings.autoSyncToCloud ? '#2196F3' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Data Retention</Text>
              <Text style={styles.settingDescription}>
                How long to keep journey history
              </Text>
            </View>
            
            <View style={styles.valueSelector}>
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.dataRetentionDays === 7 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, dataRetentionDays: 7})}
              >
                <Text style={settings.dataRetentionDays === 7 ? styles.selectedValueText : styles.valueText}>
                  7 days
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.dataRetentionDays === 30 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, dataRetentionDays: 30})}
              >
                <Text style={settings.dataRetentionDays === 30 ? styles.selectedValueText : styles.valueText}>
                  30 days
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.valueBadge,
                  settings.dataRetentionDays === 90 && styles.selectedValue
                ]}
                onPress={() => setSettings({...settings, dataRetentionDays: 90})}
              >
                <Text style={settings.dataRetentionDays === 90 ? styles.selectedValueText : styles.valueText}>
                  90 days
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
        
        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Status</Text>
            <Text style={styles.aboutValue}>
              {user ? 'Signed In' : (isGuest ? 'Guest Mode' : 'Signed Out')}
            </Text>
          </View>
          
          {user && (
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Email</Text>
              <Text style={styles.aboutValue}>{user.email}</Text>
            </View>
          )}
          
          {!isGuest && user && (
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleSyncData}
              disabled={syncLoading}
            >
              {syncLoading ? (
                <View style={styles.syncButtonContent}>
                  <ActivityIndicator size="small" color="#2196F3" />
                  <Text style={styles.linkText}>Syncing...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.linkText}>Sync Data to Cloud</Text>
                  <Ionicons name="cloud-upload-outline" size={18} color="#2196F3" />
                </>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={handleSignOut}
          >
            <Text style={styles.linkText}>
              {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            </Text>
            <Ionicons name="log-out-outline" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
        
        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://safetack.example.com/privacy')}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://safetack.example.com/terms')}
          >
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => Linking.openURL('mailto:support@safetack.example.com')}
          >
            <Text style={styles.linkText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={16} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#777',
  },
  permissionStatus: {
    alignItems: 'flex-end',
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  valueSelector: {
    flexDirection: 'row',
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginLeft: 8,
  },
  selectedValue: {
    backgroundColor: '#2196F3',
  },
  valueText: {
    fontSize: 14,
    color: '#555',
  },
  selectedValueText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  dangerButtonText: {
    color: '#f44336',
    fontWeight: '600',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  aboutLabel: {
    fontSize: 15,
    color: '#333',
  },
  aboutValue: {
    fontSize: 15,
    color: '#777',
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: {
    fontSize: 15,
    color: '#2196F3',
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});