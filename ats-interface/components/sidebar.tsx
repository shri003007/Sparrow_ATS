import { Search, BarChart3, Users, Briefcase, CreditCard, Plus, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SidebarProps {
  currentRole?: string
}

export function Sidebar({ currentRole }: SidebarProps) {
  const navigationItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: Briefcase, label: "All roles", href: "/roles", hasSubmenu: true },
    { icon: Users, label: "All candidates", href: "/candidates" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: CreditCard, label: "Billing", href: "/billing" },
  ]

  const jobRoles = [
    { id: "1", title: "Staff Design Engg.", isActive: true },
    { id: "2", title: "Sr. Frontend Engg.", isActive: false },
    { id: "3", title: "Sr. Product Manager", isActive: false },
  ]

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <Button variant="ghost" className="w-full justify-between p-3 h-auto rounded-full bg-gray-50 hover:bg-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">*</span>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">SparrowATS</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search anything" className="pl-10 pr-12 bg-gray-50 border-gray-200 rounded-lg" />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">NAVIGATE</h3>
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.label}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-10 px-3 rounded-lg ${
                    item.label === "All roles" ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                  {item.hasSubmenu && <Plus className="w-4 h-4 text-gray-400 ml-auto" />}
                </Button>

                {/* Job roles submenu */}
                {item.label === "All roles" && (
                  <div className="ml-7 mt-1 space-y-1">
                    {jobRoles.map((role) => (
                      <Button
                        key={role.id}
                        variant="ghost"
                        className={`w-full justify-start h-8 px-3 rounded-lg text-sm ${
                          role.isActive ? "bg-gray-900 text-white hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full border border-gray-400 mr-2" />
                        {role.title}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-8 px-3 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
                    >
                      See all 6 jobs
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
