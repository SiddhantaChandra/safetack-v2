import { RoutesModel, JourneysModel, RoutePoint, JourneyPoint } from '../database/models';
import { haversineDistance } from './LocationService';
import database from '../database/database';

// Configuration constants
const MIN_POINTS_FOR_ROUTE = 10;
const MIN_ROUTE_DISTANCE = 500; // meters
const ROUTE_SIMILARITY_THRESHOLD = 0.8; // 80% similarity to consider routes the same
const DEVIATION_DISTANCE_THRESHOLD = 100; // meters
const INITIAL_CONFIDENCE_SCORE = 0.3;
const CONFIDENCE_INCREMENT = 0.1;
const MAX_CONFIDENCE_SCORE = 1.0;

interface AnalysisResult {
  routeId: number;
  isNewRoute: boolean;
  similarity: number;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
}

interface DeviationResult {
  deviationId: number;
  distance: number;
  expected: GeoPosition;
  actual: GeoPosition;
  routeId: number;
  journeyId: number;
}

/**
 * Analyze a completed journey to identify if it matches existing routes
 * or should be considered a new route
 */
export const analyzeJourney = async (journeyId: number): Promise<AnalysisResult | null> => {
  try {
    // Get journey points
    const journeyPoints = await JourneysModel.getJourneyPoints(journeyId);
    
    // Basic validation
    if (!journeyPoints || journeyPoints.length < MIN_POINTS_FOR_ROUTE) {
      console.log('Journey too short for route analysis');
      return null;
    }
    
    // Calculate journey distance
    const journeyDistance = calculateTotalDistance(journeyPoints);
    if (journeyDistance < MIN_ROUTE_DISTANCE) {
      console.log('Journey distance too short for route analysis');
      return null;
    }
    
    // Get all existing routes
    const routes = await RoutesModel.getRoutes();
    
    // Find the best matching route, if any
    let bestMatchRoute = null;
    let bestMatchScore = 0;
    
    for (const route of routes) {
      if (route.id) {
        const routeWithPoints = await RoutesModel.getRouteWithPoints(route.id);
        if (routeWithPoints && routeWithPoints.points) {
          const similarity = calculateRouteSimilarity(journeyPoints, routeWithPoints.points);
          
          if (similarity > bestMatchScore) {
            bestMatchScore = similarity;
            bestMatchRoute = routeWithPoints;
          }
        }
      }
    }
    
    // If we found a good match, update the route confidence
    if (bestMatchScore >= ROUTE_SIMILARITY_THRESHOLD && bestMatchRoute && bestMatchRoute.id) {
      // Update the journey with the matched route
      await JourneysModel.completeJourney(
        journeyId, 
        journeyPoints[journeyPoints.length - 1].timestamp, 
        journeyDistance,
        bestMatchRoute.id
      );
      
      // Calculate journey duration
      const journeyDuration = journeyPoints[journeyPoints.length - 1].timestamp - 
                              journeyPoints[0].timestamp;
      
      // Update route confidence
      const newConfidence = Math.min(
        (bestMatchRoute.confidence_score || 0) + CONFIDENCE_INCREMENT,
        MAX_CONFIDENCE_SCORE
      );
      
      // Calculate new average duration
      const newAvgDuration = bestMatchRoute.avg_duration && bestMatchRoute.times_traveled ?
        (bestMatchRoute.avg_duration * bestMatchRoute.times_traveled + journeyDuration) / 
        (bestMatchRoute.times_traveled + 1) :
        journeyDuration;
      
      await RoutesModel.updateRouteConfidence(
        bestMatchRoute.id,
        newConfidence,
        newAvgDuration
      );
      
      return {
        routeId: bestMatchRoute.id,
        isNewRoute: false,
        similarity: bestMatchScore
      };
    } 
    // If no good match, create a new route
    else {
      // Simplify journey points to create a more efficient route
      const simplifiedPoints = simplifyRoute(journeyPoints);
      
      // Create a new route
      const startLocation = journeyPoints[0];
      const endLocation = journeyPoints[journeyPoints.length - 1];
      
      const routeId = await RoutesModel.createRoute(
        {
          name: generateRouteName(startLocation, endLocation),
          confidence_score: INITIAL_CONFIDENCE_SCORE,
          start_location: {
            latitude: startLocation.latitude,
            longitude: startLocation.longitude
          },
          end_location: {
            latitude: endLocation.latitude,
            longitude: endLocation.longitude
          },
          avg_duration: endLocation.timestamp - startLocation.timestamp,
          times_traveled: 1
        },
        simplifiedPoints.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          altitude: point.altitude
        }))
      );
      
      // Update the journey with the new route ID
      await JourneysModel.completeJourney(
        journeyId, 
        journeyPoints[journeyPoints.length - 1].timestamp, 
        journeyDistance,
        routeId
      );
      
      return {
        routeId,
        isNewRoute: true,
        similarity: 0
      };
    }
  } catch (error) {
    console.error('Error analyzing journey:', error);
    throw error;
  }
};

