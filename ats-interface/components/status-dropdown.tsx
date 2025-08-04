import { Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StatusDropdownProps {
  status: string
}

export function StatusDropdown({ status }: StatusDropdownProps) {
  return (
    <Button variant="outline" className="h-8 px-3 rounded-full bg-white border-gray-200 hover:bg-gray-50">
      <Clock className="w-3 h-3 text-gray-400 mr-2" />
      <span className="text-sm text-gray-600">{status}</span>
      <ChevronDown className="w-3 h-3 text-gray-400 ml-2" />
    </Button>
  )
}
