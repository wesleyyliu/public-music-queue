const User = require('../models/User');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3001/api/auth/callback';
const CLIENT_URL = process.env.CLIENT_URL || 'http://127.0.0.1:5173';

// Guidelines can be found at https://developer.spotify.com/documentation/web-api/tutorials/code-flow

// Step 1: Redirect user to Spotify authorization page and Request User Authorization
const login = (req, res) => {
  const scopes = [
    'user-read-email',
    'user-read-private',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state'
  ].join(' ');

  // Build authorization URL
  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${SPOTIFY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}`;

  res.redirect(authUrl);
};

// Step 2: Handle Spotify callback and exchange authorization code for access token
const callback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${CLIENT_URL}?error=no_code`);
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokenData);
      return res.redirect(`${CLIENT_URL}?error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user profile from Spotify
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const spotifyUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error('User fetch error:', spotifyUser);
      return res.redirect(`${CLIENT_URL}?error=user_fetch_failed`);
    }

    // Save or update user in database
    const user = await User.create(
      spotifyUser.id,
      spotifyUser.display_name,
      spotifyUser.email,
      access_token,
      refresh_token,
      expires_in
    );

    // Redirect back to client with user info
    res.redirect(`${CLIENT_URL}?spotify_id=${user.spotify_id}&display_name=${encodeURIComponent(user.display_name || 'User')}`);

  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect(`${CLIENT_URL}?error=auth_failed`);
  }
};

module.exports = {
  login,
  callback
};

