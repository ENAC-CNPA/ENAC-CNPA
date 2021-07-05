import { ArticleModel } from './article.model';
import { UxModalService } from '@aurelia-ux/modal';
import { inject } from 'aurelia-framework';
import { errorify } from 'aurelia-resources';
import { DecoDemoArticleFormDialog } from './deco-demo-article-form-dialog';

// Le UxModalService est la pièce maîtresse de tout ce qui touche aux boîtes de dialogue (et drawer, s'ils sont modaux)
@inject(UxModalService)
export class DecoDemo3 {
  
  public articles: ArticleModel[] = [];

  public constructor(private modalService: UxModalService) {

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
      const newArticle = new ArticleModel();

      // La méthode principale du modalService est "open"
      const dialog = await this.modalService.open({
        viewModel: DecoDemoArticleFormDialog, // elle utilise un ViewModel pour l'afficher en mode modal
        model: { // la propriété "model" passe des paramètrs à la fonction "activate" du composant ViewModel passé ci-dessus
          article: newArticle // dans notre cas on passe l'instance de l'article que l'on est en train de créer
        },
        overlayDismiss: false, // interdit de "fermer" accidentellement la modale
        position: 'center' // c'est la valeur par défaut de la position
      });

      // une bonne pratique est de faire un await sur la method whenClosed() pour récupérer la valeur de retour de la modale
      // si nécessaire
      const result = await dialog.whenClosed();

      // et de ne pas aller plus loin si la modale a été "annulée"
      if (result.wasCancelled) {
        return;
      }

      // result.output contient le resultat renvoyé par le composant qui a été chargé par le Modal Service
      if (result.output instanceof ArticleModel) {
        this.articles.push(result.output);
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async editArticle(article: ArticleModel): Promise<void> {
    try {
      // Ici on pourrait passer la variable "article" directement au composant DecoDemoArticleFormDialog
      // mais à la place on crée une variable séparée
      // La raison c'est que si la modification est plus tard "annulée", on a pas d'impact sur la valeur locale dans cette vue
      // alors que si on passait l'object directement, il peut être "édité" dans le formulaire de la modale
      // mais ensuite l'utilisateur clique "annuler" et on a des modifs "en cours" dans l'object de cette vue
      const editedArticle = new ArticleModel();
      editedArticle.id = article.id;
      await editedArticle.updateInstanceFromElement(article);
      const dialog = await this.modalService.open({
        viewModel: DecoDemoArticleFormDialog,
        model: {
          article: editedArticle
        }
      });
      const result = await dialog.whenClosed();
      if (result.wasCancelled) {
        return;
      }
      if (result.output instanceof ArticleModel) {
        const existingArticle = this.articles.find(a => a.id === result.output.id);
        if (existingArticle) {
          await existingArticle.updateInstanceFromElement(result.output);
        }
      }
    } catch (error) {
      errorify(error);
    }
  }

}
