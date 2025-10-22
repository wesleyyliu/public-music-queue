from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

load_dotenv()

scope = "user-modify-playback-state user-read-playback-state"
auth_manager = SpotifyOAuth(scope=scope, cache_path=".cache_spotify")
sp = Spotify(auth_manager=auth_manager)

token_info = auth_manager.get_cached_token()
if not token_info:
    url = auth_manager.get_authorize_url()
    print("Open this URL and authorize:\n", url)
    sp.current_user_playing_track()

print("Access token:", auth_manager.get_access_token(as_dict=False))
