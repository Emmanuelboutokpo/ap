// src/types/planche.ts
export interface PlancheCreateInput {
  title: string;
  subCategoryId: string;
  description?: string;
  version?: string;
}

export interface PlancheUpdateInput {
  title?: string;
  subCategoryId?: string;
  description?: string;
  version?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface ChantAudioCreateInput {
  title: string;
  plancheId?: string;
}

export interface PlancheFilter {
  categoryId?: string;
  subCategoryId?: string;
  search?: string;
  fileType?: 'PDF' | 'IMAGE';
  status?: string;
  page?: number;
  limit?: number;
}