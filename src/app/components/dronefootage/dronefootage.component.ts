import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface DetectionResult {
  wasteType: string;
  confidence: number;
  bbox: [number, number, number, number];
  location: {
    x: number;
    y: number;
  };
  imageUrl: string;
  croppedImage: string;
}

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface PredictionResponse {
  detections: Detection[];
}

@Component({
  selector: 'app-dronefootage',
  templateUrl: './dronefootage.component.html',
  styleUrls: ['./dronefootage.component.css']
})
export class DronefootageComponent {
  private apiUrl = 'http://localhost:8001/predict';
  isAnalyzing: boolean = false;
  detectionResults: DetectionResult[] = [];
  selectedImage: string | null = null;
  analysisProgress: number = 0;
  isDragover: boolean = false;
  canvasImage: HTMLImageElement | null = null;
  error: string | null = null;
  private croppedImageCache: { [key: string]: string } = {};

  constructor(private http: HttpClient) { }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.selectedImage = URL.createObjectURL(file);
        this.analyzeImage(file);
      }
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedImage = URL.createObjectURL(file);
      this.analyzeImage(file);
    }
  }

  analyzeImage(file: File): void {
    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.detectionResults = [];
    this.error = null;
    this.croppedImageCache = {};

    // Create preview and load image for drawing
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        this.canvasImage = img;
        this.drawDetections();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.analysisProgress < 90) {
        this.analysisProgress += 10;
      }
    }, 500);

    this.http.post<PredictionResponse>(this.apiUrl, formData)
      .subscribe({
        next: async (response) => {
          clearInterval(progressInterval);
          this.analysisProgress = 100;

          // Process detections asynchronously
          const processedResults = await Promise.all(
            response.detections.map(async det => {
              const bbox = det.bbox;
              const croppedImage = await this.getDetectionImage(this.selectedImage || '', bbox);
              return {
                wasteType: det.label,
                confidence: det.confidence,
                bbox: bbox,
                location: {
                  x: bbox[0],
                  y: bbox[1]
                },
                imageUrl: this.selectedImage || '',
                croppedImage: croppedImage
              };
            })
          );

          this.detectionResults = processedResults;
          this.drawDetections();
          this.isAnalyzing = false;
        },
        error: (err) => {
          clearInterval(progressInterval);
          console.error('Error analyzing image:', err);
          this.error = 'Classification failed. Please try again.';
          this.isAnalyzing = false;
        }
      });
  }

  async getDetectionImage(imageUrl: string, bbox: [number, number, number, number]): Promise<string> {
    if (!imageUrl) return '';

    const cacheKey = `${imageUrl}-${bbox.join(',')}`;
    if (this.croppedImageCache[cacheKey]) {
      return this.croppedImageCache[cacheKey];
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;

      img.onload = () => {
        const [x1, y1, x2, y2] = bbox;
        const padding = 20;
        const width = x2 - x1;
        const height = y2 - y1;

        // Calculate padded coordinates
        const paddedX1 = Math.max(0, x1 - padding);
        const paddedY1 = Math.max(0, y1 - padding);
        const paddedX2 = Math.min(img.width, x2 + padding);
        const paddedY2 = Math.min(img.height, y2 + padding);
        const paddedWidth = paddedX2 - paddedX1;
        const paddedHeight = paddedY2 - paddedY1;

        // Set canvas size to maintain aspect ratio but fit within 150x150
        const displaySize = 150;
        let canvasWidth, canvasHeight;

        if (paddedWidth > paddedHeight) {
          canvasWidth = displaySize;
          canvasHeight = (paddedHeight / paddedWidth) * displaySize;
        } else {
          canvasHeight = displaySize;
          canvasWidth = (paddedWidth / paddedHeight) * displaySize;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw the padded area, scaled to fit our canvas
          ctx.drawImage(
            img,
            paddedX1, paddedY1, paddedWidth, paddedHeight, // source coordinates
            0, 0, canvasWidth, canvasHeight // destination coordinates
          );
          const dataUrl = canvas.toDataURL('image/jpeg');
          this.croppedImageCache[cacheKey] = dataUrl;
          resolve(dataUrl);
        } else {
          resolve('');
        }
      };

      img.onerror = () => {
        resolve('');
      };
    });
  }

  drawDetections(): void {
    if (!this.canvasImage || !this.selectedImage) return;

    const canvas = document.getElementById('detectionCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate aspect ratio and canvas dimensions
    const maxWidth = 800;
    const maxHeight = 600;
    let canvasWidth = this.canvasImage.width;
    let canvasHeight = this.canvasImage.height;
    let scale = 1;

    // Scale down if image is larger than max dimensions
    if (this.canvasImage.width > maxWidth || this.canvasImage.height > maxHeight) {
      scale = Math.min(maxWidth / this.canvasImage.width, maxHeight / this.canvasImage.height);
      canvasWidth = this.canvasImage.width * scale;
      canvasHeight = this.canvasImage.height * scale;
    }

    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas and draw scaled image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.canvasImage, 0, 0, canvasWidth, canvasHeight);

    // Draw detections with scaled coordinates
    this.detectionResults.forEach(det => {
    const [x1, y1, x2, y2] = det.bbox;
    const scaledX1 = x1 * scale;
    const scaledY1 = y1 * scale;
    const scaledX2 = x2 * scale;
    const scaledY2 = y2 * scale;
    const width = scaledX2 - scaledX1;
    const height = scaledY2 - scaledY1;

    // Draw bounding box
    ctx.strokeStyle = this.getConfidenceColor(det.confidence);
    ctx.lineWidth = 2;
    ctx.strokeRect(scaledX1, scaledY1, width, height);

    // Only keep waste type label
    ctx.fillStyle = this.getConfidenceColor(det.confidence);
    const text = `${det.wasteType}`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(scaledX1, scaledY1 - 20, textWidth + 10, 20);

    // Draw waste type text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.fillText(text, scaledX1 + 5, scaledY1 - 5);
  });
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FFC107';
    return '#F44336';
  }

  formatConfidence(confidence: number): string {
    return (confidence * 100).toFixed(1) + '%';
  }
}