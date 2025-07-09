declare module 'file-type-js' {
  interface FileTypes {
    [key: string]: number[] | {
      offset: number;
      length: number;
      check(arr: Uint8Array): boolean;
    };
  }

  const fileType: {
    fileTypes: FileTypes;
    blob2ArrayBuffer(blob: Blob): Promise<ArrayBuffer>;
    buffer2Array(buf: Buffer): Uint8Array;
  };

  export = fileType;
}
