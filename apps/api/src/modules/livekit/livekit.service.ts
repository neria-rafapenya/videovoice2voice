import { Injectable } from '@nestjs/common'
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk'

@Injectable()
export class LivekitService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY ?? 'devkey'
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET ?? 'secret'
  private readonly livekitUrl = process.env.LIVEKIT_URL ?? 'ws://localhost:7880'
  private readonly translatorAgentName = process.env.LIVEKIT_TRANSLATOR_AGENT_NAME ?? 'translator-agent'

  async createToken(roomName: string, identity: string, name?: string) {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name,
      ttl: '10m',
    })

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    return {
      livekitUrl: this.livekitUrl,
      token: await token.toJwt(),
    }
  }

  async dispatchTranslatorAgent(
    roomName: string,
    metadata: {
      callId: string
      sourceLanguage: 'es' | 'en'
      targetLanguage: 'es' | 'en'
    },
  ) {
    const dispatchClient = new AgentDispatchClient(this.livekitUrl, this.apiKey, this.apiSecret)

    return dispatchClient.createDispatch(roomName, this.translatorAgentName, {
      metadata: JSON.stringify(metadata),
    })
  }
}
