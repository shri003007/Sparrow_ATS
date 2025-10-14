'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { user, isLoading, signInWithGoogle, signInWithEmail } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !isLoading) {
      router.replace('/')
    }
  }, [user, isLoading, router])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    if (!email.endsWith('@surveysparrow.com')) {
      setError('Access restricted to @surveysparrow.com email addresses only')
      return
    }

    try {
      setError('')
      setIsSubmitting(true)
      await signInWithEmail(email, password)
    } catch (error: any) {
      setError(error.message || 'Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      await signInWithGoogle()
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: "#5BA4A4" }}></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      {/* Main Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <img 
                src="/ss-logo.svg"
                alt="SurveySparrow"
                className="h-8 w-auto mx-auto"
              />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to continue to SurveySparrow Recruitment</p>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@surveysparrow.com"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:opacity-60"
                style={{
                  '--tw-ring-color': '#5BA4A4',
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => {
                  e.currentTarget.style.setProperty('--tw-ring-color', '#5BA4A4');
                  e.currentTarget.classList.add('focus:ring-2');
                }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:opacity-60"
                style={{
                  '--tw-ring-color': '#5BA4A4',
                } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => {
                  e.currentTarget.style.setProperty('--tw-ring-color', '#5BA4A4');
                  e.currentTarget.classList.add('focus:ring-2');
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full h-12 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-60"
              style={{
                backgroundColor: "#5BA4A4",
                boxShadow: "0 2px 4px rgba(91, 164, 164, 0.2)",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isLoading) {
                  e.currentTarget.style.backgroundColor = "#4A9999";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && !isLoading) {
                  e.currentTarget.style.backgroundColor = "#5BA4A4";
                }
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading || isSubmitting}
            className="w-full h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors rounded-xl font-medium disabled:opacity-60"
            variant="outline"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </div>
          </Button>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-sm text-gray-500">
        <p>Access restricted to @surveysparrow.com email addresses</p>
      </div>
    </div>
  )
}