/**
 * Check for deviation from the current route
 */
export const checkForDeviation = async (
  journeyId: number, 
  currentPosition: GeoPosition
): Promise<DeviationResult | null> => {
  try {
    // Get journey details
    const points = await JourneysModel.getJourneyPoints(journeyId);
    if (!points || points.length === 0) return null;
    
    // Get the matched route for this journey
    const journey = await database.executeQuery(
      'SELECT matched_route_id FROM Journeys WHERE id = ?',
      [journeyId]
    );
    
    const matchedRouteId = journey.rows._array[0]?.matched_route_id;
    if (!matchedRouteId) return null; // No matched route yet
    
    // Get the route points
    const route = await RoutesModel.getRouteWithPoints(matchedRouteId);
    if (!route || !route.points || route.points.length === 0) return null;
    
    // Determine how far along the journey we are
    const progress = estimateRouteProgress(points, route.points);
    
    // Get expected position at this progress
    const expectedPosition = interpolateRoutePosition(route.points, progress);
    if (!expectedPosition) return null;
    
    // Calculate distance between current and expected position
    const deviationDistance = haversineDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      expectedPosition.latitude,
      expectedPosition.longitude
    );
    
    // Check if deviation exceeds threshold
    if (deviationDistance > DEVIATION_DISTANCE_THRESHOLD) {
      // Record the deviation
      const deviationId = await JourneysModel.recordDeviation(journeyId, {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        timestamp: Date.now(),
        deviation_distance: deviationDistance,
        alert_sent: false
      });
      
      return {
        deviationId,
        distance: deviationDistance,
        expected: expectedPosition,
        actual: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude
        },
        routeId: matchedRouteId,
        journeyId
      };
    }
    
    return null; // No significant deviation
  } catch (error) {
    console.error('Error checking for deviation:', error);
    throw error;
  }
};

/**
 * Calculate the similarity between two routes (0-1 scale)
 */
const calculateRouteSimilarity = (journeyPoints: JourneyPoint[], routePoints: RoutePoint[]): number => {
  if (!journeyPoints || !routePoints || 
      journeyPoints.length < 5 || routePoints.length < 5) {
    return 0;
  }
  
  // Simplify both sets of points for comparison
  const simplifiedJourney = simplifyRoute(journeyPoints);
  const simplifiedRoute = simplifyRoute(routePoints);
  
  // Check start and end point similarity
  const startPointSimilarity = calculatePointSimilarity(
    simplifiedJourney[0], 
    simplifiedRoute[0]
  );
  
  const endPointSimilarity = calculatePointSimilarity(
    simplifiedJourney[simplifiedJourney.length - 1], 
    simplifiedRoute[simplifiedRoute.length - 1]
  );
  
  // If start or end points are very different, routes are different
  if (startPointSimilarity < 0.7 || endPointSimilarity < 0.7) {
    return 0;
  }
  
  // Calculate Frechet distance or similar metric
  const pathSimilarity = calculatePathSimilarity(simplifiedJourney, simplifiedRoute);
  
  // Weight: 20% start point, 20% end point, 60% path
  return 0.2 * startPointSimilarity + 0.2 * endPointSimilarity + 0.6 * pathSimilarity;
};

