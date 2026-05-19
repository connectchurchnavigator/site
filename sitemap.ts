// app/sitemap.ts
// Place this file at: src/app/sitemap.ts (or app/sitemap.ts)
// Next.js App Router automatically serves this at /sitemap.xml

import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE_URL = 'https://churchnavigator.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // ── Static pages ──────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/churches/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/worship-leaders/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/media-team/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // ── Church listings ───────────────────────────────────────
  // IMPORTANT: Change 'churches' to match your actual Supabase table name
  const { data: churches } = await supabase
    .from('churches')           // ← your table name
    .select('slug, updated_at')
    .eq('status', 'published')  // ← only published listings

  const churchUrls: MetadataRoute.Sitemap = (churches ?? []).map((c) => ({
    url: `${BASE_URL}/listing/${c.slug}/`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // ── Pastor listings ───────────────────────────────────────
  const { data: pastors } = await supabase
    .from('pastors')            // ← your table name
    .select('slug, updated_at')
    .eq('status', 'published')

  const pastorUrls: MetadataRoute.Sitemap = (pastors ?? []).map((p) => ({
    url: `${BASE_URL}/pastor/${p.slug}/`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // ── Worship leader listings ───────────────────────────────
  const { data: worshipLeaders } = await supabase
    .from('worship_leaders')    // ← your table name
    .select('slug, updated_at')
    .eq('status', 'published')

  const worshipLeaderUrls: MetadataRoute.Sitemap = (worshipLeaders ?? []).map((w) => ({
    url: `${BASE_URL}/worship-leader/${w.slug}/`,
    lastModified: w.updated_at ? new Date(w.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // ── Media team listings ───────────────────────────────────
  const { data: mediaTeam } = await supabase
    .from('media_team')         // ← your table name
    .select('slug, updated_at')
    .eq('status', 'published')

  const mediaTeamUrls: MetadataRoute.Sitemap = (mediaTeam ?? []).map((m) => ({
    url: `${BASE_URL}/media-team/${m.slug}/`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // ── Combine all ───────────────────────────────────────────
  return [
    ...staticPages,
    ...churchUrls,
    ...pastorUrls,
    ...worshipLeaderUrls,
    ...mediaTeamUrls,
  ]
}
