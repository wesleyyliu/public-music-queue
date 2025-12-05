import { useState, useEffect } from "react";
import { Users, Pause, Play, RefreshCw, SkipForward, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RecordPlayer from "../assets/recordplayer.svg";

function MusicPlayer({
  socket,
  user,
  userCount,
  queue,
  currentRoom,
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
  const [queueVotes, setQueueVotes] = useState({});
  const [recentlyReordered, setRecentlyReordered] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const isAuthenticated = !!user;
  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

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
        // Update progress bar immediately after sync
        const state = await player.getCurrentState();
        if (state) {
          setCurrentPosition(state.position);
          setDuration(state.duration);
        }
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

    socket.on("queue:vote:updated", (voteData) => {
      console.log("Received queue vote update:", voteData);
      setQueueVotes(prev => ({
        ...prev,
        [voteData.queueItemId]: {
          upvotes: voteData.upvotes,
          downvotes: voteData.downvotes,
          score: voteData.score
        }
      }));
    });

    socket.on("queue:reordered", (data) => {
      console.log("Queue reordered:", data);
      if (data.removed && data.removed.length > 0) {
        if (onShowToast) {
          data.removed.forEach(song => {
            onShowToast(`"${song.title}" removed due to downvotes`, "warning");
          });
        }
      }

      // Show position indicators for 5 seconds
      setRecentlyReordered(true);
      setTimeout(() => {
        setRecentlyReordered(false);
      }, 5000);
    });

    return () => {
      socket.off("playback:state");
      socket.off("vote:updated");
      socket.off("song:skipped");
      socket.off("queue:vote:updated");
      socket.off("queue:reordered");
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
        const response = await fetch(`${API_URL}/api/auth/token`, {
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
        setCurrentPosition(state.position);
        setDuration(state.duration);
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

  // Update position in real-time while playing
  useEffect(() => {
    if (!player || isPaused || !isActive) return;

    const interval = setInterval(async () => {
      const state = await player.getCurrentState();
      if (state) {
        setCurrentPosition(state.position);
        setDuration(state.duration);
      }
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval);
  }, [player, isPaused, isActive]);

  // Fetch queue votes when queue changes
  useEffect(() => {
    if (!queue || queue.length === 0) return;

    const fetchQueueVotes = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:3001/api/vote/queue/all?room=${currentRoom}`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          const votesMap = {};
          data.votes.forEach(vote => {
            votesMap[vote.queueItemId] = {
              upvotes: vote.upvotes,
              downvotes: vote.downvotes,
              score: vote.score,
              userVote: data.userVotes[vote.queueItemId] || null
            };
          });
          setQueueVotes(votesMap);
        }
      } catch (error) {
        console.error("Error fetching queue votes:", error);
      }
    };

    fetchQueueVotes();
  }, [queue, currentRoom]);

  const handleQueueVote = async (queueItemId, voteType) => {
    if (!isAuthenticated) return;

    try {
      const currentVote = queueVotes[queueItemId]?.userVote;

      // If clicking the same vote type, remove the vote
      if (currentVote === voteType) {
        const response = await fetch(`http://127.0.0.1:3001/api/vote/queue/${queueItemId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ room: currentRoom }),
        });

        if (response.ok) {
          const data = await response.json();
          setQueueVotes(prev => ({
            ...prev,
            [queueItemId]: {
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              score: data.score,
              userVote: null
            }
          }));
        }
      } else {
        // Add or change vote
        const response = await fetch(`http://127.0.0.1:3001/api/vote/queue/${queueItemId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ room: currentRoom, voteType }),
        });

        if (response.ok) {
          const data = await response.json();
          setQueueVotes(prev => ({
            ...prev,
            [queueItemId]: {
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              score: data.score,
              userVote: voteType
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error voting on queue item:", error);
    }
  };

  const getPositionIndicator = (song) => {
    if (!song.positionChange || song.positionChange === 0) {
      return <Minus size={14} className="text-gray-500" />;
    } else if (song.positionChange > 0) {
      return <TrendingUp size={14} className="text-green-400" />;
    } else {
      return <TrendingDown size={14} className="text-red-400" />;
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

          {/* Progress Bar */}
          <div className="mt-3 mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{formatTime(currentPosition)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-[#E33BA9] h-1.5 rounded-full transition-all duration-100"
                style={{ width: `${duration > 0 ? (currentPosition / duration) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Song info with vote button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 mb-1">Now Playing</div>
              <div className="text-base font-medium text-white truncate">
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
                  <SkipForward size={20} className={hasVotedToSkip ? "text-red-400" : "text-gray-400"} />
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
        <div className="max-h-64 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              Queue is empty
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {queue.map((song) => {
                const votes = queueVotes[song.id] || { upvotes: song.upvotes || 0, downvotes: song.downvotes || 0, score: song.score || 0, userVote: null };
                const userVote = votes.userVote;

                return (
                  <motion.div
                    key={song.id}
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{
                      layout: { duration: 1, ease: "easeInOut" },
                      opacity: { duration: 0.3 },
                      y: { duration: 0.3 }
                    }}
                    className="glass-background rounded-md p-3 hover:bg-white/10 transition-all mb-2 flex items-center gap-3"
                  >
                  {/* Album Art */}
                  {song.albumArt && (
                    <img
                      src={song.albumArt}
                      alt={song.album}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate font-medium">
                      {song.title}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {song.artist}
                    </div>
                  </div>

                  {/* Voting buttons */}
                  {isAuthenticated && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Position change indicator - only show if recently reordered */}
                      {recentlyReordered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex-shrink-0"
                        >
                          {getPositionIndicator(song)}
                        </motion.div>
                      )}

                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleQueueVote(song.id, 'upvote')}
                          className="transition hover:scale-110"
                          title="Upvote"
                        >
                          <ThumbsUp
                            size={16}
                            className={userVote === 'upvote' ? "text-green-400" : "text-gray-400"}
                          />
                        </button>
                        <span className="text-xs text-gray-400 mt-0.5">
                          {votes.upvotes}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleQueueVote(song.id, 'downvote')}
                          className="transition hover:scale-110"
                          title="Downvote"
                        >
                          <ThumbsDown
                            size={16}
                            className={userVote === 'downvote' ? "text-red-400" : "text-gray-400"}
                          />
                        </button>
                        <span className="text-xs text-gray-400 mt-0.5">
                          {votes.downvotes}
                        </span>
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })}
            </AnimatePresence>
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
