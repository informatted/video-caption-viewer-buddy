
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { CaptionViewer } from "@/components/CaptionViewer";
import { extractYouTubeVideoId, fetchYouTubeCaptions, Caption } from "@/services/youtubeService";
import { Captions, Play, Pause, SkipBack, SkipForward } from "lucide-react";

const Index = () => {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);
  const timeUpdateInterval = useRef<number | null>(null);
  
  // Handle URL submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYouTubeVideoId(url);
    
    if (!id) {
      setError('Invalid YouTube URL. Please enter a valid YouTube video URL.');
      return;
    }
    
    setVideoId(id);
    setError(null);
    setLoading(true);
    setCaptions([]);
    
    try {
      const fetchedCaptions = await fetchYouTubeCaptions(id);
      setCaptions(fetchedCaptions);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load captions. The video might not have captions available.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update current time when video is playing
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
      
      timeUpdateInterval.current = window.setInterval(() => {
        if (playerRef.current) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 500) as unknown as number;
    } else if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
    }
    
    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [isPlaying]);
  
  // Player control functions
  const handlePlayerReady = (player: any) => {
    playerRef.current = player;
  };
  
  const handlePlay = () => {
    setIsPlaying(true);
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleStateChange = (state: number) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    setIsPlaying(state === 1);
  };
  
  const skipForward10s = () => {
    if (playerRef.current) {
      const newTime = playerRef.current.getCurrentTime() + 10;
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
    }
  };
  
  const skipBackward10s = () => {
    if (playerRef.current) {
      const newTime = Math.max(0, playerRef.current.getCurrentTime() - 10);
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
    }
  };
  
  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 text-center flex items-center justify-center">
        <Captions className="mr-2 h-8 w-8" /> 
        YouTube Caption Viewer
      </h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            type="text"
            placeholder="Enter YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Processing..." : "Load Video & Captions"}
          </Button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
      
      {videoId && (
        <div className="space-y-6">
          <YoutubePlayer
            videoId={videoId}
            onReady={handlePlayerReady}
            onPlay={handlePlay}
            onPause={handlePause}
            onStateChange={handleStateChange}
          />
          
          <div className="flex justify-center space-x-4 my-4">
            <Button
              variant="outline"
              size="icon"
              onClick={skipBackward10s}
              title="Skip back 10 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayPause}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={skipForward10s}
              title="Skip forward 10 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          
          {loading ? (
            <div className="p-4 bg-gray-100 rounded-lg text-center">
              <p className="text-gray-600">Loading captions...</p>
            </div>
          ) : (
            <CaptionViewer captions={captions} currentTime={currentTime} />
          )}
        </div>
      )}
      
      {!videoId && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Captions className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-medium text-gray-600 mb-2">Enter a YouTube URL to get started</h2>
          <p className="text-gray-500">The captions will appear under the video with synchronized highlighting</p>
        </div>
      )}
    </div>
  );
};

export default Index;
