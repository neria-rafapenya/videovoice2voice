import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { CallsModule } from './modules/calls/calls.module'
import { LivekitModule } from './modules/livekit/livekit.module'

@Module({
  imports: [DatabaseModule, AuthModule, CallsModule, LivekitModule],
})
export class AppModule {}
