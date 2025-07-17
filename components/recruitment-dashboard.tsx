"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  Briefcase,
  UsersIcon,
  MessageCircle,
  Bookmark,
  Clock,
  Star,
  ThumbsUp,
  MessageSquare,
  ArrowRight,
  Plus,
  X,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

// Types for API response
interface OverallData {
  name: string;
  email: string;
  phone: string;
  resume_url: string;
  score: number;
  recommendation_category: string;
}

interface IndividualData {
  professional_overview: string;
  key_qualifications: string;
  career_progression: string;
  justification: string;
}

interface Candidate {
  overall_data: OverallData;
  individual_data: IndividualData;
}

interface ApiResponse {
  details: Candidate[];
}

// Types for job creation flow
interface ApplicationQuestion {
  id?: string;
  job_id?: string;
  question_type: string;
  is_required: boolean;
  is_enabled: boolean;
  created_at?: string;
}

interface PipelineStage {
  id?: string;
  job_id?: string;
  stage_type: string;
  order_index: number;
  is_active: boolean;
  created_at?: string;
}

interface JobFormData {
  posting_title: string;
  employment_type: string;
  minimum_experience: string;
  compensation_type: string;
  compensation_value: string;
  compensation_currency: string;
  job_description: string;
  created_by: string;
  expires_at?: string;
}

interface JobBoard {
  name: string;
  enabled: boolean;
  icon: string;
}

type JobCreationStep = 'job-info' | 'application-details' | 'job-pipeline' | 'automated-emails' | 'job-boards';

