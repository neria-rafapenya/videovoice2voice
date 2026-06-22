import { IsString, MinLength } from 'class-validator'

export class TokenRequestDto {
  @IsString()
  @MinLength(1)
  participantId!: string

  @IsString()
  @MinLength(1)
  participantName!: string
}
