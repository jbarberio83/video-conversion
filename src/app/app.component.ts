import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { VideoConversionService } from "./video-conversion.service";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatButtonModule, MatButtonToggleModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  @ViewChild('videoRef') private videoRef!: ElementRef<HTMLVideoElement>;
  recordedBlobs: Blob[] = [];
  stream: MediaStream | null = null;
  mediaRecorder!: MediaRecorder | null;
  finalBlob!: Blob;
  originSrc!: string;
  fileSizeBefore = 'File size before conversion';
  fileSizeAfter = 'File size after conversion';
  isRecording = false;
  duration = 0;
  durationInterval!: any;
  isMultiThreadOption = false;
  constructor(
    private ngZone: NgZone,
    public videoConversionService: VideoConversionService) {
  }
  async ngOnInit() {
    this.videoConversionService.loadFFmpeg(this.isMultiThreadOption);
  }
  modeChanged() {
    this.videoConversionService.loadFFmpeg(this.isMultiThreadOption);
  }


  async onFileSelected(event: any) {
    const file = event.target.files[0];  // Obtenemos el archivo seleccionado
    if (file) {
      // Mostramos el tamaño del archivo antes de la conversión
      const fileSizeBefore = (file.size / 1024 / 1024).toFixed(2);  // Tamaño en MB
      this.fileSizeBefore = `File size before conversion: ${fileSizeBefore} MB`;

      // Guardamos la URL del archivo original para previsualizar el video
      this.originSrc = URL.createObjectURL(file);

      // Realizamos la conversión y después de que termine, actualizamos el tamaño del archivo convertido
      this.videoConversionService.convert([file]).then(() => {
        // Esperamos a que la conversión termine para obtener el tamaño del archivo resultante
        this.videoConversionService.convertedVideoSrc.subscribe(async (src) => {
          if (src) {
            const response = await fetch(src); // Hacemos una solicitud para obtener el archivo convertido
            const blob = await response.blob(); // Convertimos la respuesta en Blob
            const fileSizeAfter = (blob.size / 1024 / 1024).toFixed(2); // Calculamos el tamaño en MB
            this.fileSizeAfter = `File size after conversion: ${fileSizeAfter} MB`;
          }
        });
      });
    }
  }
}