export function RecruitmentDashboard() {
  const [activeTab, setActiveTab] = useState("all")
  const [showMoreApplicants, setShowMoreApplicants] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [jobRole, setJobRole] = useState("All candidates")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobRoles, setJobRoles] = useState<string[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [candidateDetailTab, setCandidateDetailTab] = useState("overview")
  
  // Job creation states
  const [showJobCreation, setShowJobCreation] = useState(false)
  const [currentStep, setCurrentStep] = useState<JobCreationStep>('job-info')
  const [jobFormData, setJobFormData] = useState<JobFormData>({
    posting_title: '',
    employment_type: 'Full-time',
    minimum_experience: '',
    compensation_type: 'Fixed',
    compensation_value: '',
    compensation_currency: 'USD',
    job_description: '',
    created_by: '550e8400-e29b-41d4-a716-446655440000', // Default UUID
    expires_at: ''
  })
  const [createdJobId, setCreatedJobId] = useState<string | null>(null)
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([
    { question_type: 'resume', is_required: true, is_enabled: true },
    { question_type: 'cover_letter', is_required: false, is_enabled: true },
    { question_type: 'portfolio', is_required: false, is_enabled: true },
    { question_type: 'github_profile', is_required: false, is_enabled: true }
  ])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { stage_type: 'Application Review', order_index: 1, is_active: true },
    { stage_type: 'Phone Screening', order_index: 2, is_active: true },
    { stage_type: 'Technical Interview', order_index: 3, is_active: true },
    { stage_type: 'System Design Interview', order_index: 4, is_active: true },
    { stage_type: 'Final Interview', order_index: 5, is_active: true },
    { stage_type: 'Reference Check', order_index: 6, is_active: true },
    { stage_type: 'Offer', order_index: 7, is_active: true }
  ])
  const [jobBoards, setJobBoards] = useState<JobBoard[]>([
    { name: 'LinkedIn', enabled: true, icon: '💼' },
    { name: 'Keka', enabled: false, icon: '🚀' }
  ])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<JobCreationStep>>(new Set())

  const fetchCandidates = async (role: string) => {
    if (!role.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://mh64633733prek3sbegir2qily0ghkjl.lambda-url.us-west-2.on.aws/?job_role=${encodeURIComponent(role)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      setCandidates(data.details || []);
      setFilteredCandidates(data.details || []);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch candidates');
      setCandidates([]);
      setFilteredCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCandidates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch candidates from all available job roles
      const allCandidatesData: Candidate[] = [];
      
      for (const role of jobRoles) {
        try {
          const response = await fetch(`https://mh64633733prek3sbegir2qily0ghkjl.lambda-url.us-west-2.on.aws/?job_role=${encodeURIComponent(role)}`);
          if (response.ok) {
            const data: ApiResponse = await response.json();
            if (data.details) {
              allCandidatesData.push(...data.details);
            }
          }
        } catch (err) {
          console.log(`Error fetching candidates for role: ${role}`);
        }
      }
      
      setAllCandidates(allCandidatesData);
      setCandidates(allCandidatesData);
      setFilteredCandidates(allCandidatesData);
    } catch (err) {
      console.error('Error fetching all candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch all candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobRoles = async () => {
    setLoadingRoles(true);
    
    try {
      // Only your actual job roles
      const actualRoles = [
        'Software Engineer - Backend Development',
        'Software Engineer - frontend Development'
      ];

      const availableRoles: string[] = [];
      
      // Check which roles have candidates
      for (const role of actualRoles) {
        try {
          const response = await fetch(`https://mh64633733prek3sbegir2qily0ghkjl.lambda-url.us-west-2.on.aws/?job_role=${encodeURIComponent(role)}`);
          if (response.ok) {
            const data: ApiResponse = await response.json();
            if (data.details && data.details.length > 0) {
              availableRoles.push(role);
            }
          }
        } catch (err) {
          console.log(`No candidates found for role: ${role}`);
        }
      }
      
      setJobRoles(availableRoles);
    } catch (err) {
      console.error('Error fetching job roles:', err);
      // Fallback to your actual roles if API fails
      setJobRoles(['Software Engineer - Backend Development', 'Software Engineer - frontend Development']);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Fetch job roles on component mount
  useEffect(() => {
    fetchJobRoles();
  }, []);

  // Handle candidate search by name
  const handleCandidateSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredCandidates(candidates);
      return;
    }

    const filtered = candidates.filter(candidate =>
      candidate.overall_data.name.toLowerCase().includes(query.toLowerCase()) ||
      candidate.overall_data.email.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCandidates(filtered);
  };

  const handleJobRoleClick = (role: string) => {
    setJobRole(role);
    setSearchQuery("");
    if (role === "All candidates") {
      fetchAllCandidates();
    } else {
      fetchCandidates(role);
    }
  };

  // Get recommendation icon and color based on category
  const getRecommendationDisplay = (candidate: Candidate) => {
    const category = candidate.overall_data.recommendation_category;
    const score = candidate.overall_data.score;

    switch (category) {
      case "Highly Recommended":
        return {
          icon: <Star className="w-4 h-4" />,
          color: "text-green-600",
          bgColor: "bg-green-50",
          text: `${category} (${score}/5)`
        };
      case "Good Hire":
        return {
          icon: <ThumbsUp className="w-4 h-4" />,
      color: "text-purple-600",
          bgColor: "bg-purple-50",
          text: `${category} (${score}/5)`
        };
      case "Needs Discussion":
        return {
          icon: <MessageSquare className="w-4 h-4" />,
          color: "text-orange-600",
          bgColor: "bg-orange-50", 
          text: `${category} (${score}/5)`
        };
      case "Not recommended":
        return {
          icon: <X className="w-4 h-4" />,
          color: "text-red-600",
          bgColor: "bg-red-50",
          text: `${category} (${score}/5)`
        };
      default:
        return {
          icon: <MessageSquare className="w-4 h-4" />,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          text: `${category} (${score}/5)`
        };
    }
  };

  // Job creation functions
  const createJob = async (formData: JobFormData) => {
    try {
      // Mock API call with delay to simulate real API
      console.log('Creating job with data:', formData);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      
      // Mock successful response
      const mockJobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Mock job created with ID:', mockJobId);
      return mockJobId;
      
      /* Real API call - commented out for testing
      const response = await fetch('https://dyf0kkzk0b.execute-api.us-west-2.amazonaws.com/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          posting_title: formData.posting_title,
          employment_type: formData.employment_type,
          minimum_experience: formData.minimum_experience,
          compensation_type: formData.compensation_type,
          compensation_value: parseInt(formData.compensation_value),
          compensation_currency: formData.compensation_currency,
          job_description: formData.job_description,
          created_by: formData.created_by,
          ...(formData.expires_at && { expires_at: formData.expires_at })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Job creation response:', data);
      return data.job.id;
      */
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  };

  const saveApplicationQuestions = async (jobId: string, questions: ApplicationQuestion[]) => {
    try {
      // Mock API call
      console.log('Saving application questions for job:', jobId, questions);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      console.log('Mock questions saved successfully');
      return { message: 'Application questions saved successfully' };
      
      /* Real API call - commented out for testing
      const response = await fetch(`https://dyf0kkzk0b.execute-api.us-west-2.amazonaws.com/api/jobs/${jobId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questions)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
      */
    } catch (error) {
      console.error('Error saving application questions:', error);
      throw error;
    }
  };

  const savePipelineStages = async (jobId: string, stages: PipelineStage[]) => {
    try {
      // Mock API call
      console.log('Saving pipeline stages for job:', jobId, stages);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      console.log('Mock pipeline stages saved successfully');
      return { message: 'Pipeline stages saved successfully' };
      
      /* Real API call - commented out for testing
      const response = await fetch(`https://dyf0kkzk0b.execute-api.us-west-2.amazonaws.com/api/jobs/${jobId}/pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stages)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
      */
    } catch (error) {
      console.error('Error saving pipeline stages:', error);
      throw error;
    }
  };

  const handleJobFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!jobFormData.posting_title.trim()) {
      setError('Job title is required');
      return;
    }
    if (!jobFormData.minimum_experience.trim()) {
      setError('Minimum experience is required');
      return;
    }
    if (!jobFormData.compensation_value.trim()) {
      setError('Compensation value is required');
      return;
    }
    if (!jobFormData.job_description.trim()) {
      setError('Job description is required');
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      setSuccessMessage(null);
      console.log('Submitting job form with data:', jobFormData);
      const jobId = await createJob(jobFormData);
      console.log('Created job with ID:', jobId);
      setCreatedJobId(jobId);
      setCompletedSteps(prev => new Set([...prev, 'job-info']));
      setSuccessMessage('Job information saved successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setCurrentStep('application-details');
      }, 1500);
    } catch (error) {
      console.error('Job creation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationQuestionsSubmit = async () => {
    if (!createdJobId) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      await saveApplicationQuestions(createdJobId, applicationQuestions);
      setCompletedSteps(prev => new Set([...prev, 'application-details']));
      setSuccessMessage('Application questions configured successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setCurrentStep('job-pipeline');
      }, 1500);
    } catch (error) {
      setError('Failed to save application questions');
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineStagesSubmit = async () => {
    if (!createdJobId) return;
    
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      await savePipelineStages(createdJobId, pipelineStages);
      setCompletedSteps(prev => new Set([...prev, 'job-pipeline']));
      setSuccessMessage('Pipeline stages configured successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setCurrentStep('job-boards'); // Skip automated emails for now
      }, 1500);
    } catch (error) {
      setError('Failed to save pipeline stages');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    const steps: JobCreationStep[] = ['job-info', 'application-details', 'job-pipeline', 'automated-emails', 'job-boards'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleStepComplete = () => {
    if (currentStep === 'job-info') {
      handleJobFormSubmit(new Event('submit') as any);
    } else if (currentStep === 'application-details') {
      handleApplicationQuestionsSubmit();
    } else if (currentStep === 'job-pipeline') {
      handlePipelineStagesSubmit();
    } else {
      nextStep();
    }
  };

  const resetJobCreation = () => {
    setShowJobCreation(false);
    setCurrentStep('job-info');
    setCreatedJobId(null);
    setError(null);
    setSuccessMessage(null);
    setCompletedSteps(new Set());
    setJobFormData({
      posting_title: '',
      employment_type: 'Full-time',
      minimum_experience: '',
      compensation_type: 'Fixed',
      compensation_value: '',
      compensation_currency: 'USD',
      job_description: '',
      created_by: '550e8400-e29b-41d4-a716-446655440000',
      expires_at: ''
    });
    setApplicationQuestions([
      { question_type: 'resume', is_required: true, is_enabled: true },
      { question_type: 'cover_letter', is_required: false, is_enabled: true },
      { question_type: 'portfolio', is_required: false, is_enabled: true },
      { question_type: 'github_profile', is_required: false, is_enabled: true }
    ]);
    setPipelineStages([
      { stage_type: 'Application Review', order_index: 1, is_active: true },
      { stage_type: 'Phone Screening', order_index: 2, is_active: true },
      { stage_type: 'Technical Interview', order_index: 3, is_active: true },
      { stage_type: 'System Design Interview', order_index: 4, is_active: true },
      { stage_type: 'Final Interview', order_index: 5, is_active: true },
      { stage_type: 'Reference Check', order_index: 6, is_active: true },
      { stage_type: 'Offer', order_index: 7, is_active: true }
    ]);
    setJobBoards([
      { name: 'LinkedIn', enabled: true, icon: '💼' },
      { name: 'Keka', enabled: false, icon: '🚀' }
    ]);
  };

  const updateQuestionConfig = (index: number, field: keyof ApplicationQuestion, value: boolean) => {
    const updated = [...applicationQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setApplicationQuestions(updated);
  };

  const updateStageConfig = (index: number, field: keyof PipelineStage, value: boolean | string | number) => {
    const updated = [...pipelineStages];
    updated[index] = { ...updated[index], [field]: value };
    setPipelineStages(updated);
  };

  const addPipelineStage = () => {
    const newStage: PipelineStage = {
      stage_type: '',
      order_index: pipelineStages.length + 1,
      is_active: true
    };
    setPipelineStages([...pipelineStages, newStage]);
  };

  const removePipelineStage = (index: number) => {
    const updated = pipelineStages.filter((_, i) => i !== index);
    // Reorder the remaining stages
    updated.forEach((stage, i) => {
      stage.order_index = i + 1;
    });
    setPipelineStages(updated);
  };

  const updateJobBoardConfig = (index: number, enabled: boolean) => {
    const updated = [...jobBoards];
    updated[index] = { ...updated[index], enabled };
    setJobBoards(updated);
  };

  // Get experience from career progression (placeholder logic)
  const getExperience = (candidate: Candidate) => {
    const progression = candidate.individual_data.career_progression || '';
    // Simple heuristic based on career progression mentions
    if (progression.includes('Senior') || progression.includes('Lead')) {
      return '5+ yrs.';
    } else if (progression.includes('Developer') || progression.includes('Engineer')) {
      return '3-5 yrs.';
    } else {
      return '2-3 yrs.';
    }
  };

  const displayedCandidates = showMoreApplicants ? filteredCandidates : filteredCandidates.slice(0, 8);

  return (
    <div className="flex h-screen bg-gray-100 p-4 gap-4 relative">
      {/* Sidebar */}
      <div className="w-60 bg-gray-50 border border-gray-200 flex flex-col rounded-2xl shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-400 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">*</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-600 text-sm font-medium">PRO</span>
              <span className="text-gray-900 text-sm font-medium">HighValueTeam</span>
            </div>
            <div className="ml-auto">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search candidates by name" 
              className="pl-10 bg-white border-gray-200 text-sm rounded-xl"
              value={searchQuery}
              onChange={(e) => handleCandidateSearch(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">⌘K</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4">
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">NAVIGATE</p>
            <nav className="space-y-1">
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </a>
              <div>
                <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                  <Briefcase className="w-4 h-4" />
                  All roles
                  <button onClick={() => setShowJobCreation(true)}>
                    <Plus className="w-4 h-4 ml-auto hover:text-blue-600 cursor-pointer transition-colors" />
                  </button>
                </div>
                <div className="ml-6 mt-2 space-y-1">
                  {loadingRoles ? (
                    <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading roles...
                    </div>
                  ) : (
                    <>
                      {/* Individual Job Roles */}
                      {jobRoles.map((role, index) => (
                        <button
                          key={role}
                          onClick={() => handleJobRoleClick(role)}
                          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors w-full text-left ${
                            role === jobRole 
                              ? "bg-white border border-gray-200 shadow-sm" 
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            role === jobRole ? "bg-blue-500" : "bg-gray-400"
                          }`}></div>
                          {role}
                        </button>
                      ))}
                      {jobRoles.length > 0 && (
                        <button 
                          onClick={fetchJobRoles}
                          className="text-sm text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Refresh roles
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleJobRoleClick("All candidates")}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors w-full text-left"
              >
                <Users className="w-4 h-4" />
                All candidates
              </button>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">All roles</p>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-600" />
                <h1 className="text-xl font-semibold text-gray-900">{jobRole}</h1>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <UsersIcon className="w-4 h-4" />
                  {filteredCandidates.length} candidates found
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Search to see candidates
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent rounded-xl border-gray-200">
                <Settings className="w-4 h-4" />
                Edit JD
              </Button>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800 rounded-xl">
                Mark closed
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search candidates by name or email" 
                className="pl-10 bg-white border-gray-200 rounded-xl"
                value={searchQuery}
                onChange={(e) => handleCandidateSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs Container */}
        <div className="px-6 py-4">
          <div className="bg-gray-50 rounded-2xl p-1 inline-flex gap-1">
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${
                activeTab === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("all")}
            >
              <UsersIcon className="w-4 h-4" />
              All applicants
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${
                activeTab === "contacted"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("contacted")}
            >
              <MessageCircle className="w-4 h-4" />
              Contacted
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${
                activeTab === "parked"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("parked")}
            >
              <Bookmark className="w-4 h-4" />
              Park for later
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center gap-2 rounded-xl transition-colors ${
                activeTab === "pending"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock className="w-4 h-4" />
              Action pending
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {filteredCandidates.length === 0 && !loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No candidates found</p>
                <p className="text-sm">Click on a job role to see candidates</p>
              </div>
            </div>
          ) : (
          <div className="mx-6 mb-4 rounded-2xl border border-gray-200 overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      Applicant's name
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      Recommendation / Score
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        Email
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        Phone
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1">Resume</div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                                    {displayedCandidates.map((candidate, index) => {
                    const recommendation = getRecommendationDisplay(candidate);
                    
                    return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                            onClick={() => setSelectedCandidate(candidate)}
                      >
                            {candidate.overall_data.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                            {recommendation.icon}
                            <span className={`text-sm font-medium ${recommendation.color}`}>{recommendation.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{candidate.overall_data.email}</span>
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{candidate.overall_data.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {candidate.overall_data.resume_url && (
                            <button
                              onClick={() => {
                                window.open(candidate.overall_data.resume_url, '_blank');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 hover:underline"
                            >
                              <FileText className="w-4 h-4" />
                              View Resume
                            </button>
                          )}
                        </td>
                  </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          )}

          {/* Expander Button */}
          {filteredCandidates.length > 8 && (
          <div className="mx-6 mb-6">
            <div className="flex justify-center">
              <div className="bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm">
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-colors"
                  onClick={() => setShowMoreApplicants(!showMoreApplicants)}
                >
                  {showMoreApplicants ? (
                    <>
                      Show fewer applicants
                      <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                    </>
                  ) : (
                    <>
                        See {filteredCandidates.length - 8} more applicants
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Candidate Detail Panel */}
      {selectedCandidate && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setSelectedCandidate(null)}
          />
          
          {/* Slide-out Panel */}
          <div className="fixed top-4 right-4 bottom-4 w-2/3 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500">All roles</div>
                <ChevronDown className="w-4 h-4 text-gray-400 rotate-90" />
                <div className="text-sm text-gray-900 font-medium">{jobRole}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-xl"
                onClick={() => setSelectedCandidate(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Candidate Info Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedCandidate.overall_data.name}</h2>
                  {selectedCandidate.overall_data.resume_url && (
                    <button
                      onClick={() => {
                        window.open(selectedCandidate.overall_data.resume_url, '_blank');
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Resume"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl">
                        Contact
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl">
                      <DropdownMenuItem className="rounded-lg">
                        <a href={`mailto:${selectedCandidate.overall_data.email}`}>Send Email</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg">
                        <a href={`tel:${selectedCandidate.overall_data.phone}`}>Call</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg">Send Message</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                        <Clock className="w-4 h-4 mr-1" />
                        Action pending
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl">
                      <DropdownMenuItem className="rounded-lg text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                        Contacted
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-orange-500">
                        <Bookmark className="w-4 h-4 mr-2" />
                        Park for later
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-red-600">
                        <X className="w-4 h-4 mr-2" />
                        Rejected
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-blue-600">
                        <Clock className="w-4 h-4 mr-2" />
                        Action pending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                <span>{selectedCandidate.overall_data.email}</span>
                <span>{selectedCandidate.overall_data.phone}</span>
              </div>

              {/* Detail Tabs */}
              <div className="flex gap-6">
                <button
                  className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                    candidateDetailTab === "overview"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setCandidateDetailTab("overview")}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Professional Overview
                </button>
                <button
                  className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                    candidateDetailTab === "assessment"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setCandidateDetailTab("assessment")}
                >
                  <Star className="w-4 h-4 inline mr-2" />
                  Assessment & Score
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
              {candidateDetailTab === "overview" && (
                <div className="space-y-8">
                  {/* Professional Overview */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Overview</h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-6">
                      {selectedCandidate.individual_data.professional_overview}
                    </p>
                      </div>

                  {/* Key Qualifications */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Qualifications</h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-6">
                      {selectedCandidate.individual_data.key_qualifications}
                    </p>
                  </div>

                  {/* Career Progression */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Career Progression</h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-6">
                      {selectedCandidate.individual_data.career_progression}
                    </p>
                  </div>
                </div>
              )}

              {candidateDetailTab === "assessment" && (
                <div className="space-y-8">
                  {/* Score and Recommendation */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Score & Recommendation</h3>
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900">{selectedCandidate.overall_data.score}/5</div>
                          <div className="text-sm text-gray-600">Overall Score</div>
                        </div>
                        <div className="flex-1">
                          {(() => {
                            const rec = getRecommendationDisplay(selectedCandidate);
                            return (
                  <div className="flex items-center gap-2">
                                {rec.icon}
                                <span className={`text-lg font-medium ${rec.color}`}>{rec.text}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Justification */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Justification</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedCandidate.individual_data.justification}
                      </p>
                    </div>
                  </div>
              )}
                </div>
          </div>
        </>
      )}

      {/* Job Creation Flow */}
      {showJobCreation && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-25"
            onClick={resetJobCreation}
          />
          
          {/* Horizontal Progress Bar */}
          <div className="relative bg-white border-b border-gray-200 p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Job Opening</h2>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[
                  { key: 'job-info', label: 'Job Information', icon: <Briefcase className="w-5 h-5" /> },
                  { key: 'application-details', label: 'Application Details', icon: <FileText className="w-5 h-5" /> },
                  { key: 'job-pipeline', label: 'Job Pipeline', icon: <Users className="w-5 h-5" /> },
                  { key: 'automated-emails', label: 'Automated Emails', icon: <MessageCircle className="w-5 h-5" /> },
                  { key: 'job-boards', label: 'Job Boards', icon: <Settings className="w-5 h-5" /> }
                ].map((step, index) => {
                  const isActive = step.key === currentStep;
                  const isCompleted = completedSteps.has(step.key as JobCreationStep);
                  
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                        isActive ? 'bg-blue-600 border-blue-600 text-white scale-110' : 
                        isCompleted ? 'bg-green-600 border-green-600 text-white' : 
                        'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <div className="text-white text-sm">✓</div>
                        ) : (
                          step.icon
                        )}
                      </div>
                      <span className={`ml-3 text-sm font-medium transition-colors ${
                        isActive ? 'text-blue-600' : 
                        isCompleted ? 'text-green-600' : 
                        'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                      {index < 4 && (
                        <div className={`w-16 h-0.5 mx-4 transition-colors duration-300 ${
                          isCompleted ? 'bg-green-600' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="relative flex-1 bg-white overflow-auto">
            <div className="max-w-4xl mx-auto p-6">
              {currentStep === 'job-info' && (
                <form onSubmit={handleJobFormSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-red-800">
                        <X className="w-5 h-5" />
                        <span className="font-medium">Error</span>
                      </div>
                      <p className="text-red-700 mt-1">{error}</p>
                    </div>
                  )}
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <Save className="w-5 h-5" />
                        <span className="font-medium">{successMessage}</span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Job Title */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Job Title *</label>
                      <Input
                        placeholder="e.g., Senior Software Engineer"
                        className="rounded-xl"
                        required
                        value={jobFormData.posting_title}
                        onChange={(e) => setJobFormData({ ...jobFormData, posting_title: e.target.value })}
                      />
                    </div>

                    {/* Employment Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Employment Type *</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={jobFormData.employment_type}
                        onChange={(e) => setJobFormData({ ...jobFormData, employment_type: e.target.value })}
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>

                    {/* Minimum Experience */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Minimum Experience *</label>
                      <Input
                        placeholder="e.g., 3+ years, Entry level"
                        className="rounded-xl"
                        required
                        value={jobFormData.minimum_experience}
                        onChange={(e) => setJobFormData({ ...jobFormData, minimum_experience: e.target.value })}
                      />
                    </div>

                    {/* Compensation */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Compensation *</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={jobFormData.compensation_type}
                          onChange={(e) => setJobFormData({ ...jobFormData, compensation_type: e.target.value })}
                        >
                          <option value="Fixed">Fixed</option>
                          <option value="Negotiable">Negotiable</option>
                          <option value="Range">Range</option>
                        </select>
                        <Input
                          type="number"
                          placeholder="80000"
                          className="rounded-xl"
                          required
                          value={jobFormData.compensation_value}
                          onChange={(e) => setJobFormData({ ...jobFormData, compensation_value: e.target.value })}
                        />
                        <select className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={jobFormData.compensation_currency}
                          onChange={(e) => setJobFormData({ ...jobFormData, compensation_currency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Job Description *</label>
                    <Textarea
                      placeholder="Detailed job description..."
                      rows={8}
                      className="rounded-xl"
                      required
                      value={jobFormData.job_description}
                      onChange={(e) => setJobFormData({ ...jobFormData, job_description: e.target.value })}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={resetJobCreation}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700 rounded-xl"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Next Step
                    </Button>
                  </div>
                </form>
              )}

                            {currentStep === 'application-details' && (
                <div className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-red-800">
                        <X className="w-5 h-5" />
                        <span className="font-medium">Error</span>
                      </div>
                      <p className="text-red-700 mt-1">{error}</p>
                    </div>
                  )}
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <Save className="w-5 h-5" />
                        <span className="font-medium">{successMessage}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Questions</h3>
                    <p className="text-gray-600 mb-6">Configure what information candidates need to provide when applying.</p>
                  </div>

                  <div className="space-y-4">
                    {applicationQuestions.map((question, index) => (
                      <div key={question.question_type} className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="capitalize font-medium text-gray-900">
                              {question.question_type.replace('_', ' ')}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={question.is_enabled}
                                onChange={(e) => updateQuestionConfig(index, 'is_enabled', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-600">Enabled</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={question.is_required}
                                onChange={(e) => updateQuestionConfig(index, 'is_required', e.target.checked)}
                                disabled={!question.is_enabled}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-600">Required</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={() => setCurrentStep('job-info')}
                    >
                      Previous
                    </Button>
                    <Button 
                      type="button" 
                      className="bg-green-600 hover:bg-green-700 rounded-xl"
                      onClick={handleApplicationQuestionsSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

                            {currentStep === 'job-pipeline' && (
                <div className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-red-800">
                        <X className="w-5 h-5" />
                        <span className="font-medium">Error</span>
                      </div>
                      <p className="text-red-700 mt-1">{error}</p>
                    </div>
                  )}
                  {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <Save className="w-5 h-5" />
                        <span className="font-medium">{successMessage}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Pipeline</h3>
                    <p className="text-gray-600 mb-6">Configure the hiring stages candidates will go through for this role.</p>
                  </div>

                  <div className="space-y-4">
                    {pipelineStages.map((stage, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <Input
                              placeholder="Stage name (e.g., Technical Interview)"
                              value={stage.stage_type}
                              onChange={(e) => updateStageConfig(index, 'stage_type', e.target.value)}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={stage.is_active}
                                onChange={(e) => updateStageConfig(index, 'is_active', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-600">Active</span>
                            </label>
                            {pipelineStages.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removePipelineStage(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPipelineStage}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stage
                  </Button>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={() => setCurrentStep('application-details')}
                    >
                      Previous
                    </Button>
                    <Button 
                      type="button" 
                      className="bg-green-600 hover:bg-green-700 rounded-xl"
                      onClick={handlePipelineStagesSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 'automated-emails' && (
                <div className="space-y-6">
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📧</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Emails</h3>
                    <p className="text-gray-600 mb-6">This feature will be available soon.</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={() => setCurrentStep('job-pipeline')}
                    >
                      Previous
                    </Button>
                    <Button 
                      type="button" 
                      className="bg-green-600 hover:bg-green-700 rounded-xl"
                      onClick={() => setCurrentStep('job-boards')}
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 'job-boards' && (
                <div className="space-y-6">
                    <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Boards</h3>
                    <p className="text-gray-600 mb-6">Choose where to post this job opening to attract candidates.</p>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobBoards.map((board, index) => (
                      <div 
                        key={board.name} 
                        className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                          board.enabled 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => updateJobBoardConfig(index, !board.enabled)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{board.icon}</div>
                    <div>
                              <h4 className="font-medium text-gray-900">{board.name}</h4>
                              <p className="text-sm text-gray-500">
                                {board.name === 'LinkedIn' 
                                  ? 'Professional networking platform' 
                                  : 'Comprehensive HR platform'
                                }
                              </p>
                    </div>
                  </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            board.enabled 
                              ? 'border-green-500 bg-green-500' 
                              : 'border-gray-300'
                          }`}>
                            {board.enabled && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                        {board.enabled && (
                          <div className="mt-4 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                            ✓ This job will be posted to {board.name}
                </div>
              )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="rounded-xl"
                      onClick={() => setCurrentStep('job-pipeline')}
                    >
                      Previous
                    </Button>
                                          <Button 
                        type="button" 
                        className="bg-green-600 hover:bg-green-700 rounded-xl"
                        onClick={() => {
                          setCompletedSteps(prev => new Set([...prev, 'job-boards']));
                          setSuccessMessage('🎉 Job creation completed successfully! Your job posting is now ready.');
                          setTimeout(() => {
                            resetJobCreation();
                          }, 3000);
                        }}
                      >
                        Complete Job Creation
                      </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
