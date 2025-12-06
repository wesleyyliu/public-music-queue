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
    return res.redirect('/?error=no_code');
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', tokenResponse.status, errorText);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user profile from Spotify
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User fetch error:', userResponse.status, errorText);
      return res.redirect('/?error=user_fetch_failed');
    }

    const spotifyUser = await userResponse.json();

    // Save or update user in database
    const user = await User.create(
      spotifyUser.id,
      spotifyUser.display_name,
      spotifyUser.email,
      access_token,
      refresh_token,
      expires_in
    );

    // Store user info in session (NOT the token)
    req.session.userId = user.spotify_id;
    req.session.displayName = user.display_name;

    console.log('Session data set:', req.session.userId, req.session.displayName);
    console.log('Session ID:', req.sessionID);

    // Save and wait for the session to be persisted before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/?error=session_save_failed');
      }

      console.log('Session saved successfully, cookie should be set');

      // Redirect to home page (relative path keeps us on same domain)
      res.redirect('/');
    });

  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
};

// Get current user info from session
const getCurrentUser = (req, res) => {
  console.log('getCurrentUser - Session ID:', req.sessionID);
  console.log('getCurrentUser - Session data:', req.session);

  if (!req.session.userId) {
    console.log('No userId in session');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    spotify_id: req.session.userId,
    display_name: req.session.displayName
  });
};

// Get access token for authenticated user
const getAccessToken = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await User.findBySpotifyId(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if token is expired
    if (new Date() > new Date(user.token_expires_at)) {
      return res.status(401).json({ error: 'Token expired', expired: true });
    }

    res.json({ access_token: user.access_token });
  } catch (error) {
    console.error('Error fetching access token:', error);
    res.status(500).json({ error: 'Failed to fetch access token' });
  }
};

// Logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

module.exports = {
  login,
  callback,
  getCurrentUser,
  getAccessToken,
  logout
};

