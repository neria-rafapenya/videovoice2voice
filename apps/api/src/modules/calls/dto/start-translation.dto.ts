import { IsIn } from 'class-validator'

export class StartTranslationDto {
  @IsIn(['es', 'en'])
  sourceLanguage!: 'es' | 'en'

  @IsIn(['es', 'en'])
  targetLanguage!: 'es' | 'en'

  @IsIn(['male', 'female'])
  ttsVoice!: 'male' | 'female'
}
