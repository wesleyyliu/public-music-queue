import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Scene from "./components/Scene";
import OverlayUI from "./components/UIOverlay";
import Toast from "./components/Toast";

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [queue, setQueue] = useState([]);
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [toast, setToast] = useState(null);

  // Get API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

  useEffect(() => {
    // Check for session and fetch user info
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
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
    const newSocket = io(API_URL);

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

  // Join room when socket connects or room changes
  useEffect(() => {
    if (socket && connected) {
      console.log("Joining room:", currentRoom);
      socket.emit("room:join", currentRoom);
    }
  }, [socket, connected, currentRoom]);

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
    window.location.href = `${API_URL}/api/auth/spotify`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRoomChange = (newRoom) => {
    setCurrentRoom(newRoom);
  };

  const showToast = (message, type = "info") => {
    setToast({ message, type });
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
        currentRoom={currentRoom}
        onRemoveSong={removeSong}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRoomChange={handleRoomChange}
        onShowToast={showToast}
      />

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

export default App;