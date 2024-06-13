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
  currencies: {code:string, primary:boolean}[];
  languages: {code:string, primary:boolean}[];
}

export type TDoc = {[key: string]: any}

export type TEntry = {
  id: string;
  projectId: string;
  structureId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  doc: TDoc;
}

export type TStructure = {
  id: string;
  name: string;
  code: string;
  bricks: TBrick[];
  notifications: {
    new: {
      alert: {
        enabled: boolean;
        message: string
      }
    }
  };
  translations: {
    enabled: boolean;
  }
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
  id: string;
  width: number;
  height: number;
  contentType: string;
  src: string;
  alt: string;
}

export type TEntryOutput = {
  id: string;
  created_at: Date;
  updated_at: Date;
  doc: TDoc;
}

export type TEntryInput = {
  doc: TDoc;
}

export type TAlert = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  subjectId: string;
  subjectType: string;
  projectId: string;
  structureId: string;
}

export type TValueTranslation = {[key: string]: any}

export type TTranslation = {
  id: string;
	userId: string; 
  projectId: string;
  structureId: string;
  subjectId: string;
  subject: string;
  key: string;
  value: TValueTranslation;
  lang: string;
  createdAt?: string;
}


export type TItemOutput = {
  title: string;
  url: string;
  type: string;
  items: TItemOutput[];
}
export type TMenuOutput = {
  id: string;
  handle: string;
  items: TItemOutput[];
}

export type TItem = {
  title: string;
  url: string;
  subject: string;
  subjectId: string;
  type: string;
  items: TItem[];
}
export type TMenu = {
  id: string;
  projectId: string;
  title: string;
  handle: string;
  items: TItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type TSection = {
  id: string;
  projectId: string;
  structureId: string;
  parentId: string|null;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
  doc: TDoc;
  sections?: TSection[];
}