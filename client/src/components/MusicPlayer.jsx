import { useState, useEffect } from "react";
import { Users, Pause, Play, SkipForward, X, RefreshCw } from "lucide-react";
import RecordPlayer from "../assets/recordplayer.svg";

function MusicPlayer({
  socket,
  connected,
  user,
  userCount,
  queue,
  currentRoom,
  onRemoveSong,
}) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [serverPlaybackState, setServerPlaybackState] = useState(null);
  const [playerStatus, setPlayerStatus] = useState("Not initialized");

  const isAuthenticated = !!user;

  // Sync to server playback function
  const syncToServerPlayback = async () => {
    if (!accessToken || !deviceId || !player) {
      console.log("Cannot sync: missing accessToken, deviceId, or player");
      return;
    }

    // If server says nothing is playing, pause the player
    if (!serverPlaybackState?.currentSong || !serverPlaybackState?.isPlaying) {
      console.log("⏸️ Server has no active playback, pausing player");
      if (!isPaused) {
        player.pause();
      }
      return;
    }

    console.log("🔄 Syncing to server playback state:", serverPlaybackState);

    try {
      // Calculate current position based on when the song started
      const elapsed = Date.now() - serverPlaybackState.startedAt;
      const position_ms = Math.max(0, elapsed);

      // Start playback on this device at the calculated position
      const response = await fetch(
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

      if (response.ok || response.status === 204) {
        console.log(
          `✅ Synced to position: ${Math.floor(position_ms / 1000)}s`
        );
      } else {
        const error = await response.text();
        console.error("Failed to sync playback:", error);
      }
    } catch (error) {
      console.error("Error syncing playback:", error);
    }
  };

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

  // Auto-sync when server playback state changes and player is ready
  useEffect(() => {
    if (!accessToken || !deviceId || !isActive || !player) {
      console.log("Player not ready for auto-sync");
      return;
    }

    // Sync to whatever the server says (including "nothing playing")
    console.log("Auto-syncing to server playback state");
    syncToServerPlayback();
  }, [serverPlaybackState, currentRoom, isActive, player]);

  // Fetch access token
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAccessToken = async () => {
      try {
        const response = await fetch("http://127.0.0.1:3001/api/auth/token", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.access_token);
        }
      } catch (error) {
        console.error("Error fetching access token:", error);
      }
    };

    fetchAccessToken();
  }, [isAuthenticated]);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      setPlayerStatus("Not logged in");
      return;
    }

    setPlayerStatus("Loading Spotify SDK...");

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      setPlayerStatus("Initializing player...");

      const player = new window.Spotify.Player({
        name: "Public Music Queue Web Player",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.5,
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("✅ Spotify Player Ready with Device ID:", device_id);
        setDeviceId(device_id);
        setIsActive(true);
        setPlayerStatus("Ready");
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("❌ Device ID has gone offline", device_id);
        setPlayerStatus("Device offline");
        setIsActive(false);
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("Initialization Error:", message);
        setPlayerStatus(`Error: ${message}`);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Authentication Error:", message);
        setPlayerStatus(`Auth error: ${message}`);
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Account Error:", message);
        setPlayerStatus("Premium required");
      });

      player.addListener("playback_error", ({ message }) => {
        console.error("Playback Error:", message);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      setPlayerStatus("Connecting...");
      player.connect();
      setPlayer(player);
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken, isAuthenticated]);

  const togglePlay = async () => {
    if (!player) return;

    // Check if we're playing the same song as the server
    const isPlayingCorrectSong =
      currentTrack?.uri === serverPlaybackState?.currentSong?.spotifyUri;

    // If server has a song and we're NOT playing it, sync to it
    if (
      serverPlaybackState?.currentSong &&
      serverPlaybackState?.isPlaying &&
      !isPlayingCorrectSong
    ) {
      console.log("Syncing to server because playing different song");
      await syncToServerPlayback();
    } else {
      // Otherwise just toggle play/pause
      console.log("Toggling play/pause");
      player.togglePlay();
    }
  };

  const skipToNext = async () => {
    try {
      await fetch("http://127.0.0.1:3001/api/queue/pop-to-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ room: currentRoom }),
      });
    } catch (error) {
      console.error("Error skipping to next:", error);
    }
  };

  return (
    <div className="glass-background rounded-lg p-4 w-96 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <span className="text-sm text-gray-300">{userCount} online</span>
        </div>
        <div className="text-xs text-gray-400">
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>
      </div>

      {/* Current Room */}
      <div className="mb-3 text-center">
        <div className="text-xs text-gray-400 uppercase tracking-wider">
          Room
        </div>
        <div className="text-lg font-semibold text-white capitalize">
          {currentRoom}
        </div>
      </div>

      {/* Now Playing */}
      {serverPlaybackState?.currentSong ? (
        <div className="mb-4 p-3 glass-background rounded-md">
          {/* Record player div */}
          <div className="relative flex flex-row items-center">
            {/* Record Player */}
            <img
              src={RecordPlayer}
              className="w-[210px] translate-x-1/2" // adjust as needed
            />
            {/* Album Art overlay */}
            {currentTrack?.album?.images?.[0]?.url && (
              <img
                src={currentTrack.album.images[0].url}
                alt={currentTrack.album.name || "Album Art"}
                className="
                  absolute
                  w-48 h-48 rounded-lg
                  top-1/2 left-1/3
                  -translate-y-1/2 -translate-x-1/2
                  z-10
                "
              />
            )}
          </div>

          <div className="text-xs text-gray-400 mb-1">Now Playing</div>
          <div className="text-sm font-medium text-white truncate">
            {serverPlaybackState.currentSong.title}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {serverPlaybackState.currentSong.artist}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-black/30 rounded-md text-center text-gray-400 text-sm">
          No song playing
        </div>
      )}

      {/* Controls */}
      {isAuthenticated && isActive && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={togglePlay}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition"
            title="Play/Sync to current room"
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button
            onClick={syncToServerPlayback}
            className="bg-blue-500/20 hover:bg-blue-500/30 p-2 rounded-full transition border border-blue-500/30"
            title="Sync to room playback"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={skipToNext}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition"
            title="Skip to next song"
          >
            <SkipForward size={20} />
          </button>
        </div>
      )}

      {/* Queue */}
      <div>
        <div className="text-sm font-medium text-gray-300 mb-2">
          Queue ({queue.length})
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              Queue is empty
            </div>
          ) : (
            queue.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center justify-between bg-black/20 rounded-md p-2 hover:bg-black/30 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {song.title}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {song.artist}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveSong(song.id)}
                  className="ml-2 text-gray-400 hover:text-red-400 transition"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Player Status */}
      {isAuthenticated && (
        <div
          className={`mt-4 p-3 rounded-md border ${
            isActive
              ? "bg-green-500/20 border-green-500/30"
              : "bg-yellow-500/20 border-yellow-500/30"
          }`}
        >
          <p className="text-xs font-medium mb-1">
            Player Status:{" "}
            <span className={isActive ? "text-green-300" : "text-yellow-300"}>
              {playerStatus}
            </span>
          </p>
          {!isActive && playerStatus === "Premium required" && (
            <p className="text-xs text-yellow-200 mt-2">
              ⚠️ Spotify Premium is required for web playback
            </p>
          )}
          {!isActive &&
            playerStatus !== "Premium required" &&
            playerStatus !== "Not logged in" && (
              <p className="text-xs text-yellow-200 mt-2">
                💡 Tip: Make sure you have Spotify open on another device or
                wait for the web player to connect
              </p>
            )}
        </div>
      )}

      {/* Login Prompt */}
      {!isAuthenticated && (
        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-md">
          <p className="text-xs text-yellow-200">
            Login with Spotify to control playback
          </p>
        </div>
      )}
    </div>
  );
}

export default MusicPlayer;
