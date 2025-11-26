// src/services/supa.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupaService {
  public readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.NG_APP_SUPABASE_URL,
      environment.NG_APP_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
}
