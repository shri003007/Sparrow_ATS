import { useEffect, useRef, useState } from 'react';
import { PlayIcon, PauseIcon } from '../../utils/audio-icons';

interface AudioPlayerProps {
  audioUrl: string;
  onError?: (error: Error) => void;
  compact?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number;
  initialDuration?: number; 
}

const formatTime = (seconds: number): string => {
  // Handle invalid numbers
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({ audioUrl, onError, compact = false, onTimeUpdate, seekToTime, initialDuration }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // Always start with initialDuration if available, fallback to 0
  const [duration, setDuration] = useState(initialDuration && initialDuration > 0 ? initialDuration : 0);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadedUrl, setDownloadedUrl] = useState<string | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Store blob URL in ref to prevent premature garbage collection
  const blobUrlRef = useRef<string | null>(null);

  // Stable refs like the working implementation
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const audioStatesRef = useRef<Record<string, any>>({});

  // Use audioUrl as the key (like recordingId in working implementation)
  const audioKey = audioUrl;

  // Download audio for proper playback control - following the working implementation pattern
  useEffect(() => {
    let isMounted = true;

    const downloadAudio = async () => {
      if (!audioUrl) {
        setDownloadedUrl(null);
        setIsLoading(false);
        return;
      }

      // Check if we already have this audio downloaded (like cached approach)
      if (downloadedUrl && blobUrlRef.current) {
        console.log('✅ Audio already downloaded for:', audioUrl);
        setIsLoading(false);
        setIsAudioReady(true);
        return;
      }
      
      console.log('🔄 Fetching audio file using presigned URL...', { audioUrl });
      setIsLoading(true);
      setIsAudioReady(false);

      try {
        // Step 1: Direct HTTP GET to fetch the entire audio file as Blob
          const response = await fetch(audioUrl, {
            method: 'GET',
          // No special headers needed for presigned URLs
          });
          
          if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        
        // Get content type from response
        const contentType = response.headers.get('content-type') || 'audio/mpeg';
        console.log('📡 Response content-type:', contentType);
        
        // Step 2: Convert response to Blob (full download)
        const audioBlob = await response.blob();
        console.log('✅ Audio file fetched successfully:', {
          size: audioBlob.size,
          type: audioBlob.type,
          contentType
        });
        
        // Validate blob
        if (audioBlob.size === 0) {
          throw new Error('Received empty audio file');
        }
        
        // Step 3: Create blob with explicit MIME type for better browser compatibility
        const typedBlob = new Blob([audioBlob], { type: contentType });
        const blobUrl = URL.createObjectURL(typedBlob);
        
        // Store in ref to prevent garbage collection
        blobUrlRef.current = blobUrl;
        
        if (isMounted) {
          setDownloadedUrl(blobUrl);
          console.log('✅ Blob URL created for seekable playback:', blobUrl);
        }
      } catch (error) {
        console.error('Failed to download audio:', error);
        if (isMounted) {
        setIsLoading(false);
          onError?.(error instanceof Error ? error : new Error('Failed to download audio'));
        }
      }
    };

    downloadAudio();

    return () => {
      isMounted = false;
      // DON'T revoke here - let component unmount handle it
    };
  }, [audioUrl, onError, initialDuration]);

  // Cleanup blob URL and stable refs only on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up audio for:', audioKey);

      // Clean up blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      // Clean up audio element from stable refs
      if (audioRefs.current[audioKey]) {
        const audio = audioRefs.current[audioKey];
        audio.pause();
        audio.src = '';
        delete audioRefs.current[audioKey];
      }

      // Reset refs
      audioRef.current = null;
      setDownloadedUrl(null);
      setIsAudioReady(false);
    };
  }, [audioKey]);

  // Initialize audio element with comprehensive event listeners - STABLE REFS APPROACH
  useEffect(() => {
    // Check if we already have an audio element for this key
    if (audioRefs.current[audioKey]) {
      console.log('✅ Audio element already exists for:', audioKey);
      const existingAudio = audioRefs.current[audioKey];
      audioRef.current = existingAudio;
      
      // Verify the existing audio has the correct source
      if (downloadedUrl && existingAudio.src !== downloadedUrl) {
        console.log('🔄 Updating existing audio source');
        existingAudio.src = downloadedUrl;
        existingAudio.load();
      }
      
      setIsAudioReady(true);
      setIsLoading(false);
      return;
    }

    if (!downloadedUrl) return;

    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout | null = null;

    const markAsReady = () => {
      if (isMounted && !isAudioReady) {
        console.log('✅ Audio is ready to play');
        setIsAudioReady(true);
        setIsLoading(false);
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      }
    };

    // Create audio element (only once per audioKey)
    console.log('🎵 Creating new audio element for:', audioKey);
    const audio = new Audio();
    audioRef.current = audio;
    audioRefs.current[audioKey] = audio; // Store in stable ref

    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration;
      console.log('📊 Audio metadata loaded:', {
        html5Duration: audioDuration,
        initialDuration,
        usingInitialDuration: !isFinite(audioDuration) || audioDuration === 0
      });

      // Always prefer initialDuration for WebM files or when HTML5 duration is invalid
      if (isMounted) {
        if (initialDuration && initialDuration > 0) {
          // Use API duration - this is the key fix
          console.log('✅ Using API duration:', initialDuration, '(HTML5 duration was:', audioDuration, ')');
          setDuration(initialDuration);
        } else if (isFinite(audioDuration) && audioDuration > 0) {
          // Fallback to HTML5 duration only if API duration not available
          console.log('📊 Using HTML5 duration:', audioDuration);
          setDuration(audioDuration);
        } else {
          // No valid duration available
          console.warn('⚠️ No valid duration available');
          setDuration(0);
        }

        markAsReady();
      }
    };

    const handleLoadedData = () => {
      // loadeddata fires when the first frame is loaded
      console.log('📊 Audio data loaded');
      markAsReady();
    };

    const handleCanPlay = () => {
      // Audio is ready to play
      const audioDuration = audio.duration;
      console.log('✅ Audio can play, HTML5 duration:', audioDuration, '(API duration already set)');
      console.log('🔍 Audio element details:', {
        src: audio.src?.substring(0, 50),
        readyState: audio.readyState,
        networkState: audio.networkState,
        paused: audio.paused,
        ended: audio.ended,
        volume: audio.volume,
        muted: audio.muted
      });

      // Don't update duration here - we've already set it in loadedmetadata
      // The HTML5 duration is unreliable for WebM files
      markAsReady();
    };

    const handleTimeUpdate = () => {
      const time = audio.currentTime || 0;

      if (isMounted) {
        // Don't try to update duration from HTML5 audio element
        // We already set it to initialDuration in loadedmetadata
        // HTML5 duration is unreliable for WebM files
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    };

    const handleEnded = () => {
      console.log('🎵 Audio playback ended');
      if (isMounted) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const handlePlay = () => {
      console.log('▶️ Audio started playing');
      if (isMounted) {
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      console.log('⏸️ Audio paused');
      if (isMounted) {
        setIsPlaying(false);
      }
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;
      
      // Use console.log for detailed diagnostics (console.error gets intercepted by Next.js)
      console.log('❌ Audio playback error occurred');
      console.log('📊 Error diagnostics:', {
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        audioSrc: target.src?.substring(0, 100),
        networkState: target.networkState,
        readyState: target.readyState,
        currentTime: target.currentTime,
        duration: target.duration,
        paused: target.paused,
        ended: target.ended
      });
      
      // Decode networkState
      const networkStates = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
      const readyStates = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
      
      console.log('📡 Network state:', networkStates[target.networkState] || target.networkState);
      console.log('📺 Ready state:', readyStates[target.readyState] || target.readyState);
      
      if (error) {
        const errorTypes = ['', 'MEDIA_ERR_ABORTED', 'MEDIA_ERR_NETWORK', 'MEDIA_ERR_DECODE', 'MEDIA_ERR_SRC_NOT_SUPPORTED'];
        console.log('🚨 Media error type:', errorTypes[error.code] || error.code);
      }
      
      if (isMounted) {
        setIsLoading(false);
        setIsAudioReady(false);
        
        // Don't call onError immediately - this might be a transient error
        // The timeout will handle it if audio doesn't load
        console.warn('⚠️ Audio error occurred, waiting for timeout to decide next action');
      }
    };

    const handleLoadStart = () => {
      console.log('🔄 Audio loading started');
    };

    // Add event listeners BEFORE setting src
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    // IMPORTANT: Set preload attribute before setting src
    audio.preload = 'metadata';
    
    // Ensure volume is set and not muted
    audio.volume = 1.0;
    audio.muted = false;
    
    // Set source and load
    console.log('🎵 Setting audio source:', downloadedUrl.substring(0, 50) + '...');
    console.log('🔊 Volume:', audio.volume, 'Muted:', audio.muted);

    // Clear any existing src first
    audio.src = '';
    audio.load();

    // Set new source
    audio.src = downloadedUrl;
    audio.load();

    console.log('🎵 Audio element after setting src:', {
      src: audio.src?.substring(0, 50),
      readyState: audio.readyState,
      networkState: audio.networkState
    });

    // Fallback timeout: If audio doesn't load within 5 seconds, use initialDuration
    loadingTimeout = setTimeout(() => {
      if (isMounted && !isAudioReady) {
        console.warn('⚠️ Audio loading timeout - using initialDuration if available');

        if (initialDuration && initialDuration > 0) {
          console.log('✅ Using initialDuration for timeout fallback:', initialDuration);
          setDuration(initialDuration);
          setIsAudioReady(true);
          setIsLoading(false);
        } else {
          console.error('❌ Audio failed to load - no initialDuration available');
          setIsLoading(false);
          setIsAudioReady(false);
        }
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      // Clean up event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.pause();
      audio.src = '';
    };
  }, [downloadedUrl, audioKey, onTimeUpdate, onError, isAudioReady, initialDuration]);

  // Handle external seek requests
  useEffect(() => {
    const audio = audioRefs.current[audioKey] || audioRef.current;
    if (seekToTime !== undefined && audio && downloadedUrl && isAudioReady) {
      console.log('🎯 Seeking to:', seekToTime);
      audio.currentTime = seekToTime;
      setCurrentTime(seekToTime);
    }
  }, [seekToTime, downloadedUrl, isAudioReady, audioKey]);

  // Sync isPlaying state with actual audio element state
  // This ensures all AudioPlayer instances show the correct play/pause button
  useEffect(() => {
    const audio = audioRefs.current[audioKey] || audioRef.current;
    if (!audio) return;

    const syncInterval = setInterval(() => {
      const actuallyPlaying = !audio.paused;
      if (actuallyPlaying !== isPlaying) {
        console.log('🔄 Syncing play state:', { actuallyPlaying, wasShowing: isPlaying });
        setIsPlaying(actuallyPlaying);
      }
      
      // Also update current time to keep seeker moving
      const time = audio.currentTime || 0;
      if (actuallyPlaying && time !== currentTime) {
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    }, 100); // Check every 100ms

    return () => clearInterval(syncInterval);
  }, [audioKey, isPlaying, currentTime, onTimeUpdate]);

  const handlePlayPause = async () => {
    const audio = audioRefs.current[audioKey] || audioRef.current;

    console.log('🎮 Play/Pause button clicked', {
      hasAudio: !!audio,
      hasDownloadedUrl: !!downloadedUrl,
      isAudioReady,
      audioPaused: audio?.paused,
      currentIsPlaying: isPlaying
    });

    if (!audio || !downloadedUrl || !isAudioReady) {
      console.warn('⚠️ Cannot play - audio not ready');
      return;
    }

    // Check actual audio state instead of React state
    if (!audio.paused) {
      console.log('⏸️ Pausing audio');
      audio.pause();
      setIsPlaying(false);
      } else {
      console.log('▶️ Playing audio');
      try {
        audio.volume = 1.0;
        audio.muted = false;
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('❌ Error playing audio:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to play audio'));
        setIsPlaying(false);
      }
    }
  };

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRefs.current[audioKey] || audioRef.current;
    if (progressBarRef.current && audio && isAudioReady && duration > 0) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      console.log('🎯 Seeking via progress bar to:', newTime);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Debug info (remove in production)
  const debugInfo = {
    isLoading,
    isAudioReady,
    isPlaying,
    duration,
    currentTime,
    hasDownloadedUrl: !!downloadedUrl,
    hasAudioRef: !!audioRef.current,
    audioKey,
    hasStableRef: !!audioRefs.current[audioKey],
    stableRefsCount: Object.keys(audioRefs.current).length
  };

  return (
    <div className="w-full bg-transparent rounded-md p-1 transition-all duration-200 hover:bg-gray-50">

      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !isAudioReady}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all duration-200 flex-shrink-0 mr-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#5BA4A4' }}
          title={isLoading ? 'Loading audio...' : !isAudioReady ? 'Audio not ready' : isPlaying ? 'Pause' : 'Play'}
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
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative transition-all duration-200 hover:h-2.5 group"
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

        <audio
          ref={audioRef}
        />
    </div>
  );
}; 