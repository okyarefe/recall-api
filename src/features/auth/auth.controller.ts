import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request) {
    console.log('[6] googleCallback handler, req.user =', req.user);
    // req.user is whatever GoogleStrategy.validate() returned: a User from our DB
    return this.authService.createAccessToken(req.user as User);
  }
}
