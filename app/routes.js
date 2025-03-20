import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoutesModel } from './database/models';

export default function RoutesScreen() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Load routes on initial render
  useEffect(() => {
    loadRoutes();
  }, []);

  // Load routes from database
  const loadRoutes = async () => {
    try {
      setLoading(true);
      const routeData = await RoutesModel.getRoutes();
      setRoutes(routeData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load your routes');
      setLoading(false);
    }
  };

  // Navigate to route detail
  const handleRoutePress = (routeId) => {
    router.push(`/route/${routeId}`);
  };

  // Render route item
  const renderRouteItem = ({ item }) => {
    // Parse JSON strings if needed
    const startLocation = typeof item.start_location === 'string' 
      ? JSON.parse(item.start_location) 
      : item.start_location;
      
    const endLocation = typeof item.end_location === 'string' 
      ? JSON.parse(item.end_location) 
      : item.end_location;
    
    // Format route data
    const confidence = Math.round(item.confidence_score * 100);
    const formattedDate = new Date(item.created_at).toLocaleDateString();
    
    return (
      <TouchableOpacity 
        style={styles.routeItem} 
        onPress={() => handleRoutePress(item.id)}
      >
        <View style={styles.routeHeader}>
          <Text style={styles.routeName}>{item.name || 'Unnamed Route'}</Text>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{confidence}%</Text>
          </View>
        </View>
        
        <View style={styles.routeDetails}>
          {item.category && (
            <View style={styles.detailRow}>
              <Ionicons name="bookmark-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.category}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatDuration(item.avg_duration)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="repeat-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Traveled {item.times_traveled} times
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>First seen: {formattedDate}</Text>
          </View>
        </View>
        
        <Ionicons 
          name="chevron-forward-outline" 
          size={24} 
          color="#999"
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  // Format duration from milliseconds to readable string
  const formatDuration = (duration) => {
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

  // Empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="map-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Routes Yet</Text>
        <Text style={styles.emptyText}>
          As you travel, SafeTack will automatically learn your regular routes 
          and display them here.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Routes</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadRoutes}>
          <Ionicons name="refresh-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading your routes...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={loadRoutes}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={routes}
          renderItem={renderRouteItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={routes.length === 0 ? { flex: 1 } : null}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshButton: {
    padding: 4,
  },
  routeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '500',
  },
  routeDetails: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  chevron: {
    marginLeft: 'auto',
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
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});