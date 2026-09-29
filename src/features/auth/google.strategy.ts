import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.getOrThrow<string>('google.clientId'),
      clientSecret: config.getOrThrow<string>('google.clientSecret'),
      callbackURL: config.getOrThrow<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
    console.log('[0] GoogleStrategy created and registered as "google"');
  }

  // Called by Passport after Google sends the user back and the code is exchanged.
  // Whatever this returns becomes req.user.
  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    console.log(
      '[3] GoogleStrategy.validate, got profile for:',
      profile.displayName,
    );
    const user = await this.authService.findOrCreateGoogleUser(profile);
    console.log('[5] validate returning user, this becomes req.user:', user.id);
    return user;
  }
}
