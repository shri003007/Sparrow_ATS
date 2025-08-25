import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from '../../utils/audio-icons';

interface AudioPlayerProps {
  audioUrl: string;
  onError?: (error: Error) => void;
  compact?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({ audioUrl, onError, compact = false, onTimeUpdate, seekToTime }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadedUrl, setDownloadedUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Download audio for proper playback control
  useEffect(() => {
    const downloadAudio = async () => {
      if (!audioUrl) {
        setDownloadedUrl(null);
        return;
      }
      
      setIsLoading(true);
      try {
        // Try direct URL first (for CORS-enabled resources)
        try {
          const response = await fetch(audioUrl, {
            method: 'GET',
            mode: 'cors'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setDownloadedUrl(url);
        } catch (corsError) {
          console.warn('CORS fetch failed, using direct URL:', corsError);
          // Fallback to direct URL without blob conversion
          setDownloadedUrl(audioUrl);
        }
      } catch (error) {
        console.error('Failed to download audio:', error);
        // Fallback to direct URL
        setDownloadedUrl(audioUrl);
      } finally {
        setIsLoading(false);
      }
    };

    downloadAudio();

    return () => {
      if (downloadedUrl && downloadedUrl !== audioUrl) {
        URL.revokeObjectURL(downloadedUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current && downloadedUrl) {
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener('timeupdate', () => {
        const time = audioRef.current?.currentTime || 0;
        setCurrentTime(time);
        onTimeUpdate?.(time);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [downloadedUrl]);

  // Handle external seek requests
  useEffect(() => {
    if (seekToTime !== undefined && audioRef.current && downloadedUrl) {
      audioRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
    }
  }, [seekToTime, downloadedUrl]);

  const handlePlayPause = () => {
    if (audioRef.current && downloadedUrl && !isLoading) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && audioRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="w-full bg-transparent rounded-md p-1 transition-all duration-200 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !downloadedUrl}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 mr-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#5BA4A4' }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            isPlaying ? <PauseIcon /> : <PlayIcon />
          )}
        </button>
        
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="w-36 h-1 bg-gray-200 rounded-full cursor-pointer relative transition-all duration-200 hover:h-1.5 group"
        >
          <div
            className="progress-bar absolute left-0 top-1/2 transform -translate-y-1/2 h-full rounded-full transition-all duration-200 group-hover:bg-teal-600"
            style={{
              width: `${(currentTime / duration) * 100}%`,
              backgroundColor: '#5BA4A4'
            }}
          />
        </div>
        
        <span className="text-xs text-gray-600 min-w-16 text-right ml-2">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {downloadedUrl && (
        <audio
          ref={audioRef}
          src={downloadedUrl}
          onError={(e) => {
            console.error('Error loading audio:', e);
            onError?.(new Error('Failed to load audio'));
          }}
        />
      )}
    </div>
  );
}; 