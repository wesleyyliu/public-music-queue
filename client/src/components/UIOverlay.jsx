// OverlayUI.jsx
import MenuBar from "./MenuBar";
import MusicPlayer from "./MusicPlayer";

export default function OverlayUI({
  socket,
  userCount,
  queue,
  user,
  currentRoom,
  onRemoveSong,
  onLogin,
  onLogout,
  onRoomChange,
  onShowToast,
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
          user={user}
          userCount={userCount}
          queue={queue}
          currentRoom={currentRoom}
          onRemoveSong={onRemoveSong}
          onShowToast={onShowToast}
        />
      </div>
    </>
  );
}
