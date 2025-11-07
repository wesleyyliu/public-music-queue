import { useState, useEffect } from "react";
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Users,
  Pause,
  Play,
  History,
  SkipBack,
  SkipForward,
  Info,
  X,
} from "lucide-react";

function SpotifyPlayer({
  socket,
  connected,
  user,
  userCount,
  queue,
  onRemoveSong,
}) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [serverPlaybackState, setServerPlaybackState] = useState(null);

  const isAuthenticated = !!user;

  // Listen for playback updates
  useEffect(() => {
    if (!socket) return;
    socket.on("playback:state", (state) => setServerPlaybackState(state));
    return () => socket.off("playback:state");
  }, [socket]);

  // Fetch queue updates from server
  const fetchQueue = async () => {
    try {
      const res = await fetch("http://127.0.0.1:3001/api/queue", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error("Error fetching queue:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchQueue();
  }, [isAuthenticated]);

  // Sync playback logic
  const syncPlayback = async () => {
    if (!deviceId || !accessToken || !serverPlaybackState) return;
    try {
      if (serverPlaybackState.currentSong && serverPlaybackState.isPlaying) {
        const elapsed = Date.now() - serverPlaybackState.startedAt;
        const position_ms = Math.max(0, elapsed);
        await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: [serverPlaybackState.currentSong.spotifyUri],
              position_ms,
            }),
          }
        );
      } else {
        await fetch("http://127.0.0.1:3001/api/queue/pop-to-spotify", {
          method: "POST",
          credentials: "include",
        });
      }
    } catch (err) {
      console.error("Error syncing playback:", err);
    }
  };

  // Fetch Spotify token
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchToken = async () => {
      try {
        const response = await fetch("http://127.0.0.1:3001/api/auth/token", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.access_token);
        } else {
          const error = await response.json();
          setTokenError(
            error.expired
              ? "Your session has expired. Please log in again."
              : "Failed to get access token"
          );
        }
      } catch {
        setTokenError("Failed to connect to server");
      }
    };
    fetchToken();
  }, [isAuthenticated]);

  // Initialize Spotify SDK
  useEffect(() => {
    if (!accessToken) return;
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Q'ed Up Player",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.5,
      });

      spotifyPlayer.addListener("ready", ({ device_id }) => {
        setDeviceId(device_id);
        setIsActive(true);
      });

      spotifyPlayer.addListener("not_ready", () => setIsActive(false));
      spotifyPlayer.addListener("player_state_changed", (state) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => player && player.disconnect();
  }, [accessToken]);

  // 🕹️ Playback controls
  const togglePlay = () => player?.togglePlay();
  const skipNext = () => player?.nextTrack();
  const skipPrevious = () => player?.previousTrack();

  // UI conditional states
  if (!isAuthenticated)
    return (
      <div className="glass-background p-4 text-center text-gray-300 rounded-xl">
        🔒 Login with Spotify to control playback
      </div>
    );

  if (tokenError)
    return (
      <div className="glass-background text-red-300 border border-red-500/30 rounded-md p-3 text-sm">
        ⚠️ {tokenError}
      </div>
    );

  if (!accessToken)
    return (
      <div className="glass-background text-gray-300 p-4 rounded-xl text-center">
        Loading Spotify Player...
      </div>
    );

  // MAIN PLAYER UI
  return (
    <div className="flex items-center justify-center">
      <div className="glass-background w-[26rem] rounded-xl p-5 flex flex-col gap-5 shadow-2xl text-white">
        {/* 🎛️ Top Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 glass-background rounded-md px-4 py-2 text-white font-medium">
            <Users size={18} />
            <span>{userCount}</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="glass-background px-3 py-2" onClick={togglePlay}>
              {isPaused ? <Play /> : <Pause />}
            </button>
            <button className="glass-background px-3 py-2">
              <Heart />
            </button>
            <button className="glass-background px-3 py-2">
              <History />
            </button>
          </div>
        </div>

        {/* Album + Info */}
        <div className="glass-background py-4 px-6 rounded-lg flex flex-col items-center">
          {currentTrack ? (
            <>
              <img
                src={currentTrack.album.images[0]?.url}
                alt={currentTrack.album.name}
                className="w-48 h-48 rounded-lg"
              />

              <p className="text-sm w-full text-left my-3">Now Playing:</p>
              <div className="text-center flex justify-between items-center w-full">
                <div className="flex flex-col flex-start text-left">
                  <h2 className="text-xl font-semibold">{currentTrack.name}</h2>
                  <p className="text-sm">
                    {currentTrack.artists
                      .map((artist) => artist.name)
                      .join(", ")}
                  </p>
                </div>

                <div className="flex flex-row justify-center items-center gap-6 font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <ThumbsUp size={28} /> <span>250</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ThumbsDown size={28} /> <span>54</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm py-8">
              No song currently playing
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-3 glass-background p-3 rounded-md">
          <p className="text-sm text-gray-300">
            Status:{" "}
            <span className="font-medium">
              {connected ? "✓ Connected" : "⏳ Connecting..."}
            </span>
          </p>

          <div className="flex gap-4">
            <button
              onClick={skipPrevious}
              className="glass-background p-2 rounded-md"
            >
              <SkipBack />
            </button>
            <button
              onClick={togglePlay}
              className="bg-[#1DB954] hover:bg-[#1ed760] text-white px-4 py-2 rounded-md font-semibold flex items-center gap-1"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? "Play" : "Pause"}
            </button>
            <button
              onClick={skipNext}
              className="glass-background p-2 rounded-md"
            >
              <SkipForward />
            </button>
          </div>

          <button
            onClick={syncPlayback}
            className="text-sm glass-background px-3 py-1 rounded-md hover:bg-white/10"
          >
            🔄 Resync Playback
          </button>

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm glass-background px-3 py-1 rounded-md flex items-center gap-1 hover:bg-white/10"
          >
            <Info size={14} />
            {showInstructions ? "Hide Instructions" : "How to Use"}
          </button>

          {showInstructions && (
            <div className="text-xs text-gray-300 mt-2 text-left w-full">
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Spotify on desktop or mobile</li>
                <li>Start playing a song</li>
                <li>Click the “Devices” icon</li>
                <li>Select “Q’ed Up Player”</li>
                <li>Control playback here or in Spotify!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Queue Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Queue ({queue.length} songs)
          </h3>

          {queue.length === 0 ? (
            <p className="text-gray-400 italic">
              {user
                ? "No songs in queue. Add some!"
                : "Login with Spotify to add songs."}
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {queue.map((song, i) => (
                <div
                  key={song.id}
                  className="glass-background flex justify-between items-center px-3 py-2 rounded-md"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-sm">
                      {i + 1}. {song.title}
                    </span>
                    <span className="text-xs text-gray-400">{song.artist}</span>
                  </div>
                  <button
                    onClick={() => onRemoveSong(song.id)}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpotifyPlayer;
