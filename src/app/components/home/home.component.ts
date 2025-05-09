import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  features = [
    {
      title: 'AI-Powered Waste Detection',
      description: 'Real-time waste detection and classification using drone imagery and advanced AI algorithms',
      icon: 'fa-drone'
    },
    {
      title: 'Smart Waste Classification',
      description: 'Automated waste sorting and categorization for efficient recycling and disposal',
      icon: 'fa-recycle'
    },
    {
      title: 'Intelligent Assistant',
      description: 'Get instant solutions and guidance for waste management through our AI chatbot',
      icon: 'fa-robot'
    },
    {
      title: 'Environmental Impact',
      description: 'Track and analyze your contribution to environmental sustainability',
      icon: 'fa-leaf'
    }
  ];

  statistics = [
    { value: '95%', label: 'Detection Accuracy' },
    { value: '24/7', label: 'Real-time Monitoring' },
    { value: '1000+', label: 'Waste Types Identified' },
    { value: '50+', label: 'Cities Covered' }
  ];

  constructor() { }

  ngOnInit(): void {
    // Initialize any necessary data or services
  }

  isChatbotOpen = false;

  openChatbot(): void {
    this.isChatbotOpen = true;
  }

  closeChatbot(): void {
    this.isChatbotOpen = false;
  }
} 