import asyncio
import aiohttp
import os
from base64 import b64encode
from dotenv import load_dotenv
load_dotenv()


async def get_access_token():
    client_id = os.environ["SPOTIFY_CLIENT_ID"]
    client_secret = os.environ["SPOTIFY_CLIENT_SECRET"]
    auth_str = f"{client_id}:{client_secret}"
    b64_auth = b64encode(auth_str.encode()).decode()
    headers = {"Authorization": f"Basic {b64_auth}"}
    data = {"grant_type": "client_credentials"}
    async with aiohttp.ClientSession() as session:
        async with session.post("https://accounts.spotify.com/api/token", headers=headers, data=data) as resp:
            return (await resp.json())["access_token"]


async def spam_requests(token):
    headers = {"Authorization": f"Bearer {token}"}
    url = "https://api.spotify.com/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp"
    async with aiohttp.ClientSession() as session:
        count = 0
        start = asyncio.get_event_loop().time()
        while True:
            tasks = [session.get(url, headers=headers)
                     for _ in range(10)]  # 10 at a time
            responses = await asyncio.gather(*tasks)
            for r in responses:
                if r.status == 429:
                    retry_after = int(r.headers.get("Retry-After", 0))
                    elapsed = asyncio.get_event_loop().time() - start
                    print(
                        f"Hit rate limit after {count} requests in {elapsed:.2f}s, retry_after={retry_after}")
                    return
                count += 1


async def main():
    token = await get_access_token()
    await spam_requests(token)

asyncio.run(main())

'''
Hit rate limit after 200 requests in 4.66s, retry_after=1
Hit rate limit after 201 requests in 4.36s, retry_after=3
Hit rate limit after 186 requests in 3.36s, retry_after=3
Hit rate limit after 60 requests in 1.92s, retry_after=85055
'''
