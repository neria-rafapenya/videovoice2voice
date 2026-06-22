import { Module } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { CallsModule } from './modules/calls/calls.module'
import { LivekitModule } from './modules/livekit/livekit.module'

@Module({
  imports: [AuthModule, CallsModule, LivekitModule],
})
export class AppModule {}