/**
 * Calculate similarity between two points (0-1 scale)
 */
const calculatePointSimilarity = (
  point1: GeoPosition, 
  point2: GeoPosition
): number => {
  const distance = haversineDistance(
    point1.latitude, point1.longitude,
    point2.latitude, point2.longitude
  );
  
  // Convert distance to similarity score
  // 0m = 1.0 similarity, 200m = 0.0 similarity
  return Math.max(0, 1 - distance / 200);
};

/**
 * Calculate path similarity using discrete Fréchet distance
 */
const calculatePathSimilarity = (path1: GeoPosition[], path2: GeoPosition[]): number => {
  // Simplified implementation - in production would use a proper Fréchet algorithm
  // This is a basic approach that samples points along both paths
  
  // Normalize paths to have same number of points
  const numSamples = 20;
  const samples1 = samplePath(path1, numSamples);
  const samples2 = samplePath(path2, numSamples);
  
  // Calculate average distance between corresponding points
  let totalDistance = 0;
  for (let i = 0; i < numSamples; i++) {
    totalDistance += haversineDistance(
      samples1[i].latitude, samples1[i].longitude,
      samples2[i].latitude, samples2[i].longitude
    );
  }
  
  const avgDistance = totalDistance / numSamples;
  
  // Convert to similarity score (0-1)
  // 0m = 1.0 similarity, 200m = 0.0 similarity
  return Math.max(0, 1 - avgDistance / 200);
};

/**
 * Sample a path to get evenly spaced points
 */
const samplePath = (path: GeoPosition[], numSamples: number): GeoPosition[] => {
  if (path.length <= numSamples) {
    return path;
  }
  
  const result: GeoPosition[] = [path[0]]; // Always include first point
  
  // Calculate total path length
  let totalLength = 0;
  const segmentLengths: number[] = [];
  
  for (let i = 1; i < path.length; i++) {
    const dist = haversineDistance(
      path[i-1].latitude, path[i-1].longitude,
      path[i].latitude, path[i].longitude
    );
    segmentLengths.push(dist);
    totalLength += dist;
  }
  
  // Sample evenly along the path
  const stepSize = totalLength / (numSamples - 1);
  let currentDist = stepSize;
  let accumulatedDist = 0;
  
  for (let i = 0; i < segmentLengths.length; i++) {
    accumulatedDist += segmentLengths[i];
    
    while (currentDist <= accumulatedDist && result.length < numSamples - 1) {
      // Interpolate point
      const segmentPosition = 1 - (accumulatedDist - currentDist) / segmentLengths[i];
      const point: GeoPosition = {
        latitude: path[i].latitude * (1 - segmentPosition) + path[i+1].latitude * segmentPosition,
        longitude: path[i].longitude * (1 - segmentPosition) + path[i+1].longitude * segmentPosition
      };
      
      result.push(point);
      currentDist += stepSize;
    }
  }
  
  // Always include last point
  if (result.length < numSamples) {
    result.push(path[path.length - 1]);
  }
  
  return result;
};

/**
 * Simplify a route using Ramer-Douglas-Peucker algorithm
 */
