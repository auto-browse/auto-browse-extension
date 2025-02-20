export interface ChatMessage {
    id: string;
    content: string;
    type: 'user' | 'system';
    timestamp: Date;
    image?: string; // For screenshot URLs
}

export interface ChatState {
    messages: ChatMessage[];
    isProcessing: boolean;
}
