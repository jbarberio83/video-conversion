import { Injectable } from '@angular/core';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { BehaviorSubject } from "rxjs";
import { FFMessageLoadConfig } from "@ffmpeg/ffmpeg/dist/esm/types";

@Injectable({ providedIn: 'root' })
export class VideoConversionService {
  message = new BehaviorSubject('');
  conversionTime = new BehaviorSubject('');
  convertedVideoSrc = new BehaviorSubject('');
  convertedBlob: Blob | null = null; 
  ffmpeg!: FFmpeg;

  async loadFFmpeg(isMultiThreadOption: boolean) {
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('log', ({ message }) => {
      this.message.next( message)
    });
    const config = await this.getMultiThreadConfig();
    try {
      await this.ffmpeg.load(config);
    } catch (error) {
      console.error(error);
    }
  }
  private async getSingleThreadConfig(): Promise<FFMessageLoadConfig> {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    return {
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
      classWorkerURL: 'assets/ffmpeg/worker.js'
    };
  }
  private async getMultiThreadConfig(): Promise<FFMessageLoadConfig> {
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
    return {
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
      classWorkerURL: 'assets/ffmpeg/worker.js', // Asegúrate de que esta ruta es correcta
      workerURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        'text/javascript'
      ),
    };
}
  async convert(recordedBlobs: Blob[]) {
    this.convertedVideoSrc.next('');
    if (!this.checkIfFmpegLoaded()) {
      return;
    }
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const name = 'input.webm';
    await this.ffmpeg.writeFile(name, await fetchFile(blob));
    const startTime = performance.now();

    const maxSize = '10M'; // 50 Megabytes

    await this.ffmpeg.exec([
      '-i', name,
      '-c:v', 'libx264',
      '-s', '1280x720',
      '-crf', '28',   
      '-preset', 'ultrafast', // O intenta 'veryfast' si superfast sigue fallando
      '-b:v', '2000k',
      '-threads', '2',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);  

    const endTime = performance.now();
    const diffTime = ((endTime - startTime) / 1000).toFixed(2);
    this.conversionTime.next(`Conversion time: ${diffTime} s`);

    const data = (await this.ffmpeg.readFile('output.mp4')) as any;
    this.convertedBlob = new Blob([data.buffer], { type: 'video/mp4' });

    // Guardar la URL del blob convertido
    this.convertedVideoSrc.next(URL.createObjectURL(this.convertedBlob));
  }

  // Método para obtener el tamaño del archivo convertido
  getConvertedFileSize(): string {
    if (this.convertedBlob) {
      return (this.convertedBlob.size / 1024 / 1024).toFixed(2);  // Convertimos a MB
    }
    return '0';
  }

  private checkIfFmpegLoaded() {
    if (this.ffmpeg.loaded) {
      this.message.next('FFmpeg is loaded and ready to use.');
      return true;
    } else {
      this.message.next('FFmpeg failed to load.');
      return false;
    }
  }
}
