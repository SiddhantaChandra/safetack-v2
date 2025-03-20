import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafety } from '../app/contexts/SafetyContext';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function SafetyMap({ route, showCurrentLocation = true, showRoute = true }) {
  const [region, setRegion] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const { isTracking, currentJourney, deviationStatus, getJourneyDetails } = useSafety();

  // Initial location setup
  useEffect(() => {
    const getInitialLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          setLoading(false);
          return;
        }
        
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        const { latitude, longitude } = position.coords;
        
        setCurrentLocation({
          latitude,
          longitude
        });
        
        setRegion({
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA
        });
        
        setLoading(false);
      } catch (error) {
        console.log('Error getting location', error);
        setLoading(false);
      }
    };
    
    getInitialLocation();
  }, []);

  // Subscribe to location updates when tracking
  useEffect(() => {
    let locationSubscription;
    
    if (showCurrentLocation && isTracking) {
      const subscribeToLocation = async () => {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            timeInterval: 10000,
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            
            setCurrentLocation({
              latitude,
              longitude
            });
            
            // Option to follow user
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA
              });
            }
          }
        );
      };
      
      subscribeToLocation();
    }
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isTracking, showCurrentLocation]);

  // Load route data when journey changes or route is provided
  useEffect(() => {
    const loadRouteData = async () => {
      if (!showRoute) return;
      
      try {
        let points = [];
        
        if (route?.points) {
          // Use provided route
          points = route.points;
        } else if (currentJourney) {
          // Get current journey points
          points = await getJourneyDetails(currentJourney.id);
        }
        
        if (points && points.length > 0) {
          setRoutePoints(points);
          
          const coordinates = points.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude
          }));
          
          setRouteCoordinates(coordinates);
          
          // Fit map to show the route
          if (mapRef.current && coordinates.length > 1) {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          }
        }
      } catch (error) {
        console.error('Error loading route data:', error);
      }
    };
    
    loadRouteData();
  }, [route, currentJourney, showRoute]);

  // Show deviation marker if there's a deviation
  const renderDeviationMarker = () => {
    if (!deviationStatus) return null;
    
    return (
      <Marker
        coordinate={{
          latitude: deviationStatus.actual.latitude,
          longitude: deviationStatus.actual.longitude
        }}
        pinColor="red"
        title="Deviation Detected"
        description={`${Math.round(deviationStatus.distance)}m from expected route`}
      />
    );
  };

  // Show expected location marker if there's a deviation
  const renderExpectedLocationMarker = () => {
    if (!deviationStatus) return null;
    
    return (
      <Marker
        coordinate={{
          latitude: deviationStatus.expected.latitude,
          longitude: deviationStatus.expected.longitude
        }}
        pinColor="blue"
        title="Expected Location"
        description="Where you should be on your route"
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          showsUserLocation={showCurrentLocation}
          showsMyLocationButton={true}
          showsCompass={true}
        >
          {/* Route line */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#2196F3"
            />
          )}
          
          {/* Current location marker (if not using showsUserLocation) */}
          {currentLocation && !showCurrentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Current Location"
            />
          )}
          
          {/* Deviation markers */}
          {renderDeviationMarker()}
          {renderExpectedLocationMarker()}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});