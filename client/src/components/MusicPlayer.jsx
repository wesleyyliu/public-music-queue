import { useState } from "react";
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  Users,
  Pause,
  History,
} from "lucide-react";
import { QueueItem } from "./QueueItem";

export default function MusicPlayer({ socket, user }) {
  const [liked, setLiked] = useState(false);

  return (
    <div className="flex items-center justify-center">
      {/* Main Glass Card */}
      <div className="glass-background w-[26rem] rounded-xl p-5 flex flex-col gap-5 shadow-2xl text-white">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
          {/* User Count */}
          <div className="flex items-center gap-2 glass-background rounded-md px-4 py-2 text-white font-medium">
            <Users size={18} />
            <span>659</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Pause Queue */}
            <button className="glass-background px-3 py-2 ">
              <Pause />
            </button>
            {/* Liked Songs */}
            <button className="glass-background px-3 py-2">
              <Heart onClick={() => setLiked(!liked)} />
            </button>
            {/* History */}
            <button className="glass-background px-3 py-2">
              <History />
            </button>
          </div>
        </div>

        {/* Album + Player */}
        <div className="glass-background py-4 px-6 rounded-lg flex flex-col items-center">
          <div className="relative">
            <img
              src="https://upload.wikimedia.org/wikipedia/en/d/db/Ariana_Grande_-_Dangerous_Woman_%28Official_Album_Cover%29.png"
              alt="Album Art"
              className="w-48 h-48 rounded-lg"
            />
            {/* Record Disc */}
            <div className="absolute -right-16 top-6 w-40 h-40 rounded-full bg-gray-700 border-8 border-gray-800" />
          </div>

          {/* Progress Bar */}
          {/* TODO Implement Functional and better looking progress bar maybe just use library component */}
          <div className="w-full mt-4">
            <div className="flex justify-between text-xs text-white">
              <span>1:05</span>
              <span>3:12</span>
            </div>
            <div className="w-full glass-background py-[4px] h-1 rounded-full mt-1">
              <div className="bg-pink-500 py-[3px] translate-y-[-3px] rounded-full w-full"></div>
            </div>
          </div>

          <p className="text-sm w-full text-left my-3">Now Playing:</p>

          {/* Song Info */}
          <div className="text-center flex justify-between items-center w-full">
            <div className="flex flex-col flex-start text-left">
              <h2 className="text-xl font-semibold">Sometimes</h2>
              <p className="text-sm">Ariana Grande</p>
            </div>

            <div className="flex flex-row justify-center items-center gap-6 font-medium">
              <div className="flex flex-col items-center gap-2">
                <ThumbsUp size={28} /> <span>250</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ThumbsDown size={28} /> <span>54</span>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Queue</h3>
          <div className="space-y-3">
            <QueueItem title="What Do I Do" artist="SZA" upNext />
            <QueueItem title="Everytime" artist="Ariana Grande" />
            <QueueItem title="Cocky AF" artist="Megan Thee Stallion" />
          </div>
        </div>

        {/* Suggestions Section */}
        {/* <div>
          <h3 className="text-lg font-semibold mb-2">Your Suggestions</h3>
          <div className="space-y-4">
            <QueueItem
              title="Track 10"
              artist="Charli XCX"
              sub="10th in Queue"
            />
            <QueueItem
              title="Redbone"
              artist="Childish Gambino"
              sub="21st in Queue"
            />
            <QueueItem title="Countdown" artist="Beyoncé" sub="22nd in Queue" />
          </div>
        </div> */}
      </div>
    </div>
  );
}
