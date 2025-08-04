import { Star, ThumbsUp, RefreshCw } from "lucide-react"

interface RecommendationBadgeProps {
  type: "highly" | "good" | "needs"
  label: string
  score: number
  maxScore: number
}

export function RecommendationBadge({ type, label, score, maxScore }: RecommendationBadgeProps) {
  const config = {
    highly: {
      icon: Star,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    good: {
      icon: ThumbsUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    needs: {
      icon: RefreshCw,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  }

  const { icon: Icon, color, bgColor } = config[type]

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded ${bgColor}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <span className={`font-medium text-sm ${color}`}>{label}</span>
        <span className="text-gray-500 text-sm ml-1">
          ({score}/{maxScore})
        </span>
      </div>
    </div>
  )
}
