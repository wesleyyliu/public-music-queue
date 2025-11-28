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
  const [skipStatus, setSkipStatus] = useState({
    voteCount: 0,
    requiredVotes: 1,
    thresholdReached: false,
  });

  const isAuthenticated = !!user;

  const SkipVoteButton = ({ skipStatus, onVote }) => (
    <button
      onClick={onVote}
      className="flex flex-col items-center justify-center gap-2 bg-transparent hover:opacity-80"
    >
      <SkipForward size={20} />
      <span className="text-sm font-semibold">
        {skipStatus.voteCount} / {skipStatus.requiredVotes}
      </span>
    </button>
  );
  

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
    if (!user || !serverPlaybackState?.currentSong) return;

    // Use songId (from songs table) or id (fallback)
    const songId =
      serverPlaybackState.currentSong.songId ||
      serverPlaybackState.currentSong.id;
    if (!songId) {
      console.error("No songId available for voting");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:3001/api/vote/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userSpotifyId: user.spotify_id,
          songId: songId,
        }),
      });

      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Failed to vote" }));
        console.error("Vote error:", error);
        return;
      }

      const data = await res.json();
      console.log("Skip vote response:", data);

      // Update local state with response data
      if (data.voteCount !== undefined) {
        setSkipStatus({
          voteCount: data.voteCount,
          requiredVotes: data.requiredVotes || userCount || 1,
          thresholdReached: data.thresholdReached || false,
        });
      }
    } catch (err) {
      console.error("Error voting to skip:", err);
    }
  };

  // Live update skip counts via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      console.log("Vote update received:", data);

      // Get current song ID (try both songId and id)
      const currentSongId =
        serverPlaybackState?.currentSong?.songId ||
        serverPlaybackState?.currentSong?.id;

      // Only update if this vote update is for the current song (or if no songId specified, assume it's for current)
      if (data.songId && currentSongId && data.songId !== currentSongId) {
        console.log(
          `Ignoring vote update for different song: ${data.songId} vs current: ${currentSongId}`
        );
        return;
      }

      console.log("Updating skip status from vote update:", data);
      setSkipStatus({
        voteCount: data.voteCount ?? 0,
        requiredVotes: data.requiredVotes ?? userCount ?? 1,
        thresholdReached: data.thresholdReached ?? false,
      });
    };

    socket.on("vote:update", handler);
    return () => socket.off("vote:update", handler);
  }, [
    socket,
    serverPlaybackState?.currentSong?.songId,
    serverPlaybackState?.currentSong?.id,
    userCount,
  ]);

  // Fetch and reset vote status when song changes
  useEffect(() => {
    const currentSongId =
      serverPlaybackState?.currentSong?.songId ||
      serverPlaybackState?.currentSong?.id;

    if (!currentSongId) {
      // No song playing, reset to defaults
      setSkipStatus({
        voteCount: 0,
        requiredVotes: userCount || 1,
        thresholdReached: false,
      });
      return;
    }

    // Fetch vote status for the new song
    const fetchVoteStatus = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:3001/api/vote/status?songId=${currentSongId}`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Fetched vote status for new song:", currentSongId, data);
          setSkipStatus({
            voteCount: data.voteCount ?? 0,
            requiredVotes: data.requiredVotes ?? userCount ?? 1,
            thresholdReached: data.thresholdReached ?? false,
          });
        } else {
          // If fetch fails, reset to defaults
          setSkipStatus({
            voteCount: 0,
            requiredVotes: userCount || 1,
            thresholdReached: false,
          });
        }
      } catch (error) {
        console.error("Error fetching vote status:", error);
        setSkipStatus({
          voteCount: 0,
          requiredVotes: userCount || 1,
          thresholdReached: false,
        });
      }
    };

    fetchVoteStatus();
  }, [
    serverPlaybackState?.currentSong?.songId,
    serverPlaybackState?.currentSong?.id,
    userCount,
  ]);

  // Reset hasSynced when the song ID changes (allows re-syncing to new songs)
  useEffect(() => {
    const currentSongId = serverPlaybackState?.currentSong?.id;
    if (currentSongId !== undefined) {
      setHasSynced(false);
    }
  }, [serverPlaybackState?.currentSong?.id]);

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

  const togglePlay = async () => {
    if (!player) return;

    // If there's no current track and no server playback state, trigger server to start
    if (
      !currentTrack &&
      (!serverPlaybackState || !serverPlaybackState.currentSong)
    ) {
      console.log("No track available, triggering server to start playback...");
      // Reset hasSynced to allow syncPlayback to run
      setHasSynced(false);
      // Call syncPlayback which will trigger server to start if needed
      await syncPlayback();
      return;
    }

    // If there's a server playback state but we haven't synced, sync first
    if (serverPlaybackState?.currentSong && !hasSynced) {
      console.log("Syncing to server playback state before playing...");
      await syncPlayback();
      return;
    }

    // Otherwise, just toggle play/pause
    player.togglePlay();
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
                  <div className="flex flex-col items-center gap-2 text-white">
                    <SkipVoteButton
                      skipStatus={skipStatus}
                      onVote={voteToSkip}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ThumbsUp size={20} /> <span>250</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ThumbsDown size={20} /> <span>54</span>
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

        {/* Queue Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Queue ({queue.length-1} songs)
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
