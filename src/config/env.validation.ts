import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  OPENAI_API_KEY!: string;

  @ValidateIf(
    (vars: EnvironmentVariables) =>
      vars.NODE_ENV === Environment.Production ||
      vars.NODE_ENV === Environment.Staging,
  )
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS?: string;
}

export function validate(raw: Record<string, unknown>) {
  const parsed = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(parsed, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');

    throw new Error(
      `Invalid environment configuration for NODE_ENV=${String(raw.NODE_ENV)}:\n  - ${details}`,
    );
  }

  return parsed;
}
