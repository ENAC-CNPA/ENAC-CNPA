import { ArticleModel } from './article.model';
import { errorify } from 'aurelia-resources';

export class DecoDemo3 {
  
  public articles: ArticleModel[] = [];

  public constructor() {

  }

  public activate() {
    this.getArticles();
  }

  public async getArticles(): Promise<void> {
    try {
      this.articles = await ArticleModel.getAll();
    } catch (error) {
      errorify(error);
    }
  }

  public async addArticle(): Promise<void> {
    try {
      
    } catch (error) {
      errorify(error);
    }
  }

  public async editArticle(article: ArticleModel): Promise<void> {
    try {
      
    } catch (error) {
      errorify(error);
    }
  }

}
