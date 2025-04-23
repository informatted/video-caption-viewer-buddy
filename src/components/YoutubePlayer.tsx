
import { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';

interface YoutubePlayerProps {
  videoId: string;
  onReady: (player: any) => void;
  onPlay: () => void;
  onPause: () => void;
  onStateChange: (state: number) => void;
}

export function YoutubePlayer({ videoId, onReady, onPlay, onPause, onStateChange }: YoutubePlayerProps) {
  const opts = {
    height: '480',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      cc_load_policy: 1, // Force closed captions to be available
      cc_lang_pref: 'en', // Prefer English captions
    },
  };

  const handleStateChange = (event: any) => {
    const state = event.target.getPlayerState();
    onStateChange(state);
    
    // State 1 is playing
    if (state === 1) {
      onPlay();
    }
    // State 2 is paused
    else if (state === 2) {
      onPause();
    }
  };

  const handleError = (event: any) => {
    console.error("YouTube Player Error:", event.data);
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden shadow-lg">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={(e) => {
          console.log("YouTube player ready");
          onReady(e.target);
        }}
        onStateChange={handleStateChange}
        onError={handleError}
        className="w-full"
      />
    </div>
  );
}
