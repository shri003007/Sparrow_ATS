"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  className?: string
  iconPosition?: "left" | "right"
}

export function NavButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = "outline",
  size = "sm",
  className,
  iconPosition = "left"
}: NavButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    sm: "h-8 px-2",
    md: "h-10 px-3",
    lg: "h-12 px-4"
  }

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  }

  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden transition-all duration-300 ease-in-out",
        sizeClasses[size],
        isHovered ? "px-4" : "",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderColor: disabled ? "#F3F4F6" : "#E5E7EB",
        color: disabled ? "#9CA3AF" : "#374151",
        width: isHovered ? "auto" : sizeClasses[size].includes("h-8") ? "32px" : 
               sizeClasses[size].includes("h-10") ? "40px" : "48px",
        minWidth: isHovered ? "auto" : sizeClasses[size].includes("h-8") ? "32px" : 
                  sizeClasses[size].includes("h-10") ? "40px" : "48px"
      }}
    >
      <div className="flex items-center gap-2">
        {iconPosition === "left" && (
          <span className={cn("flex-shrink-0", iconSizes[size])}>
            {icon}
          </span>
        )}
        
        <span
          className={cn(
            "text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
            isHovered ? "opacity-100 max-w-none" : "opacity-0 max-w-0 overflow-hidden"
          )}
        >
          {label}
        </span>
        
        {iconPosition === "right" && (
          <span className={cn("flex-shrink-0", iconSizes[size])}>
            {icon}
          </span>
        )}
      </div>
    </Button>
  )
}
