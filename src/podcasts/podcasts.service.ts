import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PodcastInterface } from './interfaces/podcast.interface';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PodcastsService {
  private readonly logger = new Logger(PodcastsService.name);
  private supabase: SupabaseClient;
  private itunesApiUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    this.itunesApiUrl = this.configService.get<string>(
      'ITUNES_SEARCH_API_URL',
      'https://itunes.apple.com/search',
    );

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        'supabase URL or Key is not defined in environment variables',
      );
      throw new InternalServerErrorException(
        'supabase configuration is missing.',
      );
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async searchAndStore(term: string): Promise<PodcastInterface[]> {
    try {
      this.logger.log(
        `searching iTunes for term: ${term} via ${this.itunesApiUrl}`,
      );
      const response = await firstValueFrom(
        this.httpService.get(this.itunesApiUrl, {
          params: { term, entity: 'podcast', media: 'podcast', limit: 20 },
        }),
      );
      const itunesData = response.data;
      if (!itunesData.results) {
        this.logger.warn(
          `no 'results' field in iTunes response for term: ${term}`,
        );
        return [];
      }

      const podcastsToStore: Omit<PodcastInterface, 'created_at'>[] =
        itunesData.results
          .filter((item: any) => item.kind === 'podcast' && item.trackId)
          .map((item: any) => ({
            trackId: item.trackId,
            artistName: item.artistName,
            collectionName: item.collectionName,
            trackName: item.trackName,
            feedUrl: item.feedUrl,
            artworkUrl100: item.artworkUrl100,
            artworkUrl600: item.artworkUrl600,
            releaseDate: item.releaseDate,
          }));

      if (podcastsToStore.length === 0) {
        this.logger.log(`no podcasts found or mapped for term: ${term}`);
        return [];
      }

      this.logger.log(
        `storing ${podcastsToStore.length} podcasts in Supabase.`,
      );
      const { data, error } = await this.supabase
        .from('podcasts')
        .upsert(podcastsToStore, { onConflict: 'trackId' })
        .select();

      if (error) {
        this.logger.error('Supabase error:', error.message, error.details);
        throw new InternalServerErrorException(
          `failed to store data in database: ${error.message}`,
        );
      }

      this.logger.log(
        `successfully stored and retrieved ${data?.length || 0} podcasts.`,
      );
      return (data as PodcastInterface[]) || [];
    } catch (error) {
      this.logger.error(
        `error in searchAndStore for term "${term}":`,
        error.stack || error,
      );
      const message =
        error.response?.data?.message ||
        error.message ||
        'an unknown error occurred.';
      throw new InternalServerErrorException(message);
    }
  }
}
