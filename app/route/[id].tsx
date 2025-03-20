import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoutesModel, Route } from '../database/models';
import SafetyMap from '../../components/SafetyMap';
import database from '../database/database';

interface RouteDetailScreenProps {}

export default function RouteDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [routeName, setRouteName] = useState<string>('');
  const [routeCategory, setRouteCategory] = useState<string>('');

  // Load route data on initial render
  useEffect(() => {
    loadRouteData();
  }, [id]);

  // Load route details from database
  const loadRouteData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (typeof id !== 'string') {
        setError('Invalid route ID');
        setLoading(false);
        return;
      }
      
      const routeData = await RoutesModel.getRouteWithPoints(parseInt(id));
      
      if (!routeData) {
        setError('Route not found');
        setLoading(false);
        return;
      }
      
      setRoute(routeData);
      setRouteName(routeData.name || '');
      setRouteCategory(routeData.category || '');
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading route:', err);
      setError('Failed to load route data');
      setLoading(false);
    }
  };

  // Save route name and category
  const saveRouteInfo = async (): Promise<void> => {
    try {
      if (typeof id !== 'string') {
        throw new Error('Invalid route ID');
      }
      
      await database.executeQuery(
        'UPDATE Routes SET name = ?, category = ? WHERE id = ?',
        [routeName, routeCategory, id]
      );
      
      if (route) {
        setRoute({
          ...route,
          name: routeName,
          category: routeCategory
        });
      }
      
      setEditing(false);
    } catch (err) {
      console.error('Error updating route:', err);
      Alert.alert('Error', 'Failed to update route information');
    }
  };

  // Delete the route
  const handleDeleteRoute = (): void => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (typeof id !== 'string') {
                throw new Error('Invalid route ID');
              }
              
              await RoutesModel.deleteRoute(parseInt(id));
              router.replace('/routes');
            } catch (err) {
              console.error('Error deleting route:', err);
              Alert.alert('Error', 'Failed to delete route');
            }
          }
        }
      ]
    );
  };

  // Format date for display
  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString();
  };

  // Format duration
  const formatDuration = (duration?: number): string => {
    if (!duration) return 'Unknown';
    
    const totalMinutes = Math.floor(duration / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} min`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading route...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Route Details</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => editing ? saveRouteInfo() : setEditing(true)}
        >
          <Ionicons 
            name={editing ? "checkmark" : "create-outline"} 
            size={24} 
            color="#2196F3" 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.mapContainer}>
        {route && route.points && (
          <SafetyMap route={route} showCurrentLocation={false} />
        )}
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          {editing ? (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Route Name</Text>
                <TextInput
                  style={styles.input}
                  value={routeName}
                  onChangeText={setRouteName}
                  placeholder="Enter route name"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={routeCategory}
                  onChangeText={setRouteCategory}
                  placeholder="E.g. Commute, School, Exercise"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.routeName}>
                {route?.name || 'Unnamed Route'}
              </Text>
              
              {route?.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{route.category}</Text>
                </View>
              )}
            </>
          )}
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round((route?.confidence_score || 0) * 100)}%
              </Text>
              <Text style={styles.statLabel}>Confidence</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {route?.times_traveled || 0}
              </Text>
              <Text style={styles.statLabel}>Times Traveled</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(route?.avg_duration)}
              </Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Route Details</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="flag-outline" size={18} color="#666" />
            <Text style={styles.detailLabel}>Start Point:</Text>
            <Text style={styles.detailValue}>
              {route?.start_location ? 
                `${route.start_location.latitude.toFixed(6)}, ${route.start_location.longitude.toFixed(6)}` 
              : 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.detailLabel}>End Point:</Text>
            <Text style={styles.detailValue}>
              {route?.end_location ? 
                `${route.end_location.latitude.toFixed(6)}, ${route.end_location.longitude.toFixed(6)}` 
              : 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.detailLabel}>First Seen:</Text>
            <Text style={styles.detailValue}>
              {formatDate(route?.created_at)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="refresh-outline" size={18} color="#666" />
            <Text style={styles.detailLabel}>Last Traveled:</Text>
            <Text style={styles.detailValue}>
              {formatDate(route?.updated_at)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="analytics-outline" size={18} color="#666" />
            <Text style={styles.detailLabel}>Route Points:</Text>
            <Text style={styles.detailValue}>
              {route?.points ? route.points.length : 0} points
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteRoute}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete Route</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButton: {
    padding: 4,
  },
  backButtonText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  mapContainer: {
    height: '40%',
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#E1F5FE',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  categoryText: {
    color: '#0288D1',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
});