import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './google-auth.guard';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
// Our JWT guard; aliased so it isn't confused with Passport's AuthGuard
import { AuthGuard as JwtAuthGuard } from './auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
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
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    console.log('[never] googleLogin handler ran (should not happen)');
  }

  // Step 2: Google redirects back here with ?code=...
  // The guard exchanges the code, calls GoogleStrategy.validate(), sets req.user.
  // The browser navigated here (not a fetch), so we set the refresh cookie and
  // send it back to the frontend, which then calls /auth/refresh for an access token.
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
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

  // The guard verifies the access token and puts its payload on req.user,
  // so the id comes from the token, never from the client's URL/body.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // No JwtAuthGuard: the user must be able to log out even with an expired
  // access token. The refresh cookie identifies the session.
  // Always 204: with no cookie or an unknown token, they're logged out anyway.
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined>;
    const rawToken = cookies.refresh_token;
    if (rawToken) {
      await this.authService.logout(rawToken);
    }

    res.clearCookie('refresh_token', this.refreshCookieOptions());
  }

  private setRefreshCookie(res: Response, token: string) {
    const days = this.configService.getOrThrow<number>(
      'jwt.refreshExpiresInDays',
    );

    res.cookie('refresh_token', token, {
      ...this.refreshCookieOptions(),
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  // Shared by set and clear: the browser only deletes a cookie if path etc. match
  private refreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.getOrThrow<boolean>('app.isDeployed'),
      sameSite: 'lax',
      path: '/auth',
    };
  }
}
