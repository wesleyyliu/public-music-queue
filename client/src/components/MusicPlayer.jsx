import { useState, useEffect } from "react";
import { Users, Pause, Play, X, RefreshCw, ThumbsDown } from "lucide-react";
import RecordPlayer from "../assets/recordplayer.svg";

function MusicPlayer({
  socket,
  user,
  userCount,
  queue,
  currentRoom,
  onRemoveSong,
  onShowToast,
}) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [serverPlaybackState, setServerPlaybackState] = useState(null);
  const [skipVoteCount, setSkipVoteCount] = useState(0);
  const [hasVotedToSkip, setHasVotedToSkip] = useState(false);
  const [skipVotePercentage, setSkipVotePercentage] = useState(0);

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
      // Reset vote state when song changes
      setSkipVoteCount(0);
      setHasVotedToSkip(false);
      setSkipVotePercentage(0);
    });

    socket.on("vote:updated", (voteData) => {
      console.log("Received vote update:", voteData);
      setSkipVoteCount(voteData.voteCount);
      setSkipVotePercentage(voteData.percentage);
    });

    socket.on("song:skipped", (data) => {
      console.log("Song skipped via vote:", data);
      if (onShowToast) {
        onShowToast(
          `Song skipped! ${data.voteCount}/${data.userCount} users voted to skip`,
          "info"
        );
      }
    });

    return () => {
      socket.off("playback:state");
      socket.off("vote:updated");
      socket.off("song:skipped");
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
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Public Music Queue Web Player",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.5,
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("✅ Spotify Player Ready with Device ID:", device_id);
        setDeviceId(device_id);
        setIsActive(true);
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("❌ Device ID has gone offline", device_id);
        setIsActive(false);
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("Initialization Error:", message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Authentication Error:", message);
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Account Error:", message);
      });

      player.addListener("playback_error", ({ message }) => {
        console.error("Playback Error:", message);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

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

  const toggleSkipVote = async () => {
    if (!isAuthenticated) return;

    try {
      const method = hasVotedToSkip ? "DELETE" : "POST";
      const response = await fetch("http://127.0.0.1:3001/api/vote/skip", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ room: currentRoom }),
      });

      if (response.ok) {
        const data = await response.json();
        setHasVotedToSkip(data.voted);
        setSkipVoteCount(data.voteCount);
        setSkipVotePercentage(data.percentage);
      }
    } catch (error) {
      console.error("Error toggling skip vote:", error);
    }
  };

  // Fetch initial skip vote status when song changes
  useEffect(() => {
    if (!serverPlaybackState?.currentSong || !isAuthenticated) return;

    const fetchSkipVoteStatus = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:3001/api/vote/skip/status?room=${currentRoom}`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          setHasVotedToSkip(data.hasVoted);
          setSkipVoteCount(data.voteCount);
          setSkipVotePercentage(data.percentage);
        }
      } catch (error) {
        console.error("Error fetching skip vote status:", error);
      }
    };

    fetchSkipVoteStatus();
  }, [serverPlaybackState?.currentSong, currentRoom, isAuthenticated]);

  return (
    <div className="glass-background rounded-lg p-4 w-96 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <span className="text-sm text-gray-300">{userCount} online</span>
        </div>
        {/* Control buttons */}
        {isAuthenticated && isActive && (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
              title="Play/Pause"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={syncToServerPlayback}
              className="bg-blue-500/20 hover:bg-blue-500/30 p-2 rounded-full transition border border-blue-500/30"
              title="Sync to room playback"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Now Playing */}
      {serverPlaybackState?.currentSong ? (
        <div className="mb-4 p-3 glass-background rounded-md">
          {/* Record player div */}
          <div className="relative flex flex-row items-center">
            {/* Record Player */}
            <img
              src={RecordPlayer}
              className="w-[210px] translate-x-1/2"
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

          {/* Song info with vote button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 mb-1">Now Playing</div>
              <div className="text-sm font-medium text-white truncate">
                {serverPlaybackState.currentSong.title}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {serverPlaybackState.currentSong.artist}
              </div>
            </div>

            {/* Skip Vote Button - compact */}
            {isAuthenticated && (
              <div className="flex flex-col items-center flex-shrink-0">
                <button
                  onClick={toggleSkipVote}
                  className="transition hover:scale-110"
                  title={hasVotedToSkip ? "Remove skip vote" : "Vote to skip"}
                >
                  <ThumbsDown size={18} className={hasVotedToSkip ? "text-red-400" : "text-gray-400"} />
                </button>
                <div className="text-xs text-gray-400 mt-0.5">
                  {skipVoteCount}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-black/30 rounded-md text-center text-gray-400 text-sm">
          No song playing
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
