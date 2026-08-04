import { FileService } from './file.service';
import { StorageService } from '@orbitox/core';

describe('FileService', () => {
  let service: FileService;
  let mockStorageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    mockStorageService = {
      upload: jest.fn().mockResolvedValue('uploads/ctx-1/file.png'),
      getSignedUrl: jest.fn().mockResolvedValue('https://s3.aws.com/signed-file'),
      delete: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new FileService(mockStorageService);
  });

  it('should sanitize filename and call storage upload', async () => {
    const buffer = Buffer.from('test');
    const path = await service.uploadFile(buffer, 'my unsafe file name!.png', 'image/png', 'ctx-123');

    expect(path).toContain('uploads/ctx-123/');
    expect(path).toContain('my_unsafe_file_name_.png');
    expect(mockStorageService.upload).toHaveBeenCalledTimes(1);
  });

  it('should delegate signed url retrieval to storage service', async () => {
    const url = await service.getFileUrl('uploads/file.png', 3600);
    expect(url).toBe('https://s3.aws.com/signed-file');
    expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith('uploads/file.png', 3600);
  });
});
