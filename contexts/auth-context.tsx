'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { clarityService } from '@/lib/clarity'
import { UsersApi, type User as ApiUser } from '@/lib/api/users'
import { authenticatedApiService } from '@/lib/api/authenticated-api-service'

interface AuthContextType {
  user: User | null
  apiUser: ApiUser | null
  isLoading: boolean
  logout: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ALLOWED_DOMAIN = 'surveysparrow.com'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [apiUser, setApiUser] = useState<ApiUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Helper function to handle API user creation/verification
  const handleApiUserSetup = async (firebaseUser: User): Promise<ApiUser | null> => {
    try {
      if (!firebaseUser.email) {
        throw new Error('User email is required')
      }

      // Extract first and last name from display name
      const displayName = firebaseUser.displayName || ''
      const nameParts = displayName.split(' ')
      const firstName = nameParts[0] || firebaseUser.email.split('@')[0]
      const lastName = nameParts.slice(1).join(' ') || undefined

      // Check if user exists in our system, create if not
      const apiUser = await UsersApi.ensureUserExists(
        firebaseUser.email,
        firstName,
        lastName
      )

      return apiUser
    } catch (error) {
      console.error('Error setting up API user:', error)
      toast({
        title: "User Setup Warning",
        description: "There was an issue setting up your user profile. Some features may be limited.",
        variant: "destructive"
      })
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true)
      try {
        if (user) {
          if (!user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
            await signOut(auth)
            localStorage.removeItem('auth-token')
            setUser(null)
            setApiUser(null)
            router.replace('/login')
            toast({
              title: "Access Denied",
              description: `Access restricted to @${ALLOWED_DOMAIN} email addresses only.`,
              variant: "destructive"
            })
            return
          }
          
          setUser(user)
          const token = await user.getIdToken()
          localStorage.setItem('auth-token', token)
          
          // Update API service with new token
          authenticatedApiService.setIdToken(token)
          
          // Set up API user (check existence and create if needed)
          const apiUserData = await handleApiUserSetup(user)
          setApiUser(apiUserData)
          
          // Identify user in Clarity
          clarityService.identifyUser(user)
          
          // Only redirect to main page if user is on login page
          if (pathname === '/login') {
            router.replace('/')
            toast({
              title: "Welcome!",
              description: apiUserData ? 
                `Successfully signed in as ${apiUserData.first_name}!` : 
                "Successfully signed in!",
            })
          }
        } else {
          setUser(null)
          setApiUser(null)
          localStorage.removeItem('auth-token')
          
          // Clear API service token
          authenticatedApiService.clearToken()
          
          // Clear all user-specific localStorage data when user becomes null
          // This handles cases where auth state changes without explicit logout
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('reddit_posts_') || key.startsWith('selected_preset_')) {
              localStorage.removeItem(key)
            }
          })
          
          // Clear user identification in Clarity
          clarityService.identifyUser(null)
        }
      } catch (error) {
        console.error('Auth state change error:', error)
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router, pathname])

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      
      if (result.user) {
        if (!result.user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
          await signOut(auth)
          throw new Error(`Access restricted to @${ALLOWED_DOMAIN} email addresses only.`)
        }
        
        const token = await result.user.getIdToken()
        localStorage.setItem('auth-token', token)
        
        // Update API service with new token
        authenticatedApiService.setIdToken(token)
        
        // Set up API user (check existence and create if needed)
        const apiUserData = await handleApiUserSetup(result.user)
        setApiUser(apiUserData)
        
        // Identify user in Clarity
        clarityService.identifyUser(result.user)
        
        router.replace('/')
      }
    } catch (error) {
      console.error('Google Auth Error:', error)
      toast({
        title: "Sign In Failed",
        description: error instanceof Error ? error.message : 'Failed to sign in with Google',
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      
      // Clear all user-specific data from localStorage
      const userEmail = user?.email
      if (userEmail) {
        localStorage.removeItem(`reddit_posts_${userEmail}`)
        localStorage.removeItem(`selected_preset_${userEmail}`)
      }
      
      await signOut(auth)
      localStorage.removeItem('auth-token')
      setApiUser(null)
      
      // Clear API service token
      authenticatedApiService.clearToken()
      
      // Clear user identification in Clarity
      clarityService.identifyUser(null)
      
      router.replace('/login')
      toast({
        title: "Logged Out",
        description: "Successfully logged out. All stored posts have been cleared.",
      })
    } catch (error) {
      console.error('Logout failed:', error)
      toast({
        title: "Logout Failed",
        description: "Failed to logout",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      apiUser,
      isLoading, 
      logout,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
