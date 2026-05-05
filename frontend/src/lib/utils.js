import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function createSlug(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function truncate(text, length = 100) {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

export function getImageUrl(image) {
  if (!image) return null;
  if (typeof image !== 'string') return null;
  if (image.startsWith('http')) return image;
  if (image.startsWith('data:')) return image;
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  return `${backendUrl}${image}`;
}

export function getFallbackImage(type) {
  if (type === 'church') {
    return '/assets/defaults/church_default.png';
  }
  // Default to pastor/person icon
  return '/assets/defaults/pastor_default.png';
}

export function timeToMinutes(timeStr) {
  if (!timeStr || timeStr.includes('::')) return -1;
  const parts = timeStr.trim().split(/[: ]+/);
  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10) || 0;
  if (isNaN(hours)) return -1;

  const isPM = timeStr.toUpperCase().includes('PM');
  const isAM = timeStr.toUpperCase().includes('AM');

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function isOpenNow(services) {
  if (!services || services.length === 0) return null;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTimeMins = now.getHours() * 60 + now.getMinutes();

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentIdx = days.indexOf(currentDay);
  const yesterdayIdx = currentIdx === 0 ? 6 : currentIdx - 1;
  const yesterdayDay = days[yesterdayIdx];

  // 1. Check services starting TODAY
  const openToday = services.some(s => {
    if (s.day !== currentDay) return false;
    
    // Handle availability strings if present
    if (s.availability === 'open_all_day') return true;
    if (s.availability === 'closed_all_day') return false;

    const start = timeToMinutes(s.start_time || s.from_time);
    const end = timeToMinutes(s.end_time || s.to_time);
    
    if (start === -1) return false;

    if (s.ends_next_day) {
      // Started today, ends tomorrow. It's open if we've passed the start time today.
      return currentTimeMins >= start;
    } else {
      // Started today, ends today.
      if (end === -1) return currentTimeMins >= start;
      return currentTimeMins >= start && currentTimeMins <= end;
    }
  });

  if (openToday) return true;

  // 2. Check services starting YESTERDAY that end TODAY
  const openFromYesterday = services.some(s => {
    if (s.day !== yesterdayDay || !s.ends_next_day) return false;
    
    const end = timeToMinutes(s.end_time || s.to_time);
    if (end === -1) return false;
    
    // Started yesterday, ends today. Still open if we haven't crossed today's end time.
    return currentTimeMins <= end;
  });

  return openFromYesterday;
}

export function formatTimeTo12h(time24) {
  if (!time24 || time24.includes('::')) return '';
  try {
    const parts = time24.split(/[: ]+/);
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    if (isNaN(minutes)) minutes = 0;
    if (isNaN(hours)) return '';

    const ampmSuffix = time24.toUpperCase().includes('PM') ? 'PM' : 
                       time24.toUpperCase().includes('AM') ? 'AM' : null;
    let ampm = ampmSuffix || (hours >= 12 ? 'PM' : 'AM');

    let hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  } catch (e) {
    return '';
  }
}

export function getSessionId() {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

export function ensureExternalUrl(url) {
  if (!url) return "#";
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) return url;
  if (url.startsWith('www.')) return `https://${url}`;
  // For standard domain patterns or social handles, assume https
  return `https://${url}`;
}