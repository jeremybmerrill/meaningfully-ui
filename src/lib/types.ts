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
}