// ============================================
// Configuración de Supabase
// ============================================
// 1. Andá a tu proyecto en supabase.com → Project Settings → API
// 2. Copiá "Project URL" y "anon public key" y pegalos acá abajo
// ============================================
 
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
 
const SUPABASE_URL = 'https://uwrnfmoahtsbfurnsoti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3cm5mbW9haHRzYmZ1cm5zb3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMDc1MTQsImV4cCI6MjEwMzg4MzUxNH0.-cF5jrDxnKR1BXS_ixZzwm8LJHNAUJsiWPrBL1zAdEE';
 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
export const BUCKET_PRENDAS = 'prendas';
