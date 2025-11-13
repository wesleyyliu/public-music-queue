import { Search, Clock, SlidersHorizontal } from "lucide-react";
import SearchSongs from "./SearchSongs";

function MenuBar({ user, onLogin, onLogout }) {
  return (
    <div className="flex items-center gap-3">
      {/* Search Bar */}
      <SearchSongs user={user} />

      {/* Timer */}
      <div className="flex items-center gap-2 glass-background rounded-md px-3 py-2 text-gray-300">
        <Clock size={16} className="text-gray-400" />
        <span className="text-sm">0:00</span>
      </div>

      {/* Genre Filter */}
      <div className="flex items-center gap-2 glass-background rounded-md px-3 py-2 text-gray-300 cursor-pointer">
        <SlidersHorizontal size={16} className="text-gray-400" />
        <span className="text-sm">All Genres</span>
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
