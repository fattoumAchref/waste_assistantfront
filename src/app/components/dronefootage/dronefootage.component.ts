import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface DetectionResult {
  wasteType: string;
  confidence: number;
  location: {
    x: number;
    y: number;
  };
  imageUrl: string;
}

@Component({
  selector: 'app-dronefootage',
  templateUrl: './dronefootage.component.html',
  styleUrls: ['./dronefootage.component.css']
})
export class DronefootageComponent implements OnInit {
  isAnalyzing: boolean = false;
  detectionResults: DetectionResult[] = [];
  selectedImage: string | null = null;
  analysisProgress: number = 0;
  isDragover: boolean = false;
  private apiUrl = 'http://localhost:8000/analyze-drone';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Initialize component
  }

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

    const formData = new FormData();
    formData.append('image', file);

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.analysisProgress < 90) {
        this.analysisProgress += 10;
      }
    }, 500);

    this.http.post<DetectionResult[]>(this.apiUrl, formData)
      .subscribe({
        next: (results) => {
          clearInterval(progressInterval);
          this.analysisProgress = 100;
          this.detectionResults = results;
          this.isAnalyzing = false;
        },
        error: (error) => {
          clearInterval(progressInterval);
          console.error('Error analyzing image:', error);
          this.isAnalyzing = false;
          // Handle error appropriately
        }
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