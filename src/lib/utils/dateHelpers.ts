import { devLog } from "@/lib/utils/productionLogger";

/**
 * Utility functions for safe date handling throughout the application
 */

/**
 * Safely checks if a value is a valid date
 * @param value Any value to check
 * @returns boolean
 */
export function isValidDate(value: any): boolean {
  if (!value) return false;
  
  try {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    if (typeof value === 'object' && 'seconds' in value) {
      const milliseconds = value.seconds * 1000;
      // Check if within JavaScript's valid date range
      return milliseconds > -8640000000000000 && milliseconds < 8640000000000000;
    }
    
    if (typeof value === 'string') {
      const parsedDate = new Date(value);
      return !isNaN(parsedDate.getTime());
    }
    
    if (typeof value === 'number') {
      // Check if within JavaScript's valid date range
      return value > -8640000000000000 && value < 8640000000000000;
    }
    
    return false;
  } catch (error) {
    devLog.error('[DateHelper] Error checking date validity:', error);
    return false;
  }
}

/**
 * Safely converts any date-like value to a JavaScript Date object
 * Returns null if the input cannot be converted to a valid date
 * @param value Any date-like value
 * @returns Date object or null
 */
export function toSafeDate(value: any): Date | null {
  if (!value) return null;
  
  try {
    // Handle Firestore Timestamp
    if (typeof value === 'object' && 'seconds' in value) {
      const milliseconds = value.seconds * 1000;
      // Validate the timestamp is within JavaScript's valid date range
      if (milliseconds < -8640000000000000 || milliseconds > 8640000000000000) {
        devLog.warn('[DateHelper] Timestamp out of range:', value.seconds);
        return null;
      }
      return new Date(milliseconds);
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    // Handle ISO strings
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle numeric timestamps
    if (typeof value === 'number') {
      // Validate the timestamp is within JavaScript's valid date range
      if (value < -8640000000000000 || value > 8640000000000000) {
        devLog.warn('[DateHelper] Numeric timestamp out of range:', value);
        return null;
      }
      return new Date(value);
    }
    
    return null;
  } catch (error) {
    devLog.error('[DateHelper] Error converting to safe date:', error, 'Value was:', value);
    return null;
  }
}

/**
 * ✅ CORREÇÃO REACT #130: Safely converts any date-like value to ISO string
 * Returns null if the input cannot be converted to a valid date
 * @param value Any date-like value
 * @returns ISO string or null
 */
export function toSafeDateString(value: any): string | null {
  const safeDate = toSafeDate(value);
  return safeDate ? safeDate.toISOString() : null;
}

/**
 * Safely formats a date for display with fallback
 * @param value Any date-like value
 * @param format Function to format the date
 * @param fallback Fallback value if date is invalid
 * @returns Formatted date string or fallback
 */
export function formatSafeDate(
  value: any, 
  format: (date: Date) => string = (d) => d.toLocaleDateString(),
  fallback: string = 'Data inválida'
): string {
  const safeDate = toSafeDate(value);
  if (!safeDate) return fallback;
  
  try {
    return format(safeDate);
  } catch (error) {
    devLog.error('[DateHelper] Error formatting date:', error);
    return fallback;
  }
}

/**
 * Gets timestamp for consistent comparison across date types
 * @param value Any date-like value
 * @returns Timestamp in milliseconds or 0 if invalid
 */
export function getTimestamp(value: any): number {
  const safeDate = toSafeDate(value);
  return safeDate ? safeDate.getTime() : 0;
}

/**
 * Safe comparison of two dates (greater than)
 */
export function isDateAfter(date1: any, date2: any): boolean {
  return getTimestamp(date1) > getTimestamp(date2);
}

/**
 * Safe comparison of two dates (less than)
 */
export function isDateBefore(date1: any, date2: any): boolean {
  return getTimestamp(date1) < getTimestamp(date2);
}

/**
 * Safe comparison of two dates (equal)
 */
export function isSameDate(date1: any, date2: any): boolean {
  return getTimestamp(date1) === getTimestamp(date2);
}

/**
 * Checks if a date is from the current month
 */
export function isDateFromCurrentMonth(date: any): boolean {
  const safeDate = toSafeDate(date);
  if (!safeDate) return false;
  
  const now = new Date();
  return safeDate.getMonth() === now.getMonth() && 
         safeDate.getFullYear() === now.getFullYear();
}

/**
 * Checks if a date is from a specific month
 */
export function isDateFromMonth(date: any, targetMonth: Date): boolean {
  const safeDate = toSafeDate(date);
  if (!safeDate) return false;
  
  return safeDate.getMonth() === targetMonth.getMonth() && 
         safeDate.getFullYear() === targetMonth.getFullYear();
} 