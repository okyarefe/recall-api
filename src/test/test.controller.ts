import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../features/auth/auth.guard';

@Controller('test')
export class TestController {
  @UseGuards(AuthGuard)
  @Get()
  test() {
    return 'test';
  }
}
