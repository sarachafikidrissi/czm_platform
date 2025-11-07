import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

const toastVariants = cva(
  "relative w-full rounded-lg border shadow-lg transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-[#0b2724] border-[#b1bbbf] text-white",
        success: "bg-[#0b2724] border-[#b1bbbf] text-white border-t-4 border-t-[#3ab770]",
        warning: "bg-[#0b2724] border-[#b1bbbf] text-white border-t-4 border-t-[#b1bbbf]",
        error: "bg-[#0b2724] border-[#b1bbbf] text-white border-t-4 border-t-[#e0495a]",
        info: "bg-[#0b2724] border-[#b1bbbf] text-white border-t-4 border-t-[#3ab770]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps extends VariantProps<typeof toastVariants> {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
  duration?: number
  className?: string
  icon?: React.ReactNode
}

export function Toast({
  title,
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 15000,
  variant = "default",
  className,
  icon,
}: ToastProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [timeRemaining, setTimeRemaining] = React.useState(duration)
  const [isPaused, setIsPaused] = React.useState(false)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (!isOpen || isPaused) return

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 100) {
          setIsOpen(false)
          onClose?.()
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isOpen, isPaused, onClose])

  const handleMouseEnter = () => {
    setIsPaused(true)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  const handleClick = () => {
    setIsPaused(true)
    // Resume after 3 seconds if user clicks
    setTimeout(() => {
      setIsPaused(false)
    }, 3000)
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const progressPercentage = (timeRemaining / duration) * 100

  if (!isOpen) return null

  const getDefaultIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-[#3ab770]" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-[#e0495a]" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-[#b1bbbf]" />
      case "info":
        return <Info className="h-5 w-5 text-[#3ab770]" />
      default:
        return <Info className="h-5 w-5 text-[#b1bbbf]" />
    }
  }

  const getProgressBarColor = () => {
    switch (variant) {
      case "success":
        return "bg-[#3ab770]"
      case "error":
        return "bg-[#e0495a]"
      case "warning":
        return "bg-[#b1bbbf]"
      case "info":
        return "bg-[#3ab770]"
      default:
        return "bg-[#b1bbbf]"
    }
  }

  return (
    <div
      className={cn(toastVariants({ variant }), className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {icon || getDefaultIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white text-base">{title}</h3>
                <div className="flex items-center gap-2">
                  {message && (
                    <CollapsibleTrigger asChild>
                      <button
                        className="text-white hover:text-[#b1bbbf] transition-colors"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  )}
                  <button
                    onClick={handleClose}
                    className="text-white hover:text-[#b1bbbf] transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {message && (
                <CollapsibleContent className="mt-3">
                  <p className="text-sm text-white whitespace-pre-line">{message}</p>
                  {actionLabel && onAction && (
                    <div className="mt-3">
                      <Button
                        onClick={onAction}
                        size="sm"
                        variant="outline"
                        className="bg-[#0b2724] text-white border-[#b1bbbf] hover:bg-[#1a3d3a]"
                      >
                        {actionLabel}
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              )}
            </Collapsible>
            {!message && actionLabel && onAction && (
              <div className="mt-3">
                <Button
                  onClick={onAction}
                  size="sm"
                  variant="outline"
                  className="bg-[#0b2724] text-white border-[#b1bbbf] hover:bg-[#1a3d3a]"
                >
                  {actionLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="text-xs text-[#b1bbbf] mb-2">
          {isPaused ? (
            <span>En pause. Cliquez pour reprendre.</span>
          ) : (
            <span>
              Ce message se fermera dans {Math.ceil(timeRemaining / 1000)} secondes. Cliquez pour arrêter.
            </span>
          )}
        </div>
        <div className="h-1 bg-[#1a3d3a] rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-100", getProgressBarColor())}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

