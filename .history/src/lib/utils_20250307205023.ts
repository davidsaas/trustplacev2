import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names with Tailwind CSS utility classes properly merged
 * Uses clsx to combine classes and tailwind-merge to handle Tailwind specifics
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
