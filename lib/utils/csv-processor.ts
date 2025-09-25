import type { CSVData, CandidatePreview, ValidationResult } from '@/lib/candidate-types'
import type { CandidateCustomFieldDefinition } from '@/lib/custom-field-types'

export class CSVProcessor {
  /**
   * Parse CSV file to extract headers and rows
   */
  static async parseCSV(file: File): Promise<CSVData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string
          const lines = csvText.split('\n').filter(line => line.trim() !== '')
          
          if (lines.length === 0) {
            throw new Error('CSV file is empty')
          }
          
          // Parse headers (first line)
          const rawHeaders = this.parseCSVLine(lines[0])
          
          // Make headers unique by adding suffixes to duplicates
          const headers = this.makeHeadersUnique(rawHeaders.map(h => h.trim()))
          

          
          // Parse data rows
          const rows = lines.slice(1).map(line => this.parseCSVLine(line))
          
          resolve({
            headers,
            rows: rows.filter(row => row.some(cell => cell.trim() !== ''))
          })
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error}`))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read CSV file'))
      }
      
      reader.readAsText(file)
    })
  }

  /**
   * Make headers unique by adding suffixes to duplicates
   */
  private static makeHeadersUnique(headers: string[]): string[] {
    const seen = new Map<string, number>()
    const uniqueHeaders: string[] = []

    for (const header of headers) {
      const cleanHeader = header.trim()
      
      if (!cleanHeader) {
        // Handle empty headers
        const emptyCount = seen.get('') || 0
        seen.set('', emptyCount + 1)
        uniqueHeaders.push(`Column_${emptyCount + 1}`)
        continue
      }

      const count = seen.get(cleanHeader) || 0
      seen.set(cleanHeader, count + 1)

      if (count === 0) {
        // First occurrence, use as is
        uniqueHeaders.push(cleanHeader)
      } else {
        // Duplicate, add suffix
        uniqueHeaders.push(`${cleanHeader}_${count + 1}`)
      }
    }

    return uniqueHeaders
  }

  /**
   * Parse a single CSV line, handling quoted values and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    // Add last field
    result.push(current)
    
    return result
  }

  /**
   * Convert CSV data to candidate previews using field mappings
   */
  static processCSVData(
    csvData: CSVData,
    fieldMappings: Record<string, string>,
    customFields?: CandidateCustomFieldDefinition[]
  ): CandidatePreview[] {
    const candidates: CandidatePreview[] = []
    
    csvData.rows.forEach((row, index) => {
      const candidate = this.mapRowToCandidate(row, csvData.headers, fieldMappings, index, customFields)
      candidates.push(candidate)
    })
    
    return candidates
  }

  /**
   * Map a single CSV row to a candidate preview
   */
  private static mapRowToCandidate(
    row: string[],
    headers: string[],
    fieldMappings: Record<string, string>,
    rowIndex: number,
    customFields?: CandidateCustomFieldDefinition[]
  ): CandidatePreview {
    const getValue = (fieldName: string): string => {
      const csvColumn = fieldMappings[fieldName]
      if (!csvColumn) return ''
      
      const columnIndex = headers.indexOf(csvColumn)
      if (columnIndex === -1) return ''
      
      return row[columnIndex]?.trim() || ''
    }

    const name = getValue('Name')
    const email = getValue('Email')
    const mobilePhone = getValue('Mobile Phone')
    const resumeUrl = getValue('Resume URL')
    const experienceStr = getValue('Experience (Years)')
    const currentSalaryStr = getValue('Current Salary')
    const expectedSalaryStr = getValue('Expected Salary')
    const availableToJoinStr = getValue('Available to Join (Days)')

    // Convert string values to appropriate types
    const experienceMonths = experienceStr ? this.parseExperience(experienceStr) : undefined
    const currentSalary = currentSalaryStr ? this.parseNumber(currentSalaryStr) : undefined
    const expectedSalary = expectedSalaryStr ? this.parseNumber(expectedSalaryStr) : undefined
    const availableToJoinDays = availableToJoinStr ? this.parseNumber(availableToJoinStr) : undefined

    // Validate the candidate
    const validation = this.validateCandidate({
      name,
      email,
      mobilePhone,
      resumeUrl,
      experienceMonths,
      currentSalary,
      expectedSalary,
      availableToJoinDays,
      currentLocation: getValue('Current Location'),
      currentSalaryCurrency: getValue('Current Salary Currency') || 'USD',
      expectedSalaryCurrency: getValue('Expected Salary Currency') || 'USD'
    })

    // Process custom fields
    const customFieldsData: Record<string, any> = {}
    if (customFields && customFields.length > 0) {
      customFields.forEach(field => {
        const value = getValue(field.field_name)
        
        // Always include the field if it's in the custom fields definitions
        if (value !== undefined && value !== null && value.trim() !== '') {
          // Convert value based on field type
          const convertedValue = this.convertCustomFieldValue(value, field.field_type)
          customFieldsData[field.field_name] = convertedValue
        } else {
          // Still add the field with empty value to maintain structure for all mapped fields
          customFieldsData[field.field_name] = ''
        }
      })
    }

    return {
      name,
      email,
      mobilePhone,
      resumeUrl,
      experienceMonths,
      currentSalary,
      currentSalaryCurrency: getValue('Current Salary Currency') || 'USD',
      expectedSalary,
      expectedSalaryCurrency: getValue('Expected Salary Currency') || 'USD',
      availableToJoinDays,
      currentLocation: getValue('Current Location'),
      customFields: customFieldsData,
      isValid: validation.isValid,
      issues: validation.issues,
      originalRowIndex: rowIndex
    }
  }

  /**
   * Convert custom field value based on field type
   */
  private static convertCustomFieldValue(value: string, fieldType: string): any {
    if (!value || value.trim() === '') return undefined

    switch (fieldType) {
      case 'number':
        const num = parseInt(value.trim())
        return isNaN(num) ? value : num
      
      case 'decimal':
        const decimal = parseFloat(value.trim())
        return isNaN(decimal) ? value : decimal
      
      case 'boolean':
        const lowerValue = value.trim().toLowerCase()
        return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes'
      
      case 'date':
        // Keep as string, will be validated later
        return value.trim()
      
      case 'multiselect':
        // Split by comma and trim each value
        return value.split(',').map(v => v.trim()).filter(v => v)
      
      default:
        // text, textarea, email, url, select
        return value.trim()
    }
  }

  /**
   * Parse experience string to months
   */
  private static parseExperience(experienceStr: string): number | undefined {
    const cleanStr = experienceStr.toLowerCase().replace(/[^\d.]/g, '')
    const num = parseFloat(cleanStr)
    
    if (isNaN(num)) return undefined
    
    // Assume input is in years, convert to months
    return Math.round(num * 12)
  }

  /**
   * Parse number from string
   */
  private static parseNumber(numStr: string): number | undefined {
    const cleanStr = numStr.replace(/[^0-9.]/g, '')
    const num = parseFloat(cleanStr)
    return isNaN(num) ? undefined : num
  }

  /**
   * Validate candidate data
   */
  private static validateCandidate(candidate: Partial<CandidatePreview>): ValidationResult {
    const issues: string[] = []

    // Required fields validation
    if (!candidate.name || candidate.name.trim() === '') {
      issues.push('Name is required')
    }

    if (!candidate.email || candidate.email.trim() === '') {
      issues.push('Email is required')
    } else if (!this.isValidEmail(candidate.email)) {
      issues.push('Invalid email format')
    }

    // Mobile phone is optional, but if provided, validate format
    if (candidate.mobilePhone && candidate.mobilePhone.trim() !== '' && !this.isValidPhone(candidate.mobilePhone)) {
      issues.push('Invalid phone format')
    }

    // Optional fields validation
    if (candidate.experienceMonths !== undefined && candidate.experienceMonths < 0) {
      issues.push('Experience cannot be negative')
    }

    if (candidate.currentSalary !== undefined && candidate.currentSalary < 0) {
      issues.push('Current salary cannot be negative')
    }

    if (candidate.expectedSalary !== undefined && candidate.expectedSalary < 0) {
      issues.push('Expected salary cannot be negative')
    }

    if (candidate.availableToJoinDays !== undefined && candidate.availableToJoinDays < 0) {
      issues.push('Available to join days cannot be negative')
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone format (basic validation)
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10
  }
}