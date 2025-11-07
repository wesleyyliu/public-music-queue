import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import Toast from "./Toast";

function SearchSongs({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const debounceTimer = useRef(null);

  const isAuthenticated = !!user;

  // Debounced search logic
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setError(null);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery, isAuthenticated]);

  const performSearch = async (query) => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated) {
      setError("Please login with Spotify to search for songs");
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:3001/api/spotify/search?q=${encodeURIComponent(
          query
        )}&limit=10`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("Failed to search songs");

      const data = await response.json();
      setSearchResults(data.tracks || []);
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleAddToQueue = async (track) => {
    if (!isAuthenticated) {
      setToast({
        message: "Please login with Spotify to add songs to queue",
        type: "error",
      });
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:3001/api/queue/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ track }),
      });

      if (!response.ok) throw new Error("Failed to add song to queue");

      const data = await response.json();
      console.log("Added to queue:", data);

      setToast({ message: `Added "${track.name}" to queue!`, type: "success" });
    } catch (err) {
      console.error("Add to queue error:", err);
      setToast({ message: "Failed to add song to queue", type: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 glass-background rounded-md px-3 py-2 w-full max-w-md text-gray-300">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search songs, albums, artists"
          className="bg-transparent outline-none text-sm w-full placeholder-gray-400"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-gray-400 absolute top-12 mt-2 text-sm animate-pulse">
          Searching...
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="glass-background absolute top-12 mt-2 text-red-300 border border-red-500/20 rounded-md p-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {!isLoading && searchResults.length > 0 && (
        <div className="absolute top-12 flex flex-col gap-2 mt-2 overflow-y-auto max-h-[60vh] max-w-[30vw]">
          {searchResults.map((track) => (
            <div
              key={track.id}
              className="flex items-center justify-between glass-background rounded-md p-2 hover:bg-white/10 transition cursor-pointer"
            >
              {/* Album Art */}
              {track.albumArt && (
                <img
                  src={track.albumArt}
                  alt={track.album}
                  className="w-12 h-12 rounded-md object-cover"
                />
              )}

              {/* Song Info */}
              <div className="flex-1 ml-3 overflow-hidden">
                <p className="text-white text-sm font-medium truncate">
                  {track.name}
                </p>
                <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                <p className="text-gray-500 text-xs">
                  {track.album} • {formatDuration(track.duration_ms)}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                {track.preview_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(track.preview_url, "_blank");
                    }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md px-2 py-1"
                  >
                    🎵 Preview
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToQueue(track);
                  }}
                  className="text-xs bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-md px-2 py-1"
                >
                  ➕ Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading &&
        searchQuery.trim() &&
        searchResults.length === 0 &&
        !error && (
          <p className="absolute top-12 mt-2 text-gray-400 text-sm">
            No results for "{searchQuery}"
          </p>
        )}

      {/* Toast */}
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
