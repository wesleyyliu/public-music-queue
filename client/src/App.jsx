import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";
import SpotifyPlayer from "./SpotifyPlayer";
import SearchSongs from "./SearchSongs";
import Scene from "./Scene";
import OverlayUI from "./UIOverlay";

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [queue, setQueue] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for session and fetch user info
    const fetchUser = async () => {
      try {
        const response = await fetch("http://127.0.0.1:3001/api/auth/me", {
          credentials: "include", // Important: send cookies with request
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();

    // Connect to server
    const newSocket = io("http://127.0.0.1:3001");

    newSocket.on("connect", () => {
      console.log("Connected to server!");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    // Listen for user count updates
    newSocket.on("users:count", (count) => {
      console.log("User count:", count);
      setUserCount(count);
    });

    // Listen for queue updates
    newSocket.on("queue:updated", (updatedQueue) => {
      console.log("Queue updated:", updatedQueue);
      setQueue(updatedQueue);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Register user with socket when both are ready
  useEffect(() => {
    if (socket && user && user.spotify_id) {
      console.log("Registering user with socket:", user.spotify_id);
      socket.emit("user:register", user.spotify_id);
    }
  }, [socket, user]);

  const removeSong = (songId) => {
    if (socket) {
      socket.emit("queue:remove", songId);
    }
  };

  const handleLogin = () => {
    window.location.href = "http://127.0.0.1:3001/api/auth/spotify";
  };

  const handleLogout = async () => {
    try {
      await fetch("http://127.0.0.1:3001/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
      }}
    >
      {/* 3D BACKGROUND */}
      <Scene />

      {/* 2D UI OVERLAY */}
      <OverlayUI
        socket={socket}
        connected={connected}
        userCount={userCount}
        queue={queue}
        user={user}
        onRemoveSong={removeSong}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
