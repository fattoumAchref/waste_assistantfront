import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Detection {
  name: string;
  conf: number;
  coords: [number, number, number, number];
  status?: string;
  caption?: string | null;
  weight_g?: number;
  material?: string;
  state?: string;
  contamination?: string;
}

interface PredictionResponse {
  detections?: Detection[];
  original_image?: string;
  report?: string;
}

@Component({
  selector: 'app-detection',
  templateUrl: './detection.component.html',
  styleUrls: ['./detection.component.css']
})
export class DetectionComponent {
  private apiUrl = 'http://localhost:5001/detect';
  isAnalyzing: boolean = false;
  detections: Detection[] = [];
  selectedImage: string | null = null;
  analysisProgress: number = 0;
  isDragover: boolean = false;
  canvasImage: HTMLImageElement | null = null;
  error: string | null = null;
  analysisReport: string | null = null;

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
      this.handleImageFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handleImageFile(file);
    }
  }

  private handleImageFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.error = 'Please upload an image file (JPEG, PNG)';
      return;
    }

    this.selectedImage = URL.createObjectURL(file);
    this.analyzeImage(file);
  }

  analyzeImage(file: File): void {
    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.detections = [];
    this.error = null;
    this.analysisReport = null;

    // Create preview
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
    }, 300);

    this.http.post<PredictionResponse>(this.apiUrl, formData, { 
      withCredentials: true 
    }).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.analysisProgress = 100;

        console.log("response from back",response)

        if (!response) {
          console.error('Empty response from server');
          this.error = 'Server returned empty response';
          return;
        }

        this.detections = response.detections || [];
        this.analysisReport = response.report || "No analysis report available";
        
        console.log('Processed detections:', this.detections);
        this.drawDetections();
        this.isAnalyzing = false;
      },
      error: (err) => {
        clearInterval(progressInterval);
        console.error('Error analyzing image:', err);
        this.error = 'Analysis failed. Please try again.';
        this.isAnalyzing = false;
      }
    });
  }

  private drawDetections(): void {
    if (!this.canvasImage || !this.selectedImage) return;

    const canvas = document.getElementById('detectionCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image
    canvas.width = this.canvasImage.width;
    canvas.height = this.canvasImage.height;

    // Draw the image
    ctx.drawImage(this.canvasImage, 0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    this.detections.forEach(detection => {
      const coords = detection.coords;
      const [x1, y1, x2, y2] = coords;
      const width = x2 - x1;
      const height = y2 - y1;

      // Draw rectangle
      ctx.strokeStyle = '#FF3D00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, width, height);

      // Draw label background
      ctx.fillStyle = '#FF3D00';
      const text = `${detection.name} (${(detection.conf * 100).toFixed(0)}%)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x1 - 1, y1 - 25, textWidth + 10, 20);

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.fillText(text, x1 + 4, y1 - 10);
    });
  }

  formatConfidence(confidence: number): string {
    return `${(confidence * 100).toFixed(0)}%`;
  }

  formatWeight(weight?: number): string {
    if (!weight) return 'N/A';
    return `${weight.toFixed(1)} g`;
  }
}