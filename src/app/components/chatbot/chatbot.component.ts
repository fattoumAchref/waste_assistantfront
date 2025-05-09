import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

interface ApiResponse {
  response: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  private apiUrl = 'http://localhost:8000/chat';
  private typingSpeed = 20; // Reduced typing speed
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Add welcome message
    this.messages.push({
      text: 'Hello! I am your Waste Assistant. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    console.error('API Error:', error);
    if (error.status === 422) {
      return 'Invalid input. Please make sure your question is clear and try again.';
    } else if (error.status === 500) {
      return 'The server is having trouble processing your request. Please try again in a few moments.';
    } else if (error.status === 0) {
      return 'Unable to connect to the server. Please check if the server is running and try again.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  private formatResponse(text: string): string {
    // Split the text into paragraphs and remove empty lines
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    // Format each paragraph
    return paragraphs.map(paragraph => {
      // Check if it's a numbered step
      if (/^\d+\./.test(paragraph)) {
        // Format numbered steps with line breaks between them
        const [number, ...content] = paragraph.split('.');
        return `<div class="step"><span class="step-number">${number}.</span>${content.join('.')}</div><br>`;
      }
      return `<p>${paragraph}</p>`;
    }).join('\n');
  }

  private async typeMessage(message: ChatMessage): Promise<void> {
    const fullText = message.text;
    message.text = '';
    message.isTyping = true;

    const formattedText = this.formatResponse(fullText);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedText;
    const textContent = tempDiv.textContent || '';

    // Type faster for longer messages
    const speed = Math.min(this.typingSpeed, 1000 / textContent.length);

    for (let i = 0; i < textContent.length; i++) {
      if (i % 3 === 0) { // Only update every 3 characters for better performance
        message.text = textContent.substring(0, i + 1);
        await new Promise(resolve => setTimeout(resolve, speed));
      }
    }

    message.text = formattedText;
    message.isTyping = false;
  }

  sendMessage(): void {
    if (this.userInput.trim() === '') return;

    const userMessage = this.userInput;
    
    // Add user message
    this.messages.push({
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    });

    this.isLoading = true;
    this.userInput = ''; // Clear input immediately

    // Make API call to backend with prompt as input
    this.http.post<ApiResponse>(this.apiUrl, { prompt: userMessage })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response) => {
          if (!response || !response.response) {
            throw new Error('Invalid response from server');
          }
          
          const botMessage: ChatMessage = {
            text: response.response,
            isUser: false,
            timestamp: new Date()
          };
          
          this.messages.push(botMessage);
          this.isLoading = false;
          await this.typeMessage(botMessage);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error:', error);
          const errorMessage = this.getErrorMessage(error);
          this.messages.push({
            text: errorMessage,
            isUser: false,
            timestamp: new Date()
          });
          this.isLoading = false;
        }
      });
  }
}
