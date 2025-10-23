import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

function App() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [pongMessage, setPongMessage] = useState('')

  useEffect(() => {
    // Connect to server
    const newSocket = io('http://localhost:3001')

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

    // Listen for pong responses
    newSocket.on('pong', (data) => {
      console.log('Received pong:', data)
      setPongMessage(`${data.message} at ${new Date(data.timestamp).toLocaleTimeString()}`)
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      newSocket.close()
    }
  }, [])

  const sendPing = () => {
    if (socket) {
      socket.emit('ping', { message: 'ping from client', timestamp: Date.now() })
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🎵 Public Music Queue</h1>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>WebSocket Status</h2>
        <p>
          Status: <strong style={{ color: connected ? 'green' : 'red' }}>
            {connected ? '✓ Connected' : '✗ Disconnected'}
          </strong>
        </p>
        <p>Active Users: <strong>{userCount}</strong></p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={sendPing}
          disabled={!connected}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: connected ? 'pointer' : 'not-allowed',
            background: connected ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Send Ping to Server
        </button>
        {pongMessage && (
          <p style={{ marginTop: '1rem' }}>
            Response: <strong>{pongMessage}</strong>
          </p>
        )}
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <p>Open this page in multiple tabs to see the user count update!</p>
      </div>
    </div>
  )
}

export default App
