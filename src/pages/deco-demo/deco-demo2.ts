import { ArticleModel } from './article.model';
import { adDialogModel } from 'aurelia-deco';
import { errorify } from 'aurelia-resources';

export class DecoDemo2 {

  public articles: ArticleModel[] = [];

  public activate() {
    this.getArticles();
  }

  public async getArticles(): Promise<void> {
    try {
      this.articles = await ArticleModel.getAll();
    } catch (error) {

    }
  }

  public async addArticle(): Promise<void> {
    try {
      const newArticle = new ArticleModel();
      adDialogModel(newArticle, {title: 'Ajouter un article'}, 'all');
    } catch (error) {
      errorify(error);
    }
  }

  public async editArticle(article: ArticleModel): Promise<void> {
    try {
      adDialogModel(article, {
        title: 'Editer article'
      }, 'all');
    } catch (error) {
      errorify(error);
    }
  }

}
