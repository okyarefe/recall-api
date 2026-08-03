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

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(signInDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Unauthorized');
    }

    const payload = {
      id: user.id,
      email: signInDto.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
