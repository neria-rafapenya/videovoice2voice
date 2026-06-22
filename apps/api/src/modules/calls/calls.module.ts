import { Module } from '@nestjs/common'
import { CallsController } from './calls.controller'
import { CallsService } from './calls.service'
import { LivekitModule } from '../livekit/livekit.module'

@Module({
  imports: [LivekitModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
