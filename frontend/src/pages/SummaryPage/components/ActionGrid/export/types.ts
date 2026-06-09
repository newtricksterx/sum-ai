export type TranscriptParagraph = {
  timestamp: number;
  text: string;
};

export type TranscriptResponse = {
  isSuccess: boolean;
  paragraphs?: TranscriptParagraph[];
  error?: string;
};
