import spotipy


class SpotifyService:
    def __init__(self, access_token: str):
        self.sp = spotipy.Spotify(auth=access_token)

    def add_to_queue(self, track_uri: str):
        return self.sp.add_to_queue(track_uri)

    def skip(self):
        return self.sp.next_track()

    def get_playback(self):
        return self.sp.current_playback()
