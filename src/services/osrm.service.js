const env = require('../config/env');

/**
 * Self-hosted OSRM integration.
 * Never uses public demo routing servers in production.
 * If OSRM_BASE_URL is unset, returns { configured: false } cleanly without inventing distance or ETA.
 */
const getRouteBetweenPoints = async ({ fromLat, fromLng, toLat, toLng }) => {
  if (!env.osrmBaseUrl) {
    return {
      configured: false,
      route: null,
      message: 'Self-hosted OSRM routing server not configured; displaying live marker locations only.',
    };
  }

  const base = env.osrmBaseUrl.replace(/\/+$/, '');
  const url = `${base}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    return {
      configured: true,
      route: null,
      message: `OSRM server responded with HTTP ${response.status}`,
    };
  }

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) {
    return {
      configured: true,
      route: null,
      message: 'No route geometry returned by OSRM',
    };
  }

  return {
    configured: true,
    route: {
      distance_meters: route.distance,
      duration_seconds: route.duration,
      geometry: route.geometry,
    },
  };
};

module.exports = { getRouteBetweenPoints };
