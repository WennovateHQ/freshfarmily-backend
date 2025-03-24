/**
 * Google Maps Service
 * 
 * Handles geolocation, directions, and route optimization using Google Maps API
 * for the FreshFarmily delivery system
 */

const { Client } = require('@googlemaps/google-maps-services-js');
const logger = require('../utils/logger');
require('dotenv').config();

// Initialize Google Maps client
const client = new Client({});

/**
 * Get distance matrix between origins and destinations
 * @param {Array} origins - Array of origin locations [lat,lng]
 * @param {Array} destinations - Array of destination locations [lat,lng]
 * @returns {Object} Distance matrix results
 */
const getDistanceMatrix = async (origins, destinations) => {
  try {
    const response = await client.distancematrix({
      params: {
        origins: origins.map(origin => `${origin.latitude},${origin.longitude}`),
        destinations: destinations.map(dest => `${dest.latitude},${dest.longitude}`),
        mode: 'driving',
        units: 'metric',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status !== 'OK') {
      logger.error(`Distance Matrix API error: ${response.data.status}`);
      throw new Error(`Distance Matrix request failed: ${response.data.status}`);
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Error getting distance matrix: ${error.message}`);
    throw error;
  }
};

/**
 * Get directions for a route with multiple waypoints
 * @param {Object} origin - Origin point {latitude, longitude}
 * @param {Array} waypoints - Array of waypoint locations {latitude, longitude}
 * @param {Object} destination - Destination point {latitude, longitude}
 * @param {String} optimizeWaypoints - Whether to optimize the provided route (default: true)
 * @returns {Object} Google Directions API response
 */
const getDirections = async (origin, waypoints, destination, optimizeWaypoints = true) => {
  try {
    const params = {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'driving',
      optimize: optimizeWaypoints,
      key: process.env.GOOGLE_MAPS_API_KEY
    };
    
    // Add waypoints if provided
    if (waypoints && waypoints.length) {
      params.waypoints = waypoints.map(wp => `${wp.latitude},${wp.longitude}`);
    }
    
    const response = await client.directions({
      params
    });
    
    if (response.data.status !== 'OK') {
      logger.error(`Directions API error: ${response.data.status}`);
      throw new Error(`Directions request failed: ${response.data.status}`);
    }
    
    return response.data;
  } catch (error) {
    logger.error(`Error getting directions: ${error.message}`);
    throw error;
  }
};

/**
 * Geocode an address to coordinates
 * @param {String} address - Full address to geocode
 * @returns {Object} Latitude and longitude
 */
const geocodeAddress = async (address) => {
  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status !== 'OK') {
      logger.error(`Geocoding API error: ${response.data.status}`);
      throw new Error(`Geocoding request failed: ${response.data.status}`);
    }
    
    const result = response.data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    logger.error(`Error geocoding address: ${error.message}`);
    throw error;
  }
};

/**
 * Optimize a delivery route using Google Maps Directions API
 * @param {Object} driverLocation - Driver's current location {latitude, longitude}
 * @param {Array} deliveryPoints - Array of delivery points with {latitude, longitude}
 * @param {String} strategy - Optimization strategy: 'fastest', 'shortest', or 'balanced'
 * @returns {Object} Optimized route data
 */
const optimizeDeliveryRoute = async (driverLocation, deliveryPoints, strategy = 'balanced') => {
  try {
    // If we have 0 or 1 delivery points, no need for optimization
    if (deliveryPoints.length <= 1) {
      return {
        optimizedRoute: deliveryPoints,
        totalDistance: 0,
        totalDuration: 0,
        routePolyline: null
      };
    }
    
    // For complex routes, use Google Directions API with waypoint optimization
    const waypoints = [...deliveryPoints];
    const lastDelivery = waypoints.pop(); // Last delivery point will be the destination
    
    const response = await getDirections(driverLocation, waypoints, lastDelivery, true);
    
    // Extract route information
    const route = response.routes[0];
    const legs = route.legs;
    
    // Calculate total distance and duration
    let totalDistance = 0;
    let totalDuration = 0;
    legs.forEach(leg => {
      totalDistance += leg.distance.value; // in meters
      totalDuration += leg.duration.value; // in seconds
    });
    
    // Build the ordered waypoint list based on the optimized route
    const optimizedRoute = [driverLocation];
    
    // If the API reordered the waypoints, use that order
    if (route.waypoint_order && route.waypoint_order.length) {
      route.waypoint_order.forEach(index => {
        optimizedRoute.push(waypoints[index]);
      });
    } else {
      // Otherwise use the original order
      optimizedRoute.push(...waypoints);
    }
    
    // Add the destination
    optimizedRoute.push(lastDelivery);
    
    return {
      optimizedRoute,
      totalDistance: Math.round(totalDistance / 1000), // convert to kilometers
      totalDuration: Math.round(totalDuration / 60), // convert to minutes
      routePolyline: route.overview_polyline,
      legs: legs.map(leg => ({
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance.value,
        duration: leg.duration.value,
        startLocation: leg.start_location,
        endLocation: leg.end_location
      }))
    };
  } catch (error) {
    logger.error(`Error optimizing delivery route: ${error.message}`);
    
    // Fallback to basic optimization if Google API fails
    logger.info('Falling back to basic route optimization');
    return fallbackRouteOptimization(driverLocation, deliveryPoints, strategy);
  }
};

/**
 * Fallback route optimization using geolib when Google Maps API fails
 * @param {Object} driverLocation - Driver's current location {latitude, longitude}
 * @param {Array} deliveryPoints - Array of delivery points with {latitude, longitude}
 * @param {String} strategy - Optimization strategy: 'fastest', 'shortest', or 'balanced'
 * @returns {Object} Basic optimized route data
 */
const fallbackRouteOptimization = (driverLocation, deliveryPoints, strategy) => {
  const geolib = require('geolib');
  let points = [...deliveryPoints];
  let currentPoint = driverLocation;
  let optimizedRoute = [driverLocation];
  let totalDistance = 0;
  
  // Simple nearest neighbor algorithm
  while (points.length > 0) {
    // Find nearest point
    let minDistance = Infinity;
    let nearestIndex = -1;
    
    points.forEach((point, index) => {
      const distance = geolib.getDistance(
        { latitude: currentPoint.latitude, longitude: currentPoint.longitude },
        { latitude: point.latitude, longitude: point.longitude }
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    // Add nearest point to route
    const nearestPoint = points[nearestIndex];
    optimizedRoute.push(nearestPoint);
    totalDistance += minDistance;
    
    // Update current point and remove from points array
    currentPoint = nearestPoint;
    points.splice(nearestIndex, 1);
  }
  
  // Estimate duration (assuming average speed of 30 km/h)
  const totalDurationMinutes = Math.round((totalDistance / 1000) * 2); // rough estimate
  
  return {
    optimizedRoute,
    totalDistance: Math.round(totalDistance / 1000), // convert to kilometers
    totalDuration: totalDurationMinutes,
    routePolyline: null,
    legs: []
  };
};

module.exports = {
  getDistanceMatrix,
  getDirections,
  geocodeAddress,
  optimizeDeliveryRoute
};
