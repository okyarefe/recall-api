import { Body, Controller, Post } from '@nestjs/common';
import { QaService } from './qa.service';

const TEMP_USER_ID = '00000000-0000-0000-0000-000000000000';

@Controller('ask')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post()
  ask(@Body('question') question: string) {
    return this.qaService.ask(TEMP_USER_ID, question);
  }
}
