import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface JwtPayload {
  id: number;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const { authorization } = request.headers;
    console.log('--', authorization);
    const token = authorization?.split(' ')[1];
    console.log('token', token);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      });
      request.user = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
