import { Injectable, Inject, Logger } from '@nestjs/common';
import { SecretsService } from '../security/secrets.service';

export interface StorageProvider {
  upload(file: Buffer, path: string, mimeType: string, contextId: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;
  getSignedUploadUrl(path: string, mimeType: string, expiresInSeconds?: number): Promise<string>;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject('STORAGE_PROVIDER') private readonly provider: StorageProvider,
  ) {}

  async upload(file: Buffer, path: string, mimeType: string, contextId: string): Promise<string> {
    this.logger.debug(`Uploading file to ${path}`);
    return this.provider.upload(file, path, mimeType, contextId);
  }

  async download(path: string): Promise<Buffer> {
    return this.provider.download(path);
  }

  async delete(path: string): Promise<void> {
    this.logger.debug(`Deleting file at ${path}`);
    return this.provider.delete(path);
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    return this.provider.getSignedUrl(path, expiresInSeconds);
  }

  async getSignedUploadUrl(path: string, mimeType: string, expiresInSeconds = 3600): Promise<string> {
    return this.provider.getSignedUploadUrl(path, mimeType, expiresInSeconds);
  }
}
