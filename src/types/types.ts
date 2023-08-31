import { Application } from "express";

export type RoutesInput = {
  app: Application,
}

export type TErrorResponse = {
  error: string|null;
  description?: string;
  property?: string;
}

export type TProjectModel = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
export type TCounterModel = {
  _id: string;
  seq: number;
}

export type TProjectInput = {
  userId: string;
  name: string;
}

export type TProjectOutput = {
  id: string;
  name: string;
  projectNumber: number
}



