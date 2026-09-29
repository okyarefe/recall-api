import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { QueryFailedError, Repository } from 'typeorm';
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
    private jwtService: JwtService,
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
