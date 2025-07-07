import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';

export class FileServerManager {
  private static instance: FileServerManager | null = null;
  private server: http.Server | null = null;
  private currentPort: number | null = null;
  private isStarting: boolean = false;
  private startPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): FileServerManager {
    if (!FileServerManager.instance) {
      FileServerManager.instance = new FileServerManager();
    }
    return FileServerManager.instance;
  }

  async findAvailablePort(strategy: 'random' | 'increment' = 'random', startPort: number = 3001): Promise<number> {
    console.error(`Finding available port using ${strategy} strategy`);
    
    if (strategy === 'random') {
      const MIN_PORT = 3000;
      const MAX_PORT = 9000;
      const MAX_ATTEMPTS = 50;
      
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const port = Math.floor(Math.random() * (MAX_PORT - MIN_PORT)) + MIN_PORT;
        console.error(`Trying random port ${port} (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
        
        if (await this.isPortAvailable(port)) {
          console.error(`Found available random port: ${port}`);
          return port;
        }
      }
      
      throw new Error(`Could not find available port after ${MAX_ATTEMPTS} attempts`);
    } else {
      let port = startPort;
      const MAX_INCREMENT = 100;
      
      for (let i = 0; i < MAX_INCREMENT; i++) {
        console.error(`Trying port ${port}`);
        
        if (await this.isPortAvailable(port)) {
          console.error(`Found available port: ${port}`);
          return port;
        }
        
        port++;
      }
      
      throw new Error(`Could not find available port after trying ${MAX_INCREMENT} ports starting from ${startPort}`);
    }
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const tester = net.createServer()
        .once('error', (err: any) => {
          console.error(`Port ${port} test error:`, err.code);
          resolve(false);
        })
        .once('listening', () => {
          tester.close();
          resolve(true);
        })
        .listen(port);
    });
  }

  async ensureServerRunning(dataDir: string): Promise<void> {
    if (this.server) {
      console.error('File server already running');
      return;
    }

    if (this.isStarting && this.startPromise) {
      console.error('File server is already starting, waiting...');
      return this.startPromise;
    }

    this.isStarting = true;
    this.startPromise = this.startServer(dataDir);
    
    try {
      await this.startPromise;
    } finally {
      this.isStarting = false;
      this.startPromise = null;
    }
  }

  private async startServer(dataDir: string): Promise<void> {
    try {
      this.currentPort = await this.findAvailablePort('increment');
      
      return new Promise((resolve, reject) => {
        this.server = http.createServer((req, res) => {
          const url = new URL(req.url!, `http://localhost:${this.currentPort}`);
          
          if (url.pathname.startsWith('/download/')) {
            const fileName = url.pathname.replace('/download/', '');
            const filePath = path.join(dataDir, fileName);
            
            if (fs.existsSync(filePath)) {
              console.error(`Serving file: ${filePath}`);
              res.setHeader('Content-Type', 'text/csv');
              res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
              res.setHeader('Access-Control-Allow-Origin', '*');
              
              const fileStream = fs.createReadStream(filePath);
              fileStream.pipe(res);
            } else {
              console.error(`File not found: ${filePath}`);
              res.statusCode = 404;
              res.end('File not found');
            }
          } else if (url.pathname === '/list') {
            try {
              const files = fs.readdirSync(dataDir)
                .filter(file => file.endsWith('.csv'))
                .map(file => {
                  const filePath = path.join(dataDir, file);
                  const stats = fs.statSync(filePath);
                  return {
                    name: file,
                    size: stats.size,
                    created: stats.birthtime,
                    downloadUrl: `http://localhost:${this.currentPort}/download/${file}`
                  };
                });
              
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify(files, null, 2));
            } catch (error) {
              console.error('Error listing files:', error);
              res.statusCode = 500;
              res.end('Error listing files');
            }
          } else {
            res.statusCode = 404;
            res.end('Not found');
          }
        });

        this.server.on('error', (err) => {
          console.error('File server error:', err);
          reject(err);
        });

        this.server.listen(this.currentPort, () => {
          console.error(`File server running on http://localhost:${this.currentPort}`);
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to start file server:', error);
      throw error;
    }
  }

  async getDownloadUrl(fileName: string): Promise<string> {
    if (!this.server || !this.currentPort) {
      throw new Error('File server not running');
    }
    return `http://localhost:${this.currentPort}/download/${fileName}`;
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        console.error('Shutting down file server');
        this.server.close(() => {
          this.server = null;
          this.currentPort = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
