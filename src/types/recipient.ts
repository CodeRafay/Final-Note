// Recipient-related types

export interface Recipient {
  id: string;
  switchId: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipientInput {
  email: string;
  name?: string;
}

export interface UpdateRecipientInput {
  email?: string;
  name?: string;
}
