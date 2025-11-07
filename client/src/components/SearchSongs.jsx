import { useState, useEffect, useRef } from 'react';
import Toast from './Toast';

function SearchSongs({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const debounceTimer = useRef(null);
  
  const isAuthenticated = !!user;

  // Debounced search function
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't search if query is empty
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Set a new timer
    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, isAuthenticated]);

  const performSearch = async (query) => {
    setIsLoading(true);
    setError(null);

    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('Please login with Spotify to search for songs');
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:3001/api/spotify/search?q=${encodeURIComponent(query)}&limit=10`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search songs');
      }

      const data = await response.json();
      setSearchResults(data.tracks);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAddToQueue = async (track) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setToast({ message: 'Please login with Spotify to add songs to queue', type: 'error' });
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:3001/api/queue/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ track })
      });

      if (!response.ok) {
        throw new Error('Failed to add song to queue');
      }

      const data = await response.json();
      console.log('Added to queue:', data);
      
      // Show success toast
      setToast({ message: `Added "${track.name}" to queue!`, type: 'success' });
    } catch (err) {
      console.error('Add to queue error:', err);
      setToast({ message: 'Failed to add song to queue', type: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ margin: '0 0 1rem 0' }}>🔍 Search Songs</h2>
      
      {/* Search Input */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for songs, artists, or albums..."
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: '2px solid #ddd',
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#1DB954'}
          onBlur={(e) => e.target.style.borderColor = '#ddd'}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ marginTop: '1rem', textAlign: 'center', color: '#666' }}>
          <p>🔄 Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c33'
        }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Search Results */}
      {!isLoading && searchResults.length > 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <p style={{ color: '#666', marginBottom: '0.5rem' }}>
            Found {searchResults.length} results
          </p>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {searchResults.map((track) => (
              <div
                key={track.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1DB954';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Album Art */}
                {track.albumArt && (
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      marginRight: '1rem'
                    }}
                  />
                )}

                {/* Song Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {track.name}
                  </div>
                  <div style={{
                    color: '#666',
                    fontSize: '0.9rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '0.25rem'
                  }}>
                    {track.artist}
                  </div>
                  <div style={{
                    color: '#999',
                    fontSize: '0.8rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '0.25rem'
                  }}>
                    {track.album} • {formatDuration(track.duration_ms)}
                  </div>
                </div>

                {/* Action Buttons (placeholder for now) */}
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  {track.preview_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Play preview - we'll implement this later
                        window.open(track.preview_url, '_blank');
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#f0f0f0',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f0f0f0'}
                    >
                      🎵 Preview
                    </button>
                  )}
                  
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleAddToQueue(track);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: '#1DB954',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1ed760'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#1DB954'}
                  >
                    ➕ Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results State */}
      {!isLoading && searchQuery.trim() && searchResults.length === 0 && !error && (
        <div style={{
          marginTop: '1rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#666',
          background: '#f9f9f9',
          borderRadius: '8px'
        }}>
          <p>No results found for "{searchQuery}"</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Try different keywords or check your spelling
          </p>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default SearchSongs;

