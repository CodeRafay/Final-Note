// Message-related types

export interface Message {
  id: string;
  switchId: string;
  recipientId: string;
  encryptedContent: string;
  encryptionIv: string;
  subject: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageInput {
  recipientId: string;
  content: string;
  subject?: string;
}

export interface UpdateMessageInput {
  content?: string;
  subject?: string;
}

export interface DecryptedMessage {
  id: string;
  recipientId: string;
  content: string;
  subject: string | null;
}
