/**
 * Modelo base del módulo de Inteligencia.
 * Los cambios persistentes se realizarán exclusivamente mediante Cloud Functions.
 * No incluir datos sensibles innecesarios en índices o listados.
 */

export type IntelligenceClassification = "PUBLIC_INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type IntelligenceCaseStatus = "DRAFT" | "OPEN" | "UNDER_REVIEW" | "CLOSED" | "ARCHIVED";
export type IntelligenceSourceType = "INTERNAL" | "MANUAL" | "DOCUMENT" | "FIELD_REPORT";
export type IntelligenceMatchStatus = "SUGGESTED" | "CONFIRMED" | "DISMISSED";

export interface IntelligenceCase {
  id: string;
  clientId: string;
  title: string;
  summary: string;
  classification: IntelligenceClassification;
  status: IntelligenceCaseStatus;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sourceType: IntelligenceSourceType;
  entityIds: string[];
  tags: string[];
}

export interface IntelligenceEntity {
  id: string;
  caseId: string;
  clientId: string;
  type: "PERSON" | "ORGANIZATION" | "LOCATION" | "ASSET" | "OTHER";
  displayName: string;
  normalizedName?: string;
  createdBy: string;
  createdAt: string;
}

export interface IntelligenceEvent {
  id: string;
  caseId: string;
  clientId: string;
  title: string;
  description: string;
  occurredAt: string;
  recordedBy: string;
  createdAt: string;
}

export interface IntelligenceEvidence {
  id: string;
  caseId: string;
  clientId: string;
  sourceType: IntelligenceSourceType;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  uploadedBy: string;
  uploadedAt: string;
  classification: IntelligenceClassification;
}

export interface IntelligenceFinding {
  id: string;
  caseId: string;
  clientId: string;
  title: string;
  description: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  createdBy: string;
  createdAt: string;
}

export interface IntelligenceMatchSuggestion {
  id: string;
  caseId: string;
  clientId: string;
  leftEntityId: string;
  rightEntityId: string;
  score: number;
  rationale: string;
  status: IntelligenceMatchStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}
