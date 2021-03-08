/*
import { model, Model, type, validate, form, Deco } from 'aurelia-deco';
import { UserModel } from 'aurelia-swissdata';
import { StringTMap } from 'aurelia-resources';

@model('/step')
export class StepModel extends Model {

  @type.id
  public id: string;

  @type.model({model: 'self'})
  @validate.required
  public projectId: string | null = null;

  @type.model({model: 'self'})
  public parentStepId: string | null = null;

  @type.integer
  public order: number = 0;

  @type.string
  @validate.required
  public title: string = '';

  @type.string({textarea: true})
  public description: string = '';

  @type.file({accepts: ['image/*'], previewsFormats: ['160', '320', '320:320'], defaultPreview: '320:320'})
  public image: any = null;

  @type.float
  public progress: number = 0

  @type.date
  public startDate?: Date;
  
}

export interface StepInterface {
  id: string;
  projectId: string;
  parentStepId: string;
  order: number;
  title: string;
  description?: string;
  image?: any;
  progress: number;
  startDate?: Date;

  _createdAt: Date;
  _createdBy: string;
  _updatedAt: Date;
  _updatedBy: string;
}
*/
