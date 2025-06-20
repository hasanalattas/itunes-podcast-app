import { Controller, Get, Query, Logger } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PodcastInterface } from './interfaces/podcast.interface';

@Controller('api/podcasts')
export class PodcastsController {
  private readonly logger = new Logger(PodcastsController.name);

  constructor(private readonly podcastsService: PodcastsService) {}

  @Get('search')
  async search(@Query() query: SearchQueryDto): Promise<PodcastInterface[]> {
    this.logger.log(`received search request for term: ${query.term}`);
    return this.podcastsService.searchAndStore(query.term);
  }
}
