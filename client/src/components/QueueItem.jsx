export function QueueItem({ title, artist, sub, upNext, cover }) {
  return (
    <div className="relative glass-background rounded-md flex items-center justify-between overflow-hidden hover:bg-white/10 transition">
      {/* Foreground Content */}
      <div className="relative flex items-center gap-3 w-full">
        {/* Album Cover */}
        <img
          src={cover || "public/album.jpg"}
          alt={`${title} cover`}
          className="h-14 ml-1 rounded-md object-cover flex-shrink-0"
        />

        {/* Song Info */}
        <div className="py-3 flex-1">
          {sub && <p className="text-xs text-gray-300">{sub}</p>}
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-300">{artist}</p>
        </div>

        {/* “Up Next” Tag */}
        {upNext && (
          <span className="text-xs bg-pink-600 px-2 py-0.5 rounded-lg whitespace-nowrap mr-3">
            Up Next
          </span>
        )}
      </div>
    </div>
  );
}