const simplifyRoute = <T extends GeoPosition>(points: T[], epsilon = 20): T[] => {
  if (points.length <= 2) {
    return [...points];
  }
  
  // Find the point with the maximum distance
  let maxDistance = 0;
  let maxDistanceIndex = 0;
  
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(
      points[i],
      firstPoint,
      lastPoint
    );
    
    if (distance > maxDistance) {
      maxDistance = distance;
      maxDistanceIndex = i;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const firstHalf = simplifyRoute(
      points.slice(0, maxDistanceIndex + 1),
      epsilon
    );
    
    const secondHalf = simplifyRoute(
      points.slice(maxDistanceIndex),
      epsilon
    );
    
    // Concatenate the two halves
    return [...firstHalf.slice(0, -1), ...secondHalf];
  } else {
    // Return just the endpoints
    return [firstPoint, lastPoint];
  }
};

/**
 * Calculate perpendicular distance from a point to a line
 */
const perpendicularDistance = (
  point: GeoPosition, 
  lineStart: GeoPosition, 
  lineEnd: GeoPosition
): number => {
  const x = point.latitude;
  const y = point.longitude;
  const x1 = lineStart.latitude;
  const y1 = lineStart.longitude;
  const x2 = lineEnd.latitude;
  const y2 = lineEnd.longitude;
  
  // Line length
  const lineLength = haversineDistance(x1, y1, x2, y2);
  
  if (lineLength === 0) {
    return haversineDistance(x, y, x1, y1);
  }
  
  // Calculate the perpendicular distance
  const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (lineLength * lineLength);
  
  if (t < 0) {
    return haversineDistance(x, y, x1, y1);
  }
  
  if (t > 1) {
    return haversineDistance(x, y, x2, y2);
  }
  
  const projectionX = x1 + t * (x2 - x1);
  const projectionY = y1 + t * (y2 - y1);
  
  return haversineDistance(x, y, projectionX, projectionY);
};

/**
 * Estimate how far along a route the user has progressed (0-1)
 */
const estimateRouteProgress = (journeyPoints: JourneyPoint[], routePoints: RoutePoint[]): number => {
  if (!journeyPoints || !routePoints || journeyPoints.length === 0 || routePoints.length === 0) {
    return 0;
  }
  
  // Get current location
  const currentPoint = journeyPoints[journeyPoints.length - 1];
  
  // Find closest match on route
  let minDistance = Infinity;
  let closestIndex = 0;
  
  for (let i = 0; i < routePoints.length; i++) {
    const distance = haversineDistance(
      currentPoint.latitude, currentPoint.longitude,
      routePoints[i].latitude, routePoints[i].longitude
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  // Return progress as percentage along route
  return closestIndex / (routePoints.length - 1);
};

/**
 * Interpolate position on route at a specific progress point
 */
const interpolateRoutePosition = (routePoints: RoutePoint[], progress: number): GeoPosition | null => {
  if (!routePoints || routePoints.length === 0) {
    return null;
  }
  
  if (progress <= 0) return routePoints[0];
  if (progress >= 1) return routePoints[routePoints.length - 1];
  
  // Calculate the exact index we need
  const exactIndex = progress * (routePoints.length - 1);
  const lowerIndex = Math.floor(exactIndex);
  const upperIndex = Math.ceil(exactIndex);
  
  if (lowerIndex === upperIndex) {
    return routePoints[lowerIndex];
  }
  
  // Interpolate between the two points
  const weight = exactIndex - lowerIndex;
  
  return {
    latitude: routePoints[lowerIndex].latitude * (1 - weight) + 
              routePoints[upperIndex].latitude * weight,
    longitude: routePoints[lowerIndex].longitude * (1 - weight) + 
               routePoints[upperIndex].longitude * weight
  };
};

/**
 * Calculate total distance of a path
 */
const calculateTotalDistance = (points: GeoPosition[]): number => {
  if (!points || points.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistance(
      points[i-1].latitude, points[i-1].longitude,
      points[i].latitude, points[i].longitude
    );
  }
  
  return totalDistance;
};

/**
 * Generate a descriptive name for a new route
 */
const generateRouteName = (startLocation: JourneyPoint, endLocation: JourneyPoint): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
  
  return `Route ${formatter.format(new Date(startLocation.timestamp))}`;
};