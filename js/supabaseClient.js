// ============================================
// Configuración de Supabase
// ============================================
// 1. Andá a tu proyecto en supabase.com → Project Settings → API
// 2. Copiá "Project URL" y "anon public key" y pegalos acá abajo
// ============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'PEGA_ACA_TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'PEGA_ACA_TU_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const BUCKET_PRENDAS = 'prendas';
