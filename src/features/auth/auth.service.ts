import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { SignUpDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/sign-in.dto';
import { Profile } from 'passport-google-oauth20';
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password } = signUpDto;
    const salt = await bcrypt.genSalt();

    const hashedPassword = await bcrypt.hash(password, salt);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
    });

    try {
      const userSaved = await this.userRepository.save(user);
      console.log('user saved', userSaved);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Email already in use.');
      }
      throw error;
    }
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.userRepository.findOneBy({
      email: signInDto.email,
    });

    // Google-only users have no password, so they can't use this route
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(signInDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.createAccessToken(user);
  }

  // Used by both email/password sign-in and Google sign-in
  async createAccessToken(user: User) {
    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  // Returns the raw token for the cookie; only its SHA-256 hash is stored
  async createRefreshToken(user: User): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');

    const days = this.configService.getOrThrow<number>(
      'jwt.refreshExpiresInDays',
    );
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: this.hashToken(rawToken),
      expiresAt,
    });

    return rawToken;
  }

  // Swaps a valid refresh token for a new access token + a new refresh token (rotation)
  async refresh(rawToken: string) {
    // relations: also load the user row (JOIN) — we need user.email for the JWT
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
      relations: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke only if still unrevoked, so two parallel requests can't both use it
    const result = await this.refreshTokenRepository.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (result.affected === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshToken = await this.createRefreshToken(stored.user);
    const { accessToken } = await this.createAccessToken(stored.user);

    return { accessToken, refreshToken };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async findOrCreateGoogleUser(profile: Profile): Promise<User> {
    console.log('[4] findOrCreateGoogleUser, google id', profile.id);
    console.log('Profile from Google', profile);

    const existingGoogleUser = await this.userRepository.findOneBy({
      googleId: profile.id,
    });

    if (existingGoogleUser) {
      console.log('[4a] found existing Google User');
      return existingGoogleUser;
    }

    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    const existingEmailUser = await this.userRepository.findOneBy({ email });

    if (existingEmailUser) {
      console.log('[4b] linking Google to existing email user');
      existingEmailUser.googleId = profile.id;
      return this.userRepository.save(existingEmailUser);
    }

    console.log('[4c] creating new user from Google');
    const newUser = this.userRepository.create({
      email,
      googleId: profile.id,
      password: null,
    });

    return this.userRepository.save(newUser);
  }
}
