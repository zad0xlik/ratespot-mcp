import * as fs from 'fs';
import * as path from 'path';
import * as fileType from 'file-type-js';
import * as iconv from 'iconv-lite';

export class FileAnalyzer {
  static getFileInfo(filePath: string) {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    const buffer = fs.readFileSync(filePath);
    
    // Detect MIME type
    let mimeType = this.getMimeTypeFromExtension(ext);
    if (fileType.fileTypes) {
      for (const [type, signature] of Object.entries(fileType.fileTypes)) {
        if (Array.isArray(signature) && 
            buffer.length >= signature.length &&
            signature.every((byte, i) => buffer[i] === byte)) {
          mimeType = `image/${type}`;
          break;
        }
      }
    }

    const isBinary = this.isBinaryFile(buffer);
    let encoding: string | undefined;

    // Try to detect encoding for text files
    if (!isBinary) {
      try {
        // Try UTF-8 first
        const content = buffer.toString('utf8');
        if (this.isValidUtf8(content)) {
          encoding = 'utf8';
        } else {
          // Try other common encodings
          const encodings = ['ascii', 'utf16le', 'latin1'];
          for (const enc of encodings) {
            try {
              iconv.decode(buffer, enc);
              encoding = enc;
              break;
            } catch {
              continue;
            }
          }
        }
      } catch {
        // If all encoding detection fails, default to binary
      }
    }

    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtimeMs,
      modified: stats.mtimeMs,
      mimeType,
      extension: ext,
      isBinary,
      encoding
    };
  }

  static readFile(filePath: string) {
    const info = this.getFileInfo(filePath);
    
    if (info.isBinary) {
      throw new Error('Cannot read binary files');
    }

    const buffer = fs.readFileSync(filePath);
    const encoding = info.encoding || 'utf8';
    const content = iconv.decode(buffer, encoding);

    return {
      content,
      encoding,
      info
    };
  }

  private static getMimeTypeFromExtension(ext: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.md': 'text/markdown',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  private static isBinaryFile(buffer: Buffer): boolean {
    // Check for common binary file signatures
    const signatures = [
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0xFF, 0xD8, 0xFF],       // JPEG
      [0x47, 0x49, 0x46],       // GIF
      [0x25, 0x50, 0x44, 0x46], // PDF
      [0x50, 0x4B, 0x03, 0x04], // ZIP
    ];

    for (const sig of signatures) {
      if (buffer.length >= sig.length && 
          sig.every((byte, i) => buffer[i] === byte)) {
        return true;
      }
    }

    // Check for high concentration of non-text bytes
    const sampleSize = Math.min(buffer.length, 512);
    let nonTextCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      if ((byte < 0x09) || 
          (byte > 0x0D && byte < 0x20) || 
          (byte > 0x7E)) {
        nonTextCount++;
      }
    }

    return (nonTextCount / sampleSize) > 0.3;
  }

  private static isValidUtf8(str: string): boolean {
    try {
      Buffer.from(str, 'utf8').toString('utf8');
      return true;
    } catch {
      return false;
    }
  }
}
