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
  private typingSpeed = 5; // Faster typing speed
  private destroy$ = new Subject<void>();
  private maxRetries = 2;
  private currentRetry = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
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
    if (!text) return '';
    
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

    // Faster typing speed for longer messages
    const speed = Math.min(this.typingSpeed, 300 / textContent.length);

    // Larger chunks for faster updates
    const chunkSize = Math.max(5, Math.floor(textContent.length / 20));
    for (let i = 0; i < textContent.length; i += chunkSize) {
      message.text = textContent.substring(0, Math.min(i + chunkSize, textContent.length));
      await new Promise(resolve => setTimeout(resolve, speed));
    }

    message.text = formattedText;
    message.isTyping = false;
  }

  private async retryRequest(userMessage: string): Promise<void> {
    if (this.currentRetry < this.maxRetries) {
      this.currentRetry++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Shorter retry delay
      this.sendMessage(userMessage);
    } else {
      this.messages.push({
        text: 'I apologize, but I\'m having trouble connecting to the server. Please try again later.',
        isUser: false,
        timestamp: new Date()
      });
      this.isLoading = false;
      this.currentRetry = 0;
    }
  }

  sendMessage(message?: string): void {
    const userMessage = message || this.userInput;
    if (userMessage.trim() === '') return;

    // Add user message
    this.messages.push({
      text: userMessage,
      isUser: true,
      timestamp: new Date()
    });

    this.isLoading = true;
    if (!message) {
      this.userInput = ''; // Clear input only if it's a new message
    }

    // Make API call to backend with prompt as input
    this.http.post<ApiResponse>(this.apiUrl, { prompt: userMessage })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response) => {
          try {
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
            this.currentRetry = 0;
            await this.typeMessage(botMessage);
          } catch (error) {
            console.error('Error processing response:', error);
            this.retryRequest(userMessage);
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error:', error);
          if (error.status === 0 || error.status === 500) {
            this.retryRequest(userMessage);
          } else {
            const errorMessage = this.getErrorMessage(error);
            this.messages.push({
              text: errorMessage,
              isUser: false,
              timestamp: new Date()
            });
            this.isLoading = false;
            this.currentRetry = 0;
          }
        }
      });
  }
}
