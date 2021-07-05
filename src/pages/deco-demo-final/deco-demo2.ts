import { ArticleModel } from './article.model';
import { errorify } from 'aurelia-resources'
import { adDialogModel } from 'aurelia-deco'

export class DecoDemo2 {
  
  public articles: ArticleModel[] = [];

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

  // La méthode adDialogModel peut être utilisée aussi bien pour créer une nouvelle data
  // que pour éditer une data existante
  // Pour information: la méthode adDialogModel utilise une ancienne version des boîte de dialogue
  // (à savoir: pas le UxModalService). Cependant ces boîtes de dialogue sont compatibles avec celles
  // de UxModalService
  public async addArticle(): Promise<void> {
    const newArticle = new ArticleModel();
    adDialogModel(newArticle, {title: 'Ajouter un article'}, 'all');
  }

  public async editArticle(article: ArticleModel): Promise<void> {
    adDialogModel(article, {
      title: 'Editer article'
    }, 'all');
  }

}
