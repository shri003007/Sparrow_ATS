import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a name with proper capitalization and formatting
 * Handles edge cases like multiple spaces, hyphens, apostrophes, etc.
 * @param name - The raw name string
 * @returns Properly formatted name
 */
export function formatName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Unknown';
  }

  // Trim whitespace and convert to lowercase first
  let formattedName = name.trim().toLowerCase();
  
  // Handle empty or whitespace-only strings
  if (!formattedName) {
    return 'Unknown';
  }

  // Split by common delimiters (spaces, hyphens, underscores, dots)
  const words = formattedName.split(/[\s\-_\.]+/).filter(word => word.length > 0);
  
  if (words.length === 0) {
    return 'Unknown';
  }

  // Capitalize each word and handle special cases
  const formattedWords = words.map(word => {
    // Handle common prefixes and suffixes
    if (word === 'van' || word === 'von' || word === 'de' || word === 'del' || word === 'da' || word === 'di') {
      return word.toLowerCase();
    }
    
    // Handle names with apostrophes (O'Connor, D'Angelo, etc.)
    if (word.includes("'")) {
      return word.split("'").map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join("'");
    }
    
    // Handle names with hyphens (Jean-Pierre, Mary-Jane, etc.)
    if (word.includes('-')) {
      return word.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('-');
    }
    
    // Regular capitalization
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return formattedWords.join(' ');
}
