import { Star, ThumbsUp, RefreshCw } from "lucide-react"

interface RecommendationScoreProps {
  type: "highly" | "good" | "needs"
  label: string
  score: number
  maxScore: number
}

export function RecommendationScore({ type, label, score, maxScore }: RecommendationScoreProps) {
  const config = {
    highly: {
      icon: Star,
      iconColor: "#10B981",
      textColor: "#10B981",
      bgColor: "#ECFDF5",
    },
    good: {
      icon: ThumbsUp,
      iconColor: "#8B5CF6",
      textColor: "#8B5CF6",
      bgColor: "#F3E8FF",
    },
    needs: {
      icon: RefreshCw,
      iconColor: "#F59E0B",
      textColor: "#F59E0B",
      bgColor: "#FFFBEB",
    },
  }

  const { icon: Icon, iconColor, textColor, bgColor } = config[type]
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <div className="flex items-center gap-2">
      <div className="p-1 rounded" style={{ backgroundColor: bgColor }}>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="flex items-center gap-1">
        <span
          className="font-medium"
          style={{
            color: textColor,
            fontSize: "14px",
            fontWeight: 500,
            fontFamily,
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: "#6B7280",
            fontSize: "14px",
            fontWeight: 400,
            fontFamily,
          }}
        >
          ({score}/{maxScore})
        </span>
      </div>
    </div>
  )
}
