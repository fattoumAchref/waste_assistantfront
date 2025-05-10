import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface DetectionResult {
  label: string;
  confidence: number;
  bounding_box: number[];
  volume_estimate: number;
  material?: string;
  state?: string;
  contamination?: string;
}

@Component({
  selector: 'app-detection',
  templateUrl: './detection.component.html',
  styleUrls: ['./detection.component.css']
})
export class DetectionComponent {
  isAnalyzing: boolean = false;
  detectionResults: DetectionResult[] = [];
  selectedImage: string | null = null;
  analysisProgress: number = 0;
  isDragover: boolean = false;
  errorMessage: string = '';
  private apiUrl = 'http://localhost:5001/detect';

  constructor(private http: HttpClient) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragover = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragover = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
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
      this.errorMessage = 'Please select an image file (JPG, PNG, JPEG)';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.selectedImage = e.target?.result as string;
      this.errorMessage = '';
      this.analyzeImage(file);
    };
    reader.onerror = () => {
      this.errorMessage = 'Error reading image file';
      this.selectedImage = null;
    };
    reader.readAsDataURL(file);
  }

  analyzeImage(file: File): void {
    this.isAnalyzing = true;
    this.analysisProgress = 0;
    this.detectionResults = [];
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('file', file);

    const progressInterval = setInterval(() => {
      if (this.analysisProgress < 90) {
        this.analysisProgress += 10;
      }
    }, 500);

    this.http.post(this.apiUrl, formData).subscribe({
      next: (response: any) => {
        clearInterval(progressInterval);
        this.analysisProgress = 100;
        console.log('Backend response:', response);
        
        if (response.error) {
          this.errorMessage = response.error;
          this.isAnalyzing = false;
          return;
        }
        
        this.processResults(response);
        this.isAnalyzing = false;
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.isAnalyzing = false;
        console.error('Error response:', error);
        
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to the server. Please check if the backend service is running.';
        } else if (error.error?.detail) {
          this.errorMessage = error.error.detail;
        } else {
          this.errorMessage = 'Error analyzing image. Please try again.';
        }
      }
    });
  }

  private processResults(response: any): void {
    console.log('Processing response:', response);

    // Handle YOLO detection results
    if (response && typeof response === 'object') {
      // Extract detection information from the response
      const detections: DetectionResult[] = [];
      
      // Check for YOLO format
      if (response[0] && typeof response[0] === 'object') {
        const yoloResult = response[0];
        if (yoloResult.boxes && Array.isArray(yoloResult.boxes)) {
          yoloResult.boxes.forEach((box: any) => {
            const detection: DetectionResult = {
              label: box.cls || 'Unknown',
              confidence: box.conf || 0,
              bounding_box: box.xyxy || [],
              volume_estimate: 0,
              material: 'plastic',
              state: 'clear',
              contamination: 'none'
            };
            detections.push(detection);
          });
        }
      }

      // If we found detections, use them
      if (detections.length > 0) {
        this.detectionResults = detections;
        return;
      }

      // Try other formats
      if (response.objects && Array.isArray(response.objects)) {
        this.detectionResults = response.objects.map((obj: any) => ({
          label: obj.label || obj.name || 'Unknown',
          confidence: obj.confidence || obj.score || 0,
          bounding_box: obj.bounding_box || obj.box || [],
          volume_estimate: obj.volume_estimate || 0,
          material: obj.material,
          state: obj.state,
          contamination: obj.contamination
        }));
      } else if (response.detections && Array.isArray(response.detections)) {
        this.detectionResults = response.detections.map((det: any) => ({
          label: det.label || det.name || 'Unknown',
          confidence: det.confidence || det.score || 0,
          bounding_box: det.bounding_box || det.box || [],
          volume_estimate: det.volume_estimate || 0,
          material: det.material,
          state: det.state,
          contamination: det.contamination
        }));
      } else {
        console.log('No valid detection format found in response');
        this.errorMessage = 'No objects detected in the image';
      }
    } else {
      console.log('Invalid response format');
      this.errorMessage = 'Invalid response from server';
    }

    if (response.report) {
      this.errorMessage = response.report;
    }

    console.log('Processed results:', this.detectionResults);
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