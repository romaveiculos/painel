export type VehicleStatus = 'draft' | 'published' | 'sold' | 'archived'

export type VehicleMedia = {
  id: string
  vehicle_id: string
  kind: 'image' | 'video'
  storage_path: string
  alt_text: string | null
  sort_order: number
  is_cover: boolean
  object_position: string
}

export type Vehicle = {
  id: string
  slug: string
  status: VehicleStatus
  featured: boolean
  brand: string
  model: string
  version: string
  year_manufacture: number
  year_model: number
  mileage: number
  price: number
  transmission: string
  fuel: string
  color: string
  body_type: string
  description: string
  optional_items: string[]
  badges: string[]
  created_at: string
  updated_at: string
  vehicle_media?: VehicleMedia[]
}

export type SiteSettings = {
  id: boolean
  business_name: string
  whatsapp: string
  instagram_url: string
  facebook_url: string
  email: string
  address_line: string
  city: string
  state: string
  postal_code: string
  maps_url: string
  opening_hours: string
}
