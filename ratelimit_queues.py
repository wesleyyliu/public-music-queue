#!/usr/bin/env python3
"""
Spotify queue rate-limit tester (async).

Usage:
    - Set SPOTIFY_USER_TOKEN env var to a valid user access token (with user-modify-playback-state scope).
    - Adjust TEST_TRACK_URI, MODE, TOTAL_REQUESTS, CONCURRENCY below, or pass via environment
    - Run: python spotify_queue_ratelimit_test_async.py
"""

import os
import asyncio
import aiohttp
import csv
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SPOTIFY_API_BASE = "https://api.spotify.com/v1"
USER_TOKEN = os.getenv("SPOTIFY_USER_TOKEN")
if not USER_TOKEN:
    raise SystemExit(
        "Set SPOTIFY_USER_TOKEN in environment (Authorization Code user token).")

# --- Config (tweak these) ---
# Blinding Lights by default
TEST_TRACK_URI = os.getenv(
    "TEST_TRACK_URI", "spotify:track:0VjIjW4GlUZAMYd2vXMi3b")
# "add" to test add_to_queue, "skip" to test skip (remove current)
MODE = os.getenv("MODE", "add")
TOTAL_REQUESTS = int(os.getenv("TOTAL_REQUESTS", "300"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "10"))
OUTPUT_CSV = os.getenv("OUTPUT_CSV", "ratelimit_results.csv")
# ---------------------------

HEADERS = {
    "Authorization": f"Bearer {USER_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# endpoints


def add_queue_url():
    return f"{SPOTIFY_API_BASE}/me/player/queue"


def skip_url():
    return f"{SPOTIFY_API_BASE}/me/player/next"


# global counters & storage
results = []
results_lock = asyncio.Lock()
counter = 0
counter_lock = asyncio.Lock()


async def record_event(event):
    async with results_lock:
        results.append(event)


async def increment_counter():
    global counter
    async with counter_lock:
        counter += 1
        return counter


async def worker(session: aiohttp.ClientSession, worker_id: int):
    global counter
    while True:
        cur = await increment_counter()
        if cur > TOTAL_REQUESTS:
            return

        timestamp = time.time()
        human_ts = datetime.utcfromtimestamp(timestamp).isoformat() + "Z"

        try:
            if MODE == "add":
                # add track to queue (no body; use params)
                params = {"uri": TEST_TRACK_URI}
                async with session.post(add_queue_url(), headers=HEADERS, params=params) as resp:
                    status = resp.status
                    headers = resp.headers
                    text = await safe_text(resp)
            elif MODE == "skip":
                async with session.post(skip_url(), headers=HEADERS) as resp:
                    status = resp.status
                    headers = resp.headers
                    text = await safe_text(resp)
            else:
                raise RuntimeError(f"Unknown MODE: {MODE}")

            retry_after = headers.get("Retry-After")
            x_limit = headers.get("X-RateLimit-Limit")
            x_remaining = headers.get("X-RateLimit-Remaining")
            x_reset = headers.get("X-RateLimit-Reset")  # sometimes present

            await record_event({
                "seq": cur,
                "worker": worker_id,
                "mode": MODE,
                "timestamp": human_ts,
                "ts_unix": timestamp,
                "status": status,
                "retry_after": retry_after,
                "x_rate_limit": x_limit,
                "x_rate_remaining": x_remaining,
                "x_rate_reset": x_reset,
                "resp_text_snippet": (text[:200] if text else "")
            })

            # If rate-limited, respect Retry-After
            if status == 429:
                wait = int(
                    retry_after) if retry_after and retry_after.isdigit() else 5
                print(
                    f"[{human_ts}] Worker {worker_id}: 429 received. Sleeping {wait+1}s (seq {cur})")
                await asyncio.sleep(wait + 1)
            else:
                # small micro pause so we don't totally saturate local CPU/network loop
                # yield control; increase to 0.01 or 0.05 to slow down
                await asyncio.sleep(0)
        except Exception as e:
            # record exception
            await record_event({
                "seq": cur,
                "worker": worker_id,
                "mode": MODE,
                "timestamp": human_ts,
                "ts_unix": timestamp,
                "status": "EXC",
                "retry_after": None,
                "x_rate_limit": None,
                "x_rate_remaining": None,
                "x_rate_reset": None,
                "resp_text_snippet": repr(e)[:200]
            })
            print(f"Worker {worker_id} exception: {e}")
            await asyncio.sleep(1)


async def safe_text(resp):
    try:
        return await resp.text()
    except Exception:
        return ""


async def run_test():
    print(
        f"Starting rate-limit test (mode={MODE}) -> TOTAL_REQUESTS={TOTAL_REQUESTS}, CONCURRENCY={CONCURRENCY}")
    timeout = aiohttp.ClientTimeout(total=60)
    connector = aiohttp.TCPConnector(limit=CONCURRENCY*2)
    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        workers = [asyncio.create_task(worker(session, i))
                   for i in range(CONCURRENCY)]
        await asyncio.gather(*workers)

    # write CSV
    keys = ["seq", "worker", "mode", "timestamp", "ts_unix", "status", "retry_after",
            "x_rate_limit", "x_rate_remaining", "x_rate_reset", "resp_text_snippet"]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    # summary
    total = len(results)
    statuses = {}
    retry_counts = 0
    retry_values = []
    for r in results:
        s = str(r["status"])
        statuses[s] = statuses.get(s, 0) + 1
        if s == "429" and r["retry_after"]:
            retry_counts += 1
            try:
                retry_values.append(int(r["retry_after"]))
            except:
                pass

    print("\n--- Test summary ---")
    print(f"Events recorded: {total}")
    print("Status counts:")
    for k, v in sorted(statuses.items(), key=lambda x: x[0]):
        print(f"  {k}: {v}")
    if retry_values:
        avg_retry = sum(retry_values)/len(retry_values)
        print(
            f"Retry-After observed {retry_counts} times. Avg Retry-After: {avg_retry:.2f}s (values: {sorted(set(retry_values))})")
    print(f"Results saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    asyncio.run(run_test())
