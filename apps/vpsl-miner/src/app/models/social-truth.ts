export interface fileDto {
  source: 'telegramMiner';
  user: string;
  submission_token: string;
  revision: string;
  chats: Array<chatDto>;
}

export interface chatDto {
  chat_id: number;
  contents: Array<any>;
}

export interface proofResponseDto {
  proof_valid?: boolean;
  proof_failed_reason?: string;

  score?: number;
  did_score_content: boolean;

  source: string;
  revision: string;
  submitted_on: string;
};