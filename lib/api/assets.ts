import { API_CONFIG } from '@/lib/config'

// Asset types
export interface ProjectAsset {
  asset_id: string
  candidate_id: string
  job_round_template_id: string
  asset_type: string
  original_name: string
  description: string
  file_size: number
  mime_type: string
  source_type: 'UPLOAD' | 'URL'
  original_url?: string
  s3_url?: string
  created_at: string
  updated_at: string
  created_by: string
  status: 'ACTIVE' | 'DELETED'
}

export interface AssetUploadRequest {
  file_content: string // base64 encoded
  filename: string
  content_type?: string
  description: string
  created_by: string
}

export interface AssetUrlRequest {
  url: string
  description: string
  created_by: string
  download?: boolean
}

export interface AssetUpdateRequest {
  description: string
}

export interface AssetListResponse {
  assets: ProjectAsset[]
  next_token?: string
  count: number
}

export interface AssetResponse {
  message: string
  asset: ProjectAsset
}

export interface AssetDownloadResponse {
  download_url: string
  expires_in: number
  filename: string
}

// Get API URL from config
const getAssetsApiUrl = (): string => {
  if (!API_CONFIG.CANDIDATE_PROJECT_ASSETS_API_URL) {
    throw new Error('Candidate project assets API URL not configured')
  }
  return API_CONFIG.CANDIDATE_PROJECT_ASSETS_API_URL
}

// Build API endpoint path
const buildAssetPath = (candidateId: string, jobRoundTemplateId: string, assetId?: string): string => {
  const basePath = `/candidates/${candidateId}/job-rounds/${jobRoundTemplateId}/assets`
  return assetId ? `${basePath}/${assetId}` : basePath
}

// Upload file asset
export async function uploadFileAsset(
  candidateId: string,
  jobRoundTemplateId: string,
  request: AssetUploadRequest
): Promise<AssetResponse> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId)
  
  const response = await fetch(`${apiUrl}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `Asset upload failed: ${response.status}`)
  }
  
  return data as AssetResponse
}

// Add asset from URL
export async function addAssetFromUrl(
  candidateId: string,
  jobRoundTemplateId: string,
  request: AssetUrlRequest
): Promise<AssetResponse> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId)
  
  const response = await fetch(`${apiUrl}/${path}/from-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `URL asset creation failed: ${response.status}`)
  }
  
  return data as AssetResponse
}

// Get all assets for a candidate's job round
export async function getAssets(
  candidateId: string,
  jobRoundTemplateId: string,
  params?: {
    limit?: number
    next_token?: string
    asset_type?: string
  }
): Promise<AssetListResponse> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId)
  
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.append('limit', params.limit.toString())
  if (params?.next_token) searchParams.append('next_token', params.next_token)
  if (params?.asset_type) searchParams.append('asset_type', params.asset_type)
  
  const url = searchParams.toString() 
    ? `${apiUrl}/${path}?${searchParams.toString()}`
    : `${apiUrl}/${path}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `Failed to fetch assets: ${response.status}`)
  }
  
  return data as AssetListResponse
}

// Get single asset
export async function getAsset(
  candidateId: string,
  jobRoundTemplateId: string,
  assetId: string
): Promise<{ asset: ProjectAsset }> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId, assetId)
  
  const response = await fetch(`${apiUrl}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `Failed to fetch asset: ${response.status}`)
  }
  
  return data
}

// Update asset metadata
export async function updateAsset(
  candidateId: string,
  jobRoundTemplateId: string,
  assetId: string,
  request: AssetUpdateRequest
): Promise<AssetResponse> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId, assetId)
  
  const response = await fetch(`${apiUrl}/${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `Failed to update asset: ${response.status}`)
  }
  
  return data as AssetResponse
}

// Delete asset
export async function deleteAsset(
  candidateId: string,
  jobRoundTemplateId: string,
  assetId: string
): Promise<AssetResponse> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId, assetId)
  
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `Failed to delete asset: ${response.status}`)
  }
  
  return data as AssetResponse
}

// Get download URL
export async function getAssetDownloadUrl(
  candidateId: string,
  jobRoundTemplateId: string,
  assetId: string,
  expiration?: number
): Promise<AssetDownloadResponse> {
  const apiUrl = getAssetsApiUrl()
  const path = buildAssetPath(candidateId, jobRoundTemplateId, assetId)
  
  const searchParams = new URLSearchParams()
  if (expiration) searchParams.append('expiration', expiration.toString())
  
  const url = searchParams.toString() 
    ? `${apiUrl}/${path}/download?${searchParams.toString()}`
    : `${apiUrl}/${path}/download`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data?.error || `Failed to get download URL: ${response.status}`)
  }
  
  return data as AssetDownloadResponse
}

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('text')) return '📃'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
  return '📁'
}
