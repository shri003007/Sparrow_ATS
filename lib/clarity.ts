import { User } from 'firebase/auth'

export const clarityService = {
  identifyUser: (user: User | null) => {
    // Microsoft Clarity user identification
    // This is a placeholder - implement actual Clarity integration if needed
    console.log('Clarity user identification:', user?.email || 'anonymous')
  }
}
