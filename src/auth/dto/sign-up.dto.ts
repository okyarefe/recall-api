import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  @MaxLength(32)
  password!: string;
}
