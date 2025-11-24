import { useState } from "react";
import { Clock, SlidersHorizontal, ChevronDown } from "lucide-react";
import SearchSongs from "./SearchSongs";

const AVAILABLE_ROOMS = [
  { id: 'general', name: 'General' },
  { id: 'rock', name: 'Rock' },
  { id: 'pop', name: 'Pop' },
  { id: 'hip-hop', name: 'Hip-Hop' },
  { id: 'electronic', name: 'Electronic' },
  { id: 'jazz', name: 'Jazz' },
  { id: 'classical', name: 'Classical' },
  { id: 'country', name: 'Country' },
];

function MenuBar({ user, currentRoom, onLogin, onLogout, onRoomChange }) {
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const currentRoomName = AVAILABLE_ROOMS.find(r => r.id === currentRoom)?.name || 'General';

  const handleRoomSelect = (roomId) => {
    onRoomChange(roomId);
    setShowRoomDropdown(false);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Search Bar */}
      <SearchSongs user={user} currentRoom={currentRoom} />

      {/* Timer */}
      <div className="flex items-center gap-2 glass-background rounded-md px-3 py-2 text-gray-300">
        <Clock size={16} className="text-gray-400" />
        <span className="text-sm">0:00</span>
      </div>

      {/* Room/Genre Selector */}
      <div className="relative">
        <div
          className="flex items-center gap-2 glass-background rounded-md px-3 py-2 text-gray-300 cursor-pointer hover:bg-white/10 transition"
          onClick={() => setShowRoomDropdown(!showRoomDropdown)}
        >
          <SlidersHorizontal size={16} className="text-gray-400" />
          <span className="text-sm">{currentRoomName}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>

        {showRoomDropdown && (
          <div className="absolute top-full left-0 mt-2 glass-background rounded-md shadow-lg z-50 min-w-[150px]">
            {AVAILABLE_ROOMS.map((room) => (
              <div
                key={room.id}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-white/10 transition ${
                  currentRoom === room.id ? 'bg-white/20 text-white' : 'text-gray-300'
                }`}
                onClick={() => handleRoomSelect(room.id)}
              >
                {room.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spotify Login */}
      {user ? (
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-sm">👤 {user.display_name}</span>
          <button
            onClick={onLogout}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md px-3 py-1 transition"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={onLogin}
          className="ml-auto bg-[#E33BA9] hover:bg-[#f04bb6] text-white text-sm font-medium rounded-md px-4 py-2 transition"
        >
          Log in with Spotify
        </button>
      )}
    </div>
  );
}

export default MenuBar;
