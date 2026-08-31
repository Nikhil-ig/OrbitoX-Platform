export type MediaFolderType = 'products' | 'banners' | 'logos' | 'pages' | 'general';

export interface StoreMediaItem {
  id: string;
  storeId: string;
  tenantId: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  folder: MediaFolderType;
  altText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadPayload {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder?: MediaFolderType;
  altText?: string;
  dataBase64?: string;
}
