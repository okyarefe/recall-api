import { Module } from '@nestjs/common';
import { AuthModule } from '../features/auth/auth.module';
import { TestController } from './test.controller';

@Module({
  imports: [AuthModule],
  controllers: [TestController],
})
export class TestModule {}
