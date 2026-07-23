import { Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.interface';
import { LocalDiskStorage } from './local-disk.storage';

@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: LocalDiskStorage }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
