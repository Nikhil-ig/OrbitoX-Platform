import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@orbitox/core';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(private readonly storageService: StorageService) {}

  async uploadFile(buffer: Buffer, originalName: string, mimeType: string, contextId: string): Promise<string> {
    this.logger.log(`Uploading file ${originalName} of type ${mimeType} for context ${contextId}`);
    
    // Example: sanitize filename, check mime type, etc.
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `uploads/${contextId}/${Date.now()}_${sanitizedName}`;
    
    await this.storageService.upload(buffer, path, mimeType, contextId);
    return path;
  }

  async getFileUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    return this.storageService.getSignedUrl(path, expiresInSeconds);
  }

  async deleteFile(path: string, contextId: string): Promise<void> {
    await this.storageService.delete(path);
  }
}
