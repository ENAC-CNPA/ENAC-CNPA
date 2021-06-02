import { ArticleModel } from './article.model';

export class DecoDemo1 {

  public newInstance: ArticleModel;

  public activate() {
    this.newInstance = new ArticleModel();
  }

}
