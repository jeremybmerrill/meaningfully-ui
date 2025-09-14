/// <reference types="svelte" />
/// <reference types="vite/client" />


interface Settings {
  openAIKey: string;
  oLlamaBaseURL: string;
  azureOpenAIKey: string;
  azureOpenAIEndpoint: string;
  azureOpenAIApiVersion: string;
  mistralApiKey: string;
  geminiApiKey: string;
}

interface SearchResult {
  content: string;
  similarity: number;
  [key: string]: any; // For metadata fields
  sourceNodeId: string | undefined;
}

interface BaseUploadFormData {
  datasetName: string;
  description: string;
  textColumns: string[];
  metadataColumns: string[];
  splitIntoSentences: boolean;
  combineSentencesIntoChunks: boolean;
  sploderMaxSize: number;
  chunkSize: number;
  chunkOverlap: number;
  modelName: string;
  modelProvider: string;
}

interface UploadFormData extends BaseUploadFormData {
  fileContent: string;
  fileName: string;
}