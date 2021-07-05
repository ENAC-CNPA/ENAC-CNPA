import { ArticleModel } from './article.model';

export class DecoDemo6 {

  public newInstance: ArticleModel;

  public activate() {
    this.newInstance = new ArticleModel();
  }

}
