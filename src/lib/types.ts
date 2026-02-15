export interface DocumentSet {
  documentSetId: number;
  name: string;
  uploadDate: Date;
  parameters: Record<string, unknown>;
  totalDocuments: number;
}

// Define types for our document set metadata
export interface DocumentSetMetadata {
  documentSetId: number;
  name: string;
  uploadDate: Date;
  parameters: Record<string, unknown>;
  totalDocuments: number;
}

export interface SearchResult {
  text: string;
  score: number;
  metadata: Record<string, any>;
  sourceNodeId?: string;
}

export interface Settings {
  openAIKey: string | null;
  oLlamaBaseURL: string | null;
  azureOpenAIKey: string | null;
  azureOpenAIEndpoint: string | null;
  azureOpenAIApiVersion: string | null;
  mistralApiKey: string | null;
  geminiApiKey: string | null;
}

export interface BaseUploadFormData {
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

export interface UploadFormData extends BaseUploadFormData {
  fileContent: string;
  fileName: string;
}

export interface TopicDefinition {
  name: string;
  keywords: string[];
  color?: string;
}

export interface EmbeddingMapPoint {
  id: string;
  text: string;
  metadata: Record<string, any>;
  topic: string;
  x: number;
  y: number;
}

export interface EmbeddingMapResponse {
  method: 'pacmap' | 'umap' | 'tsne';
  points: EmbeddingMapPoint[];
  stats: {
    total: number;
    missingEmbeddings: number;
    usedWeaviate: boolean;
  };
}

export interface MeaningfullyAPI {
    listDocumentSets: (page: number, pageSize: number) => Promise<{documents: DocumentSetMetadata[], total: number}> ,
    uploadCsv: (formData: UploadFormData) => Promise<{ success: boolean, documentSetId: number }>,
    generatePreviewData: (formData: UploadFormData) => Promise<{ success: boolean, nodes: Record<string, any>[], estimatedPrice: number, tokenCount: number, pricePer1M: number }>,
    searchDocumentSet: (params: {
      documentSetId: number;
      query: string;
      n_results: number;
      filters?: { 
        key: string, 
        operator: "==" | "in" | ">" | "<" | "!=" | ">=" | "<=" | "nin" | "any" | "all" | "text_match" | "contains" | "is_empty", 
        value: any 
      }[];
    }) => Promise<SearchResult[]>;
    getDocument: (params: {documentSetId: number, documentId: string}) => Promise<{ text: string, metadata: Record<string, any> }>;
    getSettings: () => Promise<Settings>;
    setSettings: (settings: Settings) => Promise<{success: boolean}>;
    deleteDocumentSet: (documentSetId: number) => Promise<void>;
    getDocumentSet: (documentSetId: number) => Promise<DocumentSet>;
    getUploadProgress: () => Promise<{ progress: number, total: number, elapsedTimeMs: number, estimatedTimeRemainingMs: number | null }>;
    getAvailableModelOptions: () => Promise<{
      availableModelOptions: Record<string, string[]>;
      allModelOptions: Record<string, string[]>;
    }>;
    getEmbeddingMap: (params: {
      documentSetId: number;
      method: 'pacmap' | 'umap' | 'tsne';
      topics?: TopicDefinition[];
    }) => Promise<EmbeddingMapResponse>;
}