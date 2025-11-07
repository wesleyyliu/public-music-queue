// OverlayUI.jsx
import SpotifyPlayer from "./SpotifyPlayer";
import SearchSongs from "./SearchSongs";
import MenuBar from "./MenuBar";
import MusicPlayer from "./MusicPlayer";

export default function OverlayUI({
  socket,
  connected,
  userCount,
  queue,
  user,
  onRemoveSong,
  onLogin,
  onLogout,
}) {
  return (
    <>
      {/* Menu Bar */}
      <div className="absolute top-0 left-0 m-4">
        <MenuBar user={user} onLogin={onLogin} onLogout={onLogout} />
      </div>
      <div className="absolute top-0 right-0 m-4">
        <MusicPlayer socket={socket} user={user} />
      </div>
    </>
    // <div
    //   style={{
    //     position: "relative",
    //     zIndex: 1,
    //     height: "100%",
    //     display: "flex",
    //     flexDirection: "column",
    //     color: "#111",
    //   }}
    // >
    //   {/* HEADER */}
    //   <div
    //     style={{
    //       padding: "1rem",
    //       display: "flex",
    //       justifyContent: "space-between",
    //       alignItems: "center",
    //     }}
    //   >
    //     <h1>Q’ed Up</h1>
    //     {user ? (
    //       <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
    //         <span>👤 {user.display_name}</span>
    //         <button onClick={onLogout}>Logout</button>
    //       </div>
    //     ) : (
    //       <button
    //         onClick={onLogin}
    //         style={{
    //           background: "#1DB954",
    //           color: "white",
    //           padding: "0.5rem 1rem",
    //           borderRadius: "20px",
    //         }}
    //       >
    //         Login with Spotify
    //       </button>
    //     )}
    //   </div>

    //   {/* STATUS BAR */}
    //   <div
    //     style={{
    //       background: "#f0f0f0",
    //       padding: "0.75rem 1rem",
    //       margin: "0 1rem",
    //       borderRadius: "8px",
    //     }}
    //   >
    //     <p>
    //       Status:{" "}
    //       <strong style={{ color: connected ? "green" : "red" }}>
    //         {connected ? "✓ Connected" : "✗ Disconnected"}
    //       </strong>
    //       {" | "}
    //       Active Users: <strong>{userCount}</strong>
    //       {" | "}
    //       Songs in Queue: <strong>{queue.length}</strong>
    //     </p>
    //   </div>

    //   {/* MAIN LAYOUT */}
    //   <div style={{ display: "flex", gap: "1rem", flex: 1, padding: "1rem" }}>
    //     {/* LEFT PANEL */}
    //     <div
    //       style={{
    //         flex: "0 0 350px",
    //         background: "#fff9",
    //         borderRadius: "8px",
    //         padding: "1rem",
    //       }}
    //     >
    //       <SearchSongs user={user} />
    //     </div>

    //     {/* MIDDLE EMPTY SPACE (3D behind this) */}
    //     <div style={{ flex: 1, minWidth: "350px" }}></div>

    //     {/* RIGHT PANEL */}
    //     <div
    //       style={{
    //         flex: "0 0 450px",
    //         display: "flex",
    //         flexDirection: "column",
    //         gap: "1rem",
    //       }}
    //     >
    //       <SpotifyPlayer key={user?.spotify_id} socket={socket} user={user} />

    //       {/* Queue */}
    //       <div
    //         style={{
    //           flex: 1,
    //           background: "#fff9",
    //           borderRadius: "8px",
    //           padding: "1rem",
    //           overflowY: "auto",
    //         }}
    //       >
    //         <h2>Queue ({queue.length} songs)</h2>
    //         {queue.length === 0 ? (
    //           <p style={{ color: "#666", fontStyle: "italic" }}>
    //             {user
    //               ? "No songs in queue. Add some!"
    //               : "Login with Spotify to add songs."}
    //           </p>
    //         ) : (
    //           queue.map((song, i) => (
    //             <div
    //               key={song.id}
    //               style={{
    //                 padding: "0.75rem",
    //                 border: "1px solid #ddd",
    //                 borderRadius: "8px",
    //                 marginBottom: "0.5rem",
    //                 display: "flex",
    //                 justifyContent: "space-between",
    //               }}
    //             >
    //               <div style={{ flex: 1 }}>
    //                 <strong>
    //                   {i + 1}. {song.title}
    //                 </strong>
    //                 <div>{song.artist}</div>
    //               </div>
    //               <button
    //                 onClick={() => onRemoveSong(song.id)}
    //                 style={{ background: "#dc3545", color: "white" }}
    //               >
    //                 Remove
    //               </button>
    //             </div>
    //           ))
    //         )}
    //       </div>
    //     </div>
    //   </div>
    // </div>
  );
}
