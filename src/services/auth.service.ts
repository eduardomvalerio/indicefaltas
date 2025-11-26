import { Injectable, signal } from '@angular/core';
import { SupaService } from './supa.service';
import { AuthChangeEvent, User, Session } from '@supabase/supabase-js';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  authChangeEvent = signal<AuthChangeEvent | null>(null);

  constructor(private supaService: SupaService) {
    this.supaService.client.auth.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
      this.authChangeEvent.set(event);
    });
  }

  getSession(): Observable<Session | null> {
    return from(this.supaService.client.auth.getSession()).pipe(
      map(({ data }) => data.session)
    );
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.supaService.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signInWithOtp(email: string): Promise<void> {
    const { error } = await this.supaService.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supaService.client.auth.signOut();
    if (error) throw error;
  }
}
