import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

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
export class ChatbotComponent implements OnInit {
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  private apiUrl = 'http://localhost:8000/chat';
  private typingSpeed = 30; // milliseconds per character

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Add welcome message
    this.messages.push({
      text: 'Hello! I am your Waste Assistant. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 422) {
      return 'Invalid input. Please make sure your question is clear and try again.';
    } else if (error.status === 500) {
      return 'The server is having trouble processing your request. This might be due to network issues or server problems. Please try again in a few moments.';
    } else if (error.status === 0) {
      return 'Unable to connect to the server. Please check if the server is running and try again.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  private formatResponse(text: string): string {
    // Split the text into paragraphs
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    // Format each paragraph
    return paragraphs.map(paragraph => {
      // Check if it's a numbered step
      if (/^\d+\./.test(paragraph)) {
        // Format numbered steps
        const [number, ...content] = paragraph.split('.');
        return `<div class="step"><span class="step-number">${number}.</span>${content.join('.')}</div>`;
      }
      return `<p>${paragraph}</p>`;
    }).join('');
  }

  private async typeMessage(message: ChatMessage): Promise<void> {
    const fullText = message.text;
    message.text = '';
    message.isTyping = true;

    const formattedText = this.formatResponse(fullText);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedText;
    const textContent = tempDiv.textContent || '';

    for (let i = 0; i < textContent.length; i++) {
      message.text = textContent.substring(0, i + 1);
      await new Promise(resolve => setTimeout(resolve, this.typingSpeed));
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
      .subscribe({
        next: async (response) => {
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
