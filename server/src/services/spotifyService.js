const User = require('../models/User');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

/**
 * Get a valid access token for a user, refreshing if necessary
 */
async function getValidAccessToken(userId) {
  const user = await User.findBySpotifyId(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(user.token_expires_at);
  
  if (now < expiresAt) {
    return user.access_token;
  }

  // Token expired, refresh it
  return await refreshAccessToken(user);
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(user) {
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token
    })
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh token');
  }

  const { access_token, expires_in } = tokenData;

  // Update user with new token
  await User.updateToken(user.spotify_id, access_token, expires_in);

  return access_token;
}

/**
 * Search for tracks on Spotify
 * @param {string} userId - The user's Spotify ID
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results (default 20)
 * @returns {Promise<Array>} Array of track objects
 */
async function searchTracks(userId, query, limit = 20) {
  const accessToken = await getValidAccessToken(userId);

  const searchParams = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString()
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${searchParams}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search tracks');
  }

  const data = await response.json();

  // Format the tracks for easier consumption
  return data.tracks.items.map(track => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || null,
    duration_ms: track.duration_ms,
    uri: track.uri,
    preview_url: track.preview_url,
    external_url: track.external_urls.spotify
  }));
}

module.exports = {
  getValidAccessToken,
  searchTracks
};

