"use client"

interface AILoadingModalProps {
  isOpen: boolean
}

export function AILoadingModal({ isOpen }: AILoadingModalProps) {
  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-sm mx-4 text-center" style={{ fontFamily }}>
        {/* AI Icon with Animation */}
        <div className="mb-6 flex justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <div className="text-2xl">✨</div>
          </div>
        </div>

        {/* Loading Text */}
        <h3
          className="font-medium"
          style={{
            color: "#111827",
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          Infusing AI magic into your job description...
        </h3>

        {/* Loading Animation */}
        <div className="mt-4 flex justify-center">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: "#6366F1",
                animationDelay: "0ms",
              }}
            />
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: "#6366F1",
                animationDelay: "150ms",
              }}
            />
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: "#6366F1",
                animationDelay: "300ms",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
