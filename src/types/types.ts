import { Application } from "express";

export type RoutesInput = {
  app: Application,
}

export type TErrorResponse = {
  error: string|null;
  description?: string;
  property?: string;
}

export type TProject = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  planFinishedAt: Date;
  trialFinishedAt: Date;
}

export type TDoc = {[key: string]: any}

export type TEntry = {
  id: string;
  projectId: string;
  structureId: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
  doc: TDoc;
}

export type TStructure = {
  id: string;
  name: string;
  code: string;
  bricks: TBrick[];
}

type TBrick = {
  type: string;
  name: string;
  key: string;
  description: string;
  validations: TValidationBrick[];
}

type TValidationBrick = {
  code: string;
  value: any;
}

export type TFile = {
  width: number;
  height: number;
  contentType: string;
  src: string;
  alt: string;
}