"use client"

import React, { useState } from 'react'
import { AudioPlayer } from '@/components/ui/audioPlayer'
import { ImageCarousel } from './image-carousel'
import { Play } from 'lucide-react'

interface AudioVisualSectionProps {
  audioUrl?: string
  images?: Array<{
    filename: string
    url: string
    size: number
    key: string
  }>
}

export function AudioVisualSection({ audioUrl, images }: AudioVisualSectionProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined)

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }

  const handleImageClick = (timestamp: number) => {
    setSeekTime(timestamp)
    // Reset seekTime after a brief moment to allow for future seeks
    setTimeout(() => setSeekTime(undefined), 100)
  }

  if (!audioUrl && (!images || images.length === 0)) {
    return null
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">Audio & Visual Recording</h3>
          </div>
        </div>
        
        <div className="p-6">
          {/* Image Carousel Section with integrated audio controls */}
          {images && images.length > 0 && (
            <ImageCarousel 
              images={images}
              currentAudioTime={currentTime}
              onImageClick={handleImageClick}
              audioUrl={audioUrl}
              onAudioTimeUpdate={handleTimeUpdate}
            />
          )}
          
          {/* Fallback Audio Player for audio-only content */}
          {audioUrl && (!images || images.length === 0) && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#5BA4A4', color: 'white' }}
                >
                  🎵
                </div>
                <span className="text-sm font-medium text-gray-700">Audio Recording</span>
              </div>
              <AudioPlayer 
                audioUrl={audioUrl}
                onError={(error) => console.error('Audio playback error:', error)}
                onTimeUpdate={handleTimeUpdate}
                seekToTime={seekTime}
                compact={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
