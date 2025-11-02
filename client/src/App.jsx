import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import SpotifyPlayer from './SpotifyPlayer'
import SearchSongs from './SearchSongs'

function App() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [queue, setQueue] = useState([])
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check for session and fetch user info
    const fetchUser = async () => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/auth/me', {
          credentials: 'include' // Important: send cookies with request
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();

    // Connect to server
    const newSocket = io('http://127.0.0.1:3001')

    newSocket.on('connect', () => {
      console.log('Connected to server!')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    // Listen for user count updates
    newSocket.on('users:count', (count) => {
      console.log('User count:', count)
      setUserCount(count)
    })

    // Listen for queue updates
    newSocket.on('queue:updated', (updatedQueue) => {
      console.log('Queue updated:', updatedQueue)
      setQueue(updatedQueue)
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      newSocket.close()
    }
  }, [])

  // Register user with socket when both are ready
  useEffect(() => {
    if (socket && user && user.spotify_id) {
      console.log('Registering user with socket:', user.spotify_id);
      socket.emit('user:register', user.spotify_id);
    }
  }, [socket, user]);

  const removeSong = (songId) => {
    if (socket) {
      socket.emit('queue:remove', songId)
    }
  }

  const handleLogin = () => {
    window.location.href = 'http://127.0.0.1:3001/api/auth/spotify';
  }

  const handleLogout = async () => {
    try {
      await fetch('http://127.0.0.1:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Q'ed Up</h1>
        
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>👤 {user.display_name}</span>
            <button 
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#1DB954',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Login with Spotify
          </button>
        )}
      </div>
      
      {/* Status Bar */}
      <div style={{ padding: '0.75rem', background: '#f0f0f0', borderRadius: '8px', marginBottom: '1rem' }}>
        <p style={{ margin: 0 }}>
          Status: <strong style={{ color: connected ? 'green' : 'red' }}>
            {connected ? '✓ Connected' : '✗ Disconnected'}
          </strong>
          {' | '}
          Active Users: <strong>{userCount}</strong>
          {' | '}
          Songs in Queue: <strong>{queue.length}</strong>
        </p>
      </div>

      {/* Three Column Layout */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Search (full height) */}
        <div style={{ 
          flex: '0 0 350px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          background: '#f9f9f9',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <SearchSongs user={user} />
        </div>

        {/* Middle - Empty space for future use */}
        <div style={{ flex: 1, minWidth: '350px' }}>
          {/* Intentionally left blank */}
        </div>

        {/* Right Panel - Player and Queue */}
        <div style={{ 
          flex: '0 0 450px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {/* Spotify Player - Top Right */}
          <div style={{ flex: '0 0 auto' }}>
            <SpotifyPlayer key={user?.spotify_id} socket={socket} user={user} />
          </div>

          {/* Queue - Bottom Right */}
          <div style={{ 
            flex: 1,
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            background: '#f9f9f9',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Queue ({queue.length} songs)</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {queue.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>
                  {user 
                    ? 'No songs in queue. Search for songs on the left to add them!' 
                    : 'No songs in queue. Login with Spotify to add songs!'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {queue.map((song, index) => (
                    <div 
                      key={song.id}
                      style={{
                        padding: '1rem',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        {/* Album Art */}
                        {song.albumArt && (
                          <img
                            src={song.albumArt}
                            alt={song.album || song.title}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '4px',
                              objectFit: 'cover'
                            }}
                          />
                        )}
                        
                        {/* Song Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {index + 1}. {song.title}
                          </div>
                          <div style={{ color: '#666', fontSize: '0.9rem' }}>
                            {song.artist} • {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                          </div>
                          {song.album && (
                            <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                              {song.album}
                            </div>
                          )}
                          <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            Added {new Date(song.addedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSong(song.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
