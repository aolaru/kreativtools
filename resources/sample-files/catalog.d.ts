export type SampleCategory = 'pdf' | 'images' | 'documents' | 'archives' | 'data' | 'audio-video';
export type SampleValidity = 'valid' | 'invalid' | 'edge';
export interface SampleFile {
  id: string;
  title: string;
  description: string;
  category: SampleCategory;
  format: string;
  filename: string;
  /** Intended or detected content type, not a guarantee of the hosting server's HTTP header. */
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  tags: string[];
  testScenario: string;
  expectedResult: string;
  validity: SampleValidity;
  access: 'free' | 'pro';
  sha256: string;
  /** Reserved for a future counting service; not collected or displayed today. */
  downloadCount?: number;
}
export interface SampleCatalog { version: 1; samples: SampleFile[] }
