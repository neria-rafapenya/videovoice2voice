import { Body, Controller, Headers, Param, Post } from '@nestjs/common'
import { CallsService } from './calls.service'
import { TokenRequestDto } from './dto/token-request.dto'
import { StartTranslationDto } from './dto/start-translation.dto'

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  create(@Headers('authorization') authorization: string) {
    return this.callsService.createCall(extractAccessToken(authorization))
  }

  @Post(':callId/token')
  getToken(
    @Param('callId') callId: string,
    @Body() dto: TokenRequestDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.callsService.getLiveKitToken(
      extractAccessToken(authorization),
      callId,
      dto.participantId,
      dto.participantName,
    )
  }

  @Post(':callId/translation/start')
  startTranslation(
    @Param('callId') callId: string,
    @Body() dto: StartTranslationDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.callsService.startTranslation(
      extractAccessToken(authorization),
      callId,
      dto.sourceLanguage,
      dto.targetLanguage,
    )
  }
}

function extractAccessToken(authorization?: string) {
  if (!authorization) {
    return ''
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? ''
}
