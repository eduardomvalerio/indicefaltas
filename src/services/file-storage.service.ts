import { Injectable } from '@angular/core';
import { SupaService } from './supa.service';

@Injectable({ providedIn: 'root' })
export class FileStorageService {
  constructor(private supaService: SupaService) {}

  /**
   * Faz upload para um bucket específico do Supabase Storage.
   */
  async upload(bucket: string, path: string, file: File): Promise<string> {
    const { error } = await this.supaService.client
      .storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      console.error('Erro no upload para o Supabase Storage:', error);
      throw error;
    }

    return path;
  }
}
