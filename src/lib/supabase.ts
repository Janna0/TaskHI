import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zirhvbbpawbglbbhzvyh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppcmh2YmJwYXdiZ2xiYmh6dnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzE0MjIsImV4cCI6MjA5NDk0NzQyMn0.fgGxIbSDs7ZRCAPHAp_AjJQmdy3T0qKKg7Bn76bVxao'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
