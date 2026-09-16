import { IsIn, IsNotEmpty, IsString, IsUrl, ValidateIf } from 'class-validator';

export class CreateEntryDto {
  @IsIn(['note', 'link'])
  type!: 'note' | 'link';

  @ValidateIf((dto: CreateEntryDto) => dto.type === 'note')
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ValidateIf((dto: CreateEntryDto) => dto.type === 'link')
  @IsUrl()
  sourceUrl?: string;
}
