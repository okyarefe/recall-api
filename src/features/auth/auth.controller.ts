import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('signup')
  signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  @Post('signin')
  signIn(@Body() body: SignInDto) {
    return this.authService.signIn(body);
  }

  // Step 1 of Google login: the guard redirects the browser to Google.
  // This handler body never runs.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    console.log('[never] googleLogin handler ran (should not happen)');
  }

  // Step 2: Google redirects back here with ?code=...
  // The guard exchanges the code, calls GoogleStrategy.validate(), sets req.user.
  // The browser navigated here (not a fetch), so we set the refresh cookie and
  // send it back to the frontend, which then calls /auth/refresh for an access token.
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    console.log('[6] googleCallback handler, req.user =', req.user);
    // req.user is whatever GoogleStrategy.validate() returned: a User from our DB
    const user = req.user as User;

    const refreshToken = await this.authService.createRefreshToken(user);
    this.setRefreshCookie(res, refreshToken);

    res.redirect(this.configService.getOrThrow<string>('app.frontendUrl'));
  }

  // The browser sends the refresh_token cookie automatically (Path=/auth).
  // passthrough: we set a cookie on res but still return the body normally.
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string | undefined>;
    const rawToken = cookies.refresh_token;
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken } =
      await this.authService.refresh(rawToken);
    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  private setRefreshCookie(res: Response, token: string) {
    const days = this.configService.getOrThrow<number>(
      'jwt.refreshExpiresInDays',
    );

    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.configService.getOrThrow<boolean>('app.isDeployed'),
      sameSite: 'lax',
      path: '/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }
}
