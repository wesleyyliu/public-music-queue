const User = require('../models/User');

// Update user location
const updateLocation = async (req, res) => {
  const { spotify_id, latitude, longitude } = req.body;

  if (!spotify_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'spotify_id, latitude, and longitude required' });
  }

  // Validate latitude and longitude ranges
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
  }
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
  }

  try {
    const user = await User.updateLocation(spotify_id, latitude, longitude);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Location updated',
      spotify_id: user.spotify_id,
      latitude: user.latitude,
      longitude: user.longitude
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

module.exports = {
  updateLocation
};

