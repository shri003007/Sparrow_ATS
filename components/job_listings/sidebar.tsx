"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  BarChart3,
  Users,
  Briefcase,
  CreditCard,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  EllipsisVertical,
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JobOpeningsApi } from "@/lib/api/job-openings";
import type { JobOpeningListItem } from "@/lib/job-types";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SurveySparrowIcon } from "@/utils/icons";
import RocketIcon from "@/components/ui/rocket-icon";

interface AppSidebarProps {
  onCreateJob?: () => void;
  onJobSelect?: (job: JobOpeningListItem) => void;
  selectedJobId?: string | null;
  mode?: "listing" | "creation"; // New prop to handle different modes
  onJobsLoaded?: () => void;
  onCreateAllViews?: () => void; // Simplified - just trigger creation page
  appMode?: string; // Track the current app mode to prevent auto-selection

}

export function AppSidebar({
  onCreateJob,
  onJobSelect,
  selectedJobId,
  mode = "listing",
  onJobsLoaded,
  onCreateAllViews,
  appMode,
}: AppSidebarProps) {
  const { user, apiUser, logout } = useAuth();
  const [jobs, setJobs] = useState<JobOpeningListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false); // Start collapsed
  const [showText, setShowText] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // All Views state - simplified since we're using creation page approach

  const fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const triggerSidebarOpen = () => {
    if (isOpen) {
      // Show text immediately when opening
      setShowText(true);
    } else {
      // Hide text immediately when closing
      setShowText(false);
    }
  };

  useEffect(() => {
    triggerSidebarOpen();
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, []);

  // Auto-expand on mouse enter
  const handleMouseEnter = () => {
    // Clear any pending collapse timeout
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  // Auto-collapse on mouse leave with delay
  const handleMouseLeave = () => {
    // Don't collapse if dropdown is open
    if (isDropdownOpen) {
      return;
    }

    // Set a timeout to collapse after a delay
    collapseTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      collapseTimeoutRef.current = null;
    }, 300); // 300ms delay before collapsing
  };

  // Auto-focus search when expanding via search icon
  const handleSearchIconClick = () => {
    // Clear any pending collapse timeout
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsOpen(true);
    // Focus the search input after the sidebar opens
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      // Don't fetch if we don't have the API user yet
      if (!apiUser?.id) {
        return;
      }

      try {
        const response = await JobOpeningsApi.getJobOpenings(apiUser.id);
        // Sort by published_at desc (most recent first), then by updated_at desc
        const sortedJobs = response.job_openings.sort((a, b) => {
          const aDate = a.published_at || a.updated_at;
          const bDate = b.published_at || b.updated_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        setJobs(sortedJobs);

        // Auto-select the first job if none is selected and we're in listing mode
        // Don't auto-select during all views creation or when in all views mode
        if (sortedJobs.length > 0 && !selectedJobId && mode === "listing" && onJobSelect && 
            appMode !== 'all-views-creation' && appMode !== 'all-views') {
          onJobSelect(sortedJobs[0]);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
        onJobsLoaded?.();
      }
    };

    fetchJobs();
  }, [apiUser?.id, selectedJobId, onJobSelect, mode]);

  // Keyboard shortcut handler for Command+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const navigationItems = [
    {
      icon: RocketIcon,
      label: "All roles",
      href: "/roles",
      isActive: true,
      hasSubmenu: true,
    },
    {
      icon: Eye,
      label: "All views",
      href: "/all-views",
      isActive: false,
      hasSubmenu: true,
    },
    // { icon: BarChart3, label: "Dashboard", href: "/dashboard", isActive: false },

    // { icon: Users, label: "All candidates", href: "/candidates", isActive: false },
    // { icon: BarChart3, label: "Analytics", href: "/analytics", isActive: false },
    // { icon: CreditCard, label: "Billing", href: "/billing", isActive: false },
  ];

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(
    (job) =>
      job.posting_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.custom_job_description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      job.employment_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.minimum_experience?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset showAllJobs when search query changes
  useEffect(() => {
    if (searchQuery) {
      setShowAllJobs(false);
    }
  }, [searchQuery]);

  // Show first 3 jobs by default, or all when expanded
  const displayedJobs = showAllJobs ? filteredJobs : filteredJobs.slice(0, 3);
  const hasMoreJobs = filteredJobs.length > 3;

  // All Views handlers - simplified
  const handleAllViewsClick = () => {
    onCreateAllViews?.();
  };

  return (
    <TooltipProvider>
      <div
        className={`${
          isOpen ? "w-80" : "w-18"
        } bg-white border-r flex flex-col h-screen relative transition-all duration-300 ease-in-out group`}
        style={{
          borderColor: "#E2E8F0",
          backgroundColor: "#f8f8f8",
          fontFamily,
          minWidth: isOpen ? "320px" : "72px",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Brand Header */}
        <div className={`p-4 ${!isOpen ? "flex justify-center" : ""}`}>
          <div
            className={`flex items-center ${
              isOpen ? "gap-2" : "justify-center"
            }`}
          >
            <SurveySparrowIcon style={{ width: "30px", height: "30px" }} />
            {showText && (
              <span
                className={`font-bold transition-all duration-300 ${
                  isOpen ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#2D3748",
                  fontFamily,
                  overflow: "hidden",
                  marginLeft: isOpen ? "8px" : 0,
                }}
              >
                SparrowATS
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col justify-between h-full">
          <div className="flex-1">
            {/* Global Search - Show input when expanded, icon when collapsed */}
            {showText ? (
              <div className="px-4 py-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: "#9CA3AF" }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderColor: "#E5E7EB",
                      color: "#111827",
                      fontSize: "14px",
                      fontFamily,
                    }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: "#E5E7EB",
                        color: "#6B7280",
                        fontFamily,
                      }}
                    >
                      ⌘K
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-1 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 p-0 rounded-lg hover:bg-green-50 transition-colors"
                  onClick={handleSearchIconClick}
                  title="Search jobs"
                >
                  <Search className="w-5 h-5" style={{ color: "#6A6A6A" }} />
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div
              className={`px-3 mt-2 ${
                !isOpen ? "flex flex-col items-center" : ""
              }`}
            >
              {navigationItems.map((item) => (
                <SidebarItem
                  key={item.label}
                  sidebar={item}
                  isOpen={showText}
                  jobs={filteredJobs}
                  loading={loading}
                  selectedJobId={selectedJobId || null}
                  onJobSelect={onJobSelect}
                  onCreateJob={onCreateJob}
                  displayedJobs={displayedJobs}
                  hasMoreJobs={hasMoreJobs}
                  showAllJobs={showAllJobs}
                  setShowAllJobs={setShowAllJobs}
                  searchQuery={searchQuery}
                  mode={mode}
                  fontFamily={fontFamily}
                  onAllViewsClick={handleAllViewsClick}
                />
              ))}
            </div>
          </div>

          {/* Bottom Account Section */}
          <div className="p-3 border-t" style={{ borderColor: "#E2E8F0" }}>
            <div
              className={`flex items-center ${
                isOpen ? "justify-between" : "justify-center"
              }`}
            >
              <div
                className={`flex items-center ${
                  isOpen ? "gap-3" : "justify-center"
                }`}
              >
                <LogoutWrapper
                  showDropdown={!isOpen}
                  onDropdownOpenChange={setIsDropdownOpen}
                >
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarImage
                      src={user?.photoURL || ""}
                      alt={apiUser?.first_name || user?.displayName || "User"}
                    />
                    <AvatarFallback
                      className="text-white text-sm font-medium"
                      style={{ backgroundColor: "#8B5A3C" }}
                    >
                      {apiUser?.first_name?.charAt(0) ||
                        user?.displayName?.charAt(0) ||
                        user?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                </LogoutWrapper>
                {showText && (
                  <div
                    className={`text-sm transition-all duration-300 ${
                      isOpen ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      color: "#374151",
                      fontFamily,
                      overflow: "hidden",
                    }}
                  >
                    {(apiUser?.first_name && apiUser?.last_name
                      ? `${apiUser.first_name} ${apiUser.last_name}`
                      : apiUser?.first_name || user?.displayName || "User"
                    )?.slice(0, 16)}
                  </div>
                )}
              </div>
              {showText && (
                <LogoutWrapper
                  showDropdown={true}
                  onDropdownOpenChange={setIsDropdownOpen}
                >
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <EllipsisVertical className="w-4 h-4" />
                  </Button>
                </LogoutWrapper>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

const LogoutWrapper = ({
  children,
  showDropdown,
  onDropdownOpenChange,
}: {
  children: React.ReactNode;
  showDropdown?: boolean;
  onDropdownOpenChange?: (open: boolean) => void;
}) => {
  const { logout } = useAuth();

  const handleUserLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!showDropdown) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu onOpenChange={onDropdownOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-32">
        <DropdownMenuItem className="cursor-pointer">
          <User className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleUserLogout()}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SidebarItem = ({
  sidebar,
  isOpen,
  jobs,
  loading,
  selectedJobId,
  onJobSelect,
  onCreateJob,
  displayedJobs,
  hasMoreJobs,
  showAllJobs,
  setShowAllJobs,
  searchQuery,
  mode,
  fontFamily,
  onAllViewsClick,
}: {
  isOpen: boolean;
  sidebar: any;
  jobs: JobOpeningListItem[];
  loading: boolean;
  selectedJobId: string | null;
  onJobSelect?: (job: JobOpeningListItem) => void;
  onCreateJob?: () => void;
  displayedJobs: JobOpeningListItem[];
  hasMoreJobs: boolean;
  showAllJobs: boolean;
  setShowAllJobs: (show: boolean) => void;
  searchQuery: string;
  mode: string;
  fontFamily: string;
  onAllViewsClick?: () => void;
}) => {
  const [hoverState, setHoverState] = useState(false);

  const hasSubOptions = sidebar.hasSubmenu;
  // Don't highlight "All roles" - we'll highlight individual jobs instead
  const activeSidebarId = null;

  const getSidebarIcon = (IconComponent: any) => {
    // Always use default gray color for navigation items
    const iconColor = "#6A6A6A";

    if (IconComponent === RocketIcon) {
      return <RocketIcon size={20} color={iconColor} />;
    }
    return <IconComponent className="w-5 h-5" style={{ color: iconColor }} />;
  };

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center ${
          isOpen ? "justify-between" : "justify-center"
        } m-1 px-3 py-2 rounded-lg transition-colors hover:bg-gray-50`}
      >
        <div
          className={`flex items-center ${
            isOpen ? "flex-1" : "justify-center"
          }`}
          onMouseEnter={() => setHoverState(true)}
          onMouseLeave={() => setHoverState(false)}
        >
          {!isOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{getSidebarIcon(sidebar.icon)}</div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{sidebar.label}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              {getSidebarIcon(sidebar.icon)}
              <span
                className="text-sm font-medium ml-3 transition-all duration-300"
                style={{
                  color: "#374151",
                  fontFamily,
                  overflow: "hidden",
                }}
              >
                {sidebar.label}
              </span>
            </>
          )}
        </div>
        {hasSubOptions && isOpen && (
          <div
            className="ml-2 p-1.5 rounded-md cursor-pointer transition-all duration-200 hover:bg-teal-100 hover:scale-105"
            style={{
              backgroundColor: sidebar.label === "All views" ? "#3B82F6" : "#5BA4A4",
              boxShadow: sidebar.label === "All views" 
                ? "0 2px 4px rgba(59, 130, 246, 0.2)" 
                : "0 2px 4px rgba(91, 164, 164, 0.2)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (sidebar.label === "All views") {
                onAllViewsClick?.();
              } else {
                onCreateJob?.();
              }
            }}
            title={sidebar.label === "All views" ? "Create new view" : "Create new job"}
          >
            <Plus className="w-4 h-4" style={{ color: "white" }} />
          </div>
        )}
      </div>

      {/* Job Roles Submenu - Only show when expanded */}
      {hasSubOptions && isOpen && (
        <div className="flex flex-col gap-1 transition-all duration-300">
          {sidebar.label === "All roles" && (
            <div className="ml-10 mr-2 space-y-1">
              {loading ? (
                <div
                  className="flex items-center px-3 py-2 text-sm"
                  style={{
                    color: "#6B7280",
                    fontSize: "14px",
                    fontFamily,
                  }}
                >
                  Loading jobs...
                </div>
              ) : jobs.length === 0 ? (
                <div
                  className="flex items-center px-3 py-2 text-sm"
                  style={{
                    color: "#6B7280",
                    fontSize: "14px",
                    fontFamily,
                  }}
                >
                  {searchQuery
                    ? `No jobs found matching "${searchQuery}"`
                    : "No jobs found"}
                </div>
              ) : (
                <>
                  <div
                    className={`space-y-1 ${
                      showAllJobs ? "max-h-80 overflow-y-auto pr-2" : ""
                    }`}
                  >
                    {displayedJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                          selectedJobId === job.id ? "" : "hover:bg-teal-50"
                        }`}
                        style={{
                          backgroundColor:
                            selectedJobId === job.id
                              ? "rgba(91, 164, 164, 0.1)"
                              : "transparent",
                          color:
                            selectedJobId === job.id ? "#5BA4A4" : "#374151",
                          fontSize: "14px",
                          fontFamily,
                          fontWeight: selectedJobId === job.id ? "500" : "400",
                        }}
                        onClick={() =>
                          mode === "listing" ? onJobSelect?.(job) : undefined
                        }
                      >
                        <div
                          className="w-2 h-2 rounded-full border"
                          style={{
                            borderColor:
                              selectedJobId === job.id ? "#5BA4A4" : "#9CA3AF",
                            backgroundColor:
                              selectedJobId === job.id
                                ? "#5BA4A4"
                                : "transparent",
                          }}
                        />
                        <span className="truncate">{job.posting_title}</span>
                      </div>
                    ))}
                  </div>
                  {hasMoreJobs && (
                    <div
                      className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-lg mt-2"
                      style={{
                        color: "#6B7280",
                        fontSize: "14px",
                        fontFamily,
                      }}
                      onClick={() => setShowAllJobs(!showAllJobs)}
                    >
                      {showAllJobs
                        ? "Show less"
                        : `See all ${jobs.length} jobs${
                            searchQuery ? ` matching "${searchQuery}"` : ""
                          }`}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {sidebar.label === "All views" && (
            <div className="ml-10 mr-2 space-y-1">
              {loading ? (
                <div
                  className="flex items-center px-3 py-2 text-sm"
                  style={{
                    color: "#6B7280",
                    fontSize: "14px",
                    fontFamily,
                  }}
                >
                  Loading jobs...
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                  style={{
                    color: "#6B7280",
                    fontSize: "14px",
                    fontFamily,
                  }}
                >
                  <Eye className="w-4 h-4" />
                  <span>No views created yet</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Alias for backward compatibility
export { AppSidebar as JobListingSidebar };
