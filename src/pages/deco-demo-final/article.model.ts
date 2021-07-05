import { model, Model, type, validate, form } from 'aurelia-deco';

@model('/article')
export class ArticleModel extends Model {

  @type.string
  @validate.required
  @validate.maxLength(20)
  @form.hint('Maximum 20 caractères')
  @form.label('Choisissez un super titre')
  title: string = '';

  @type.string({textarea: true})
  @validate.required
  text: string = '';

  @type.array({type: 'string'})
  tags: string[] = [];

  @type.date
  @validate.required
  date: Date;

  @type.file({mimetype: 'image/*'})
  // TODO: fix validate.required when model already has a file
  // @validate.required
  image: Date;

  @type.integer
  @validate.required
  @form.hint('Plus le chiffre est grand, plus la priorité est élevée')
  priority: number = 0;
}
