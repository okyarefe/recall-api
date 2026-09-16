import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { QaService } from './qa.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('ask')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post()
  ask(@CurrentUser('id') userId: string, @Body('question') question: string) {
    return this.qaService.ask(userId, question);
  }
}
