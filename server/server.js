import express from "express";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  PORT = 3000,
} = process.env;

const SCOPES = [
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

let ACCESS_TOKEN = null;
let REFRESH_TOKEN = null;

// login
app.get("/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    show_dialog: "true",
  });
  res.redirect("https://accounts.spotify.com/authorize?" + params.toString());
});

// callback
app.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send("Auth error: " + error);

  try {
    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      qs.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    ACCESS_TOKEN = tokenRes.data.access_token;
    REFRESH_TOKEN = tokenRes.data.refresh_token;

    res.send(
      `<h2>Logged in!</h2>
       <p><a href="/devices">/devices</a> to list playback devices.</p>
       <p>Then hit: <code>/play?playlist=spotify:playlist:YOUR_PLAYLIST_ID&device_id=YOUR_DEVICE_ID</code></p>`
    );
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).send("Token exchange failed");
  }
});

async function refreshAccessToken() {
  if (!REFRESH_TOKEN) throw new Error("No refresh token");
  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    qs.stringify({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  ACCESS_TOKEN = res.data.access_token;
}

// devices
app.get("/devices", async (req, res) => {
  try {
    const r = await axios.get("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    res.json(r.data);
  } catch (e) {
    if (e.response?.status === 401) {
      try {
        await refreshAccessToken();
        const r2 = await axios.get("https://api.spotify.com/v1/me/player/devices", {
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        });
        return res.json(r2.data);
      } catch {}
    }
    console.error(e.response?.data || e.message);
    res.status(500).send("Failed to fetch devices");
  }
});

//Play a playlist
// /play?playlist=spotify:playlist:37i9dQZF1DXcBWIGoYBM5M&device_id=abcd1234 (device_id optional)
app.get("/play", async (req, res) => {
  const { playlist, device_id } = req.query;
  if (!playlist) return res.status(400).send("Missing ?playlist=spotify:playlist:ID");

  const url = "https://api.spotify.com/v1/me/player/play" + (device_id ? `?device_id=${encodeURIComponent(device_id)}` : "");
  const body = { context_uri: playlist };

  const doPlay = () =>
    axios.put(url, body, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

  try {
    await doPlay();
    res.send(`Playing ${playlist} ${device_id ? "on device " + device_id : "(active device)"}!`);
  } catch (e) {
    if (e.response?.status === 404) {
      return res.status(404).send("No active device. Open Spotify on a device first, or pass ?device_id=.");
    }
    if (e.response?.status === 401) {
      try {
        await refreshAccessToken();
        await doPlay();
        return res.send(`Playing ${playlist} ${device_id ? "on device " + device_id : "(active device)"}!`);
      } catch {}
    }
    console.error(e.response?.data || e.message);
    res.status(500).send("Failed to start playback");
  }
});

app.listen(PORT, () => console.log(`Server running at http://127.0.0.1:${PORT}`));
// http://127.0.0.1:3000/play?playlist=spotify:playlist:7KbXGLoXuVn0VKGz1zVue9