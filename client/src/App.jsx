import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

function App() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [queue, setQueue] = useState([])
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user just logged in (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyId = urlParams.get('spotify_id');
    const displayName = urlParams.get('display_name');
    const error = urlParams.get('error');

    if (error) {
      console.error('Auth error:', error);
      alert(`Login failed: ${error}`);
    } else if (spotifyId && displayName) {
      // Store user info
      const userData = { spotify_id: spotifyId, display_name: displayName };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Clean URL
      window.history.replaceState({}, document.title, '/');
    } else {
      // Check if user already logged in
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    }

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

  const addSong = () => {
    if (socket) {
      socket.emit('queue:add')
    }
  }

  const removeSong = (songId) => {
    if (socket) {
      socket.emit('queue:remove', songId)
    }
  }

  const handleLogin = () => {
    window.location.href = 'http://127.0.0.1:3001/api/auth/spotify';
  }

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🎵 Public Music Queue</h1>
        
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
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <p>
          Status: <strong style={{ color: connected ? 'green' : 'red' }}>
            {connected ? '✓ Connected' : '✗ Disconnected'}
          </strong>
          {' | '}
          Active Users: <strong>{userCount}</strong>
          {' | '}
          Songs in Queue: <strong>{queue.length}</strong>
        </p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={addSong}
          disabled={!connected}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: connected ? 'pointer' : 'not-allowed',
            background: connected ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          ➕ Add Random Song
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Queue ({queue.length} songs)</h2>
        {queue.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No songs in queue. Click "Add Random Song" to add one!
          </p>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {queue.map((song, index) => (
              <div 
                key={song.id}
                style={{
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {index + 1}. {song.title}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    {song.artist} • {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
                  </div>
                  <div style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Added {new Date(song.addedAt).toLocaleTimeString()}
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

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <p>💡 Open this page in multiple tabs to see real-time synchronization!</p>
      </div>
    </div>
  )
}

export default App
