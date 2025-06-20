import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PodcastsController } from './podcasts.controller';
import { PodcastsService } from './podcasts.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [PodcastsController],
  providers: [PodcastsService],
})
export class PodcastsModule {}
