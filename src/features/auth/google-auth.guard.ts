import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Same as AuthGuard('google'), but always shows Google's account chooser,
// so after logging out of our app the user can pick a different account.
// It doesn't log the user out of Google.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  // Passed to passport.authenticate('google', options);
  // the strategy adds it to the Google URL as &prompt=select_account
  getAuthenticateOptions() {
    return { prompt: 'select_account' };
  }
}
