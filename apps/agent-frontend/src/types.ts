export interface FileItem {
  name: string;
  size: number;
  cid: string;
  status: 'uploading' | 'complete' | 'error';
}
