import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from '../storage.service';
import { Injectable } from '@nestjs/common';
import { requireSecret } from '@orbitox/config';

@Injectable()
export class S3Adapter implements StorageProvider {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'ORBITOX_STORAGE_KEY',
        secretAccessKey: requireSecret('AWS_SECRET_ACCESS_KEY', { minBytes: 16 }),
      },
    });
    this.bucket = process.env.S3_BUCKET_NAME || 'orbitox-storage';
  }

  async upload(file: Buffer, path: string, mimeType: string, contextId: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: mimeType,
      Metadata: {
        contextId,
      },
      // In a real implementation, we would use SSE-KMS here
    });

    await this.s3.send(command);
    return `s3://${this.bucket}/${path}`;
  }

  async download(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const response = await this.s3.send(command);
    
    if (!response.Body) {
      throw new Error('File not found');
    }
    
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    await this.s3.send(command);
  }

  async getSignedUrl(path: string, expiresInSeconds: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async getSignedUploadUrl(path: string, mimeType: string, expiresInSeconds: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      ContentType: mimeType,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
