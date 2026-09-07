import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://zecsdavacnbzombkzsez.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_S4dCLUqH6lunPWfKssRxVA_ZdJxov0d'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const mediaUrl = (path: string) => supabase.storage.from('vehicle-media').getPublicUrl(path).data.publicUrl
