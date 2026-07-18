import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';

const TEMP_USER_ID = '00000000-0000-0000-0000-000000000000';

@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  create(@Body() createEntryDto: CreateEntryDto) {
    return this.entriesService.create(TEMP_USER_ID, createEntryDto);
  }

  @Get()
  findAll() {
    return this.entriesService.findAll(TEMP_USER_ID);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entriesService.findOne(TEMP_USER_ID, id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entriesService.remove(TEMP_USER_ID, id);
  }
}
