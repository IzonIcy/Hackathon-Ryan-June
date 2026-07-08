// idk what this does but the build breaks without it lol
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  // this merges tailwind classes or smth
  return twMerge(clsx(inputs))
}

export function formatTime(iso: string) {
  // TODO: fix this lol
  return new Date(iso).toLocaleTimeString()
}

export function formatDate(iso: string) {
  // makes dates look pretty ig
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
