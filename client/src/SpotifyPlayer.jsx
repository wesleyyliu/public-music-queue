import { useState, useEffect } from 'react';

// Spotify SDK documentation can be found here: https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started

function SpotifyPlayer() {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);

  useEffect(() => {
    // Fetch access token from backend
    const fetchToken = async () => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/auth/token', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.access_token);
        } else {
          const error = await response.json();
          if (error.expired) {
            setTokenError('Your session has expired. Please log in again.');
          } else {
            setTokenError('Failed to get access token');
          }
        }
      } catch (error) {
        console.error('Error fetching token:', error);
        setTokenError('Failed to connect to server');
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    // Load Spotify SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    // Initialize player when SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Public Music Queue Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      // Ready event - player is connected
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsActive(true);
      });

      // Not Ready event - player went offline
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setIsActive(false);
      });

      // Player state changed
      spotifyPlayer.addListener('player_state_changed', state => {
        if (!state) return;
        
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      // Error listeners
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Initialization Error:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Authentication Error:', message);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Account Error:', message);
      });

      spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Playback Error:', message);
      });

      // Connect the player
      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken]);

  const togglePlay = () => {
    if (player) {
      player.togglePlay();
    }
  };

  const skipNext = () => {
    if (player) {
      player.nextTrack();
    }
  };

  const skipPrevious = () => {
    if (player) {
      player.previousTrack();
    }
  };

  if (tokenError) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: '#f8d7da', 
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3>🎵 Spotify Player</h3>
        <p style={{ color: '#721c24' }}>{tokenError}</p>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: '#fff3cd', 
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3>🎵 Spotify Player</h3>
        <p>Loading player...</p>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          Note: You need a Spotify Premium account to use the Web Playback SDK.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
      borderRadius: '12px',
      color: 'white'
    }}>
      <h3 style={{ marginTop: 0 }}>🎵 Spotify Player</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>
          Status: <strong>{isActive ? '✓ Connected' : '⏳ Connecting...'}</strong>
        </p>
        {deviceId && (
          <p style={{ fontSize: '0.8rem', color: '#b3b3b3', margin: '0.5rem 0' }}>
            Device ID: {deviceId}
          </p>
        )}
      </div>

      {currentTrack && (
        <div style={{
          padding: '1rem',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {currentTrack.album.images[0] && (
              <img 
                src={currentTrack.album.images[0].url} 
                alt={currentTrack.album.name}
                style={{ width: '64px', height: '64px', borderRadius: '4px' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                {currentTrack.name}
              </div>
              <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
                {currentTrack.artists.map(artist => artist.name).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={skipPrevious}
          disabled={!isActive}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '50px',
            cursor: isActive ? 'pointer' : 'not-allowed',
            fontSize: '1.2rem'
          }}
        >
          ⏮️
        </button>
        
        <button
          onClick={togglePlay}
          disabled={!isActive}
          style={{
            padding: '0.75rem 2rem',
            background: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: isActive ? 'pointer' : 'not-allowed',
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}
        >
          {isPaused ? '▶️ Play' : '⏸️ Pause'}
        </button>

        <button
          onClick={skipNext}
          disabled={!isActive}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '50px',
            cursor: isActive ? 'pointer' : 'not-allowed',
            fontSize: '1.2rem'
          }}
        >
          ⏭️
        </button>
      </div>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        fontSize: '0.85rem'
      }}>
        <p style={{ margin: '0.5rem 0' }}>
          <strong>How to use:</strong>
        </p>
        <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>Open Spotify on your desktop or mobile app</li>
          <li>Start playing any song</li>
          <li>Click the "Devices" icon in Spotify</li>
          <li>Select "Public Music Queue Player"</li>
          <li>Control playback here or in Spotify!</li>
        </ol>
      </div>
    </div>
  );
}

export default SpotifyPlayer;

