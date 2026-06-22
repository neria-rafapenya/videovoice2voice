import { Module } from '@nestjs/common'
import { CallsController } from './calls.controller'
import { CallsService } from './calls.service'
import { LivekitModule } from '../livekit/livekit.module'
import { DatabaseModule } from '../../database/database.module'

@Module({
  imports: [LivekitModule, DatabaseModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
