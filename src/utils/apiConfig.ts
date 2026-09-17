// Determine backend API URL with priority:
// 1. Explicit VITE_API_SERVER_URL or VITE_CHAT_SERVER_URL from .env
// 2. Fallback in local dev: http://localhost:3000
const rawServerUrl =
  import.meta.env.VITE_API_SERVER_URL ||
  import.meta.env.VITE_CHAT_SERVER_URL;

export const SERVER_URL: string =
  rawServerUrl && rawServerUrl.trim() !== ''
    ? rawServerUrl.trim().replace(/\/+$/, '')
    : 'https://retrv-app.vercel.app';

export function getApiServerUrl(): string {
  return SERVER_URL;
}
