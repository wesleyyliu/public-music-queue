import { useState, useEffect } from 'react';

// Spotify SDK documentation can be found here: https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started

function SpotifyPlayer({ socket, user }) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [serverPlaybackState, setServerPlaybackState] = useState(null);
  const [hasSynced, setHasSynced] = useState(false);
  
  const isAuthenticated = !!user;

  // Listen for playback state updates from server
  useEffect(() => {
    if (!socket) return;

    socket.on('playback:state', (state) => {
      console.log('Received playback state from server:', state);
      setServerPlaybackState(state);
    });

    return () => {
      socket.off('playback:state');
    };
  }, [socket]);

  // Sync playback function - can be called manually or automatically
  const syncPlayback = async () => {
    if (!deviceId || !accessToken || !serverPlaybackState) {
      console.log('Cannot sync: missing deviceId, accessToken, or serverPlaybackState');
      return;
    }

    console.log('🔄 Syncing playback...');

    try {
      // If there's a song currently playing on server, sync to it
      if (serverPlaybackState.currentSong && serverPlaybackState.isPlaying) {
        console.log('Syncing to server playback state:', serverPlaybackState);
        
        // Calculate current position based on when the song started
        const elapsed = Date.now() - serverPlaybackState.startedAt;
        const position_ms = Math.max(0, elapsed);

        // Transfer playback AND start playing in one call
        // The device_id parameter automatically transfers playback to this device
        console.log('Starting playback on Web Player at position:', Math.floor(position_ms / 1000), 's');
        const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [serverPlaybackState.currentSong.spotifyUri],
            position_ms: position_ms
          })
        });

        if (playResponse.ok || playResponse.status === 204) {
          console.log(`✅ Synced and playing at position: ${Math.floor(position_ms / 1000)}s`);
          setHasSynced(true);
        } else {
          console.error('Failed to sync playback:', await playResponse.text());
        }
      } else {
        // No song playing on server, trigger server to start playback
        console.log('No song playing on server, requesting playback start...');
        
        const response = await fetch('http://127.0.0.1:3001/api/queue/pop-to-spotify', {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          console.log('Playback started successfully');
          setHasSynced(true);
        } else {
          console.error('Failed to start playback:', await response.text());
        }
      }
    } catch (error) {
      console.error('Error syncing/starting playback:', error);
    }
  };

  // Auto-sync when device becomes active
  useEffect(() => {
    if (!isActive || !deviceId || !accessToken || !serverPlaybackState || hasSynced) return;

    syncPlayback();
  }, [isActive, deviceId, accessToken, serverPlaybackState, hasSynced]);

  useEffect(() => {
    // Only fetch access token if user is authenticated
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]);

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
        name: "Q'ed Up Player",
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

      // Player state changed - just update UI state
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

  // Show unauthenticated view
  if (!isAuthenticated) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
        borderRadius: '12px',
        color: 'white'
      }}>
        <h3 style={{ marginTop: 0 }}>🎵 Now Playing</h3>
        
        {serverPlaybackState?.currentSong && serverPlaybackState?.isPlaying ? (
          <div style={{
            padding: '1rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {serverPlaybackState.currentSong.albumArt && (
                <img 
                  src={serverPlaybackState.currentSong.albumArt} 
                  alt={serverPlaybackState.currentSong.album}
                  style={{ width: '80px', height: '80px', borderRadius: '4px' }}
                />
              )}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {serverPlaybackState.currentSong.title}
                </div>
                <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
                  {serverPlaybackState.currentSong.artist}
                </div>
                {serverPlaybackState.currentSong.album && (
                  <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {serverPlaybackState.currentSong.album}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '2rem 1rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center',
            color: '#b3b3b3'
          }}>
            <p style={{ margin: 0 }}>No song currently playing</p>
          </div>
        )}

        <div style={{
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>
            🔒 Login with Spotify to control playback
          </p>
        </div>
      </div>
    );
  }

  // Authenticated user views
  if (tokenError) {
    return (
      <div style={{ 
        padding: '1.5rem', 
        background: '#f8d7da', 
        border: '1px solid #f5c6cb',
        borderRadius: '8px'
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
        borderRadius: '8px'
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

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

      {/* Resync Button */}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button
          onClick={syncPlayback}
          disabled={!isActive || !serverPlaybackState}
          style={{
            padding: '0.5rem 1rem',
            background: serverPlaybackState?.isPlaying ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            cursor: (isActive && serverPlaybackState) ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            opacity: (isActive && serverPlaybackState) ? 1 : 0.5
          }}
        >
          🔄 Resync Playback
        </button>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ℹ️ {showInstructions ? 'Hide Instructions' : 'How to Use'}
        </button>
      </div>

      {showInstructions && (
        <div style={{
          marginTop: '1rem',
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
            <li>Select "Q'ed Up Player"</li>
            <li>Control playback here or in Spotify!</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default SpotifyPlayer;

