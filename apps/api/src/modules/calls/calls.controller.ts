import { Body, Controller, Param, Post } from '@nestjs/common'
import { CallsService } from './calls.service'
import { TokenRequestDto } from './dto/token-request.dto'
import { StartTranslationDto } from './dto/start-translation.dto'

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  create() {
    return this.callsService.createCall()
  }

  @Post(':callId/token')
  getToken(@Param('callId') callId: string, @Body() dto: TokenRequestDto) {
    return this.callsService.getLiveKitToken(callId, dto.participantId, dto.participantName)
  }

  @Post(':callId/translation/start')
  startTranslation(@Param('callId') callId: string, @Body() dto: StartTranslationDto) {
    return this.callsService.startTranslation(callId, dto.sourceLanguage, dto.targetLanguage)
  }
}
