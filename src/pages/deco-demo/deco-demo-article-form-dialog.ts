import { UxModalService, UxModalServiceResult} from '@aurelia-ux/modal'
import { errorify, notify } from 'aurelia-resources';
import { inject } from 'aurelia-framework';
import { ArticleModel } from './article.model';

@inject(UxModalService)
export class DecoDemoArticleFormDialog {

  public article: ArticleModel;

  constructor(private modalService: UxModalService) {
    
  }

  public activate(params: any) {
    if (params.article && params.article instanceof ArticleModel) {
      this.article = params.article;
    } else {
      throw new Error('Missing article');
    }
    if (!Array.isArray(this.article.tags)) {
      this.article.tags = [];
    }
  }

  public async canDeactivate(result: UxModalServiceResult) {
    if (result.wasCancelled) {
      return true;
    }
    const validationResult = await this.article.validationController.validate();
    if (!validationResult.valid) {
      return false;
    }
    try {
      const article = await this.save();
      result.output = article;
      notify(`Article has been saved`)
    } catch (error) {
      errorify(error);
      return false;
    }
  }

  public async save(): Promise<ArticleModel> {
    if (this.article.id) {
      return await this.article.updateProperties('', Object.keys(this.article));
    } else {
      return await this.article.save();
    }
  }
  
}
