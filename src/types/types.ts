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
  front: {
    title: string;
    logo: string;
  };
}

export type TProjectOutput = {
  id: string;
  name: string;
  currencies: {code:string, primary:boolean}[];
  languages: {code:string, primary:boolean}[];
  front: {
    title: string;
    logo: TFile;
  };
}

export type TDoc = {[key: string]: any}

export type TEntry = {
  id: string;
  projectId: string;
  contentId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  doc: TDoc;
}

export type TContent = {
  id: string;
  name: string;
  code: string;
  entries: {
    fields: TField[];
  };
  sections: {
    enabled: boolean;
    fields: TField[];
  };
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

type TField = {
  type: string;
  name: string;
  key: string;
  description: string;
  validations: TValidationField[];
  unit?: string;
}

type TValidationField = {
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
  contentId: string;
}

export type TValueTranslation = {[key: string]: any}

export type TTranslation = {
  id: string;
	userId: string; 
  projectId: string;
  contentId: string;
  subjectId: string;
  subject: string;
  key: string;
  value: TValueTranslation;
  lang: string;
  createdAt?: string;
}

export type TItemOutput = {
  id: string;
  created_at: Date;
  updated_at: Date;
  doc: TDoc;
  items?: TItemOutput[];
}
export type TMenuOutput = {
  id: string;
  created_at: Date;
  updated_at: Date;
  doc: TDoc;
}

export type TItem = {
  id: string;
  projectId: string;
  menuId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  doc: TDoc;
  parentId: string;
  subjectId: string|null;
  subject: string|null;
  items?: TItem[];
}

export type TMenu = {
  id: string;
  name: string;
  code: string;
  items: {
    fields: TField[];
  };
  translations: {
    enabled: boolean;
  }
}

export type TSection = {
  id: string;
  projectId: string;
  contentId: string;
  parentId: string|null;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
  doc: TDoc;
  sections?: TSection[];
}

export type TSectionOutput = {
  id: string;
  parentId: string|null;
  doc: TDoc;
  sections?: TSectionOutput[];
}