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

    socket.on("playback:state", (state) => {
      console.log("Received playback state from server:", state);
      setServerPlaybackState(state);
    });

    return () => {
      socket.off("playback:state");
    };
  }, [socket]);

  // Sync playback function - can be called manually or automatically
  const syncPlayback = async () => {
    if (!deviceId || !accessToken || !serverPlaybackState) {
      console.log(
        "Cannot sync: missing deviceId, accessToken, or serverPlaybackState"
      );
      return;
    }

    console.log("🔄 Syncing playback...");

    try {
      // If there's a song currently playing on server, sync to it
      if (serverPlaybackState.currentSong && serverPlaybackState.isPlaying) {
        console.log("Syncing to server playback state:", serverPlaybackState);

        // Calculate current position based on when the song started
        const elapsed = Date.now() - serverPlaybackState.startedAt;
        const position_ms = Math.max(0, elapsed);

        // Transfer playback AND start playing in one call
        // The device_id parameter automatically transfers playback to this device
        console.log(
          "Starting playback on Web Player at position:",
          Math.floor(position_ms / 1000),
          "s"
        );
        const playResponse = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: [serverPlaybackState.currentSong.spotifyUri],
              position_ms: position_ms,
            }),
          }
        );

        if (playResponse.ok || playResponse.status === 204) {
          console.log(
            `✅ Synced and playing at position: ${Math.floor(
              position_ms / 1000
            )}s`
          );
          setHasSynced(true);
        } else {
          console.error("Failed to sync playback:", await playResponse.text());
        }
      } else {
        // No song playing on server, trigger server to start playback
        console.log("No song playing on server, requesting playback start...");

        const response = await fetch(
          "http://127.0.0.1:3001/api/queue/pop-to-spotify",
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (response.ok) {
          console.log("Playback started successfully");
          setHasSynced(true);
        } else {
          console.error("Failed to start playback:", await response.text());
        }
      }
    } catch (error) {
      console.error("Error syncing/starting playback:", error);
    }
  };

  const voteToSkip = async () => {
    try {
      console.log("USER OBJECT:", user);
      console.log("Sending skip vote:", {
        userId: user.spotify_id,
        songId: serverPlaybackState?.currentSong?.id,
        serverPlaybackState,
        user,
      });

      const res = await fetch("http://127.0.0.1:3001/api/vote/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: user.spotify_id,
          songId: serverPlaybackState?.currentSong?.id,
        }),
      });

      const data = await res.json();
      console.log("Skip vote response:", data);
    } catch (err) {
      console.error("Error voting to skip:", err);
    }
  };

  // Auto-sync when device becomes active
  useEffect(() => {
    if (
      !isActive ||
      !deviceId ||
      !accessToken ||
      !serverPlaybackState ||
      hasSynced
    )
      return;

    syncPlayback();
  }, [isActive, deviceId, accessToken, serverPlaybackState, hasSynced]);

  useEffect(() => {
    // Only fetch access token if user is authenticated
    if (!isAuthenticated) return;

    // Fetch access token from backend
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
          if (error.expired) {
            setTokenError("Your session has expired. Please log in again.");
          } else {
            setTokenError("Failed to get access token");
          }
        }
      } catch (error) {
        console.error("Error fetching token:", error);
        setTokenError("Failed to connect to server");
      }
    };

    fetchToken();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!accessToken) return;

    // Load Spotify SDK script
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    // Initialize player when SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Q'ed Up Player",
        getOAuthToken: (cb) => {
          cb(accessToken);
        },
        volume: 0.5,
      });

      // Ready event - player is connected
      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("Ready with Device ID", device_id);
        setDeviceId(device_id);
        setIsActive(true);
      });

      // Not Ready event - player went offline
      spotifyPlayer.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline", device_id);
        setIsActive(false);
      });

      // Player state changed - just update UI state
      spotifyPlayer.addListener("player_state_changed", (state) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      // Error listeners
      spotifyPlayer.addListener("initialization_error", ({ message }) => {
        console.error("Initialization Error:", message);
      });

      spotifyPlayer.addListener("authentication_error", ({ message }) => {
        console.error("Authentication Error:", message);
      });

      spotifyPlayer.addListener("account_error", ({ message }) => {
        console.error("Account Error:", message);
      });

      spotifyPlayer.addListener("playback_error", ({ message }) => {
        console.error("Playback Error:", message);
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
                  <button
                    onClick={voteToSkip}
                    className="flex flex-col items-center gap-2 bg-transparent text-white"
                  >
                    <SkipBack size={28} /> <span>501</span>
                  </button>
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
              onClick={voteToSkip}
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
