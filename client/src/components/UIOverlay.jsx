// OverlayUI.jsx
import MenuBar from "./MenuBar";
import MusicPlayer from "./MusicPlayer";

export default function OverlayUI({
  socket,
  connected,
  userCount,
  queue,
  user,
  currentRoom,
  onRemoveSong,
  onLogin,
  onLogout,
  onRoomChange,
}) {
  return (
    <>
      {/* Menu Bar */}
      <div className="absolute top-0 left-0 m-4">
        <MenuBar
          user={user}
          currentRoom={currentRoom}
          onLogin={onLogin}
          onLogout={onLogout}
          onRoomChange={onRoomChange}
        />
      </div>
      <div className="absolute top-0 right-0 m-4">
        <MusicPlayer
          key={user?.spotify_id}
          socket={socket}
          connected={connected}
          user={user}
          userCount={userCount}
          queue={queue}
          currentRoom={currentRoom}
          onRemoveSong={onRemoveSong}
        />
      </div>
    </>
  );
}
