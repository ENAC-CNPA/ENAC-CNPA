import { ArticleModel } from './article.model';
import { UxModalService } from '@aurelia-ux/modal';
import { inject } from 'aurelia-framework';
import { errorify } from 'aurelia-resources';
import { DecoDemoArticleFormDialog } from './deco-demo-article-form-dialog';
import { ContextMenuService } from './context-menu-service';
import { Global } from '../../global';

@inject( Global, UxModalService, ContextMenuService)
export class DecoDemo5 {
  
  public articles: ArticleModel[] = [];

  public constructor(private global: Global, private modalService: UxModalService, private contextMenuService: ContextMenuService) {

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

  public async openContextMenu(event: MouseEvent): Promise<void> {
    try {
      const dialog = await this.contextMenuService.open(
        event.target as HTMLElement, 
        {
          title: 'Actions',
          actions: [
            {
              icon: 'add',
              label: 'Ajouter un article',
              callback: () => {
                this.addArticle();
              }
            },
            {
              icon: 'keyboard_backspace',
              label: `Retour à l'index`,
              callback: () => {
                this.global.navigateToRoute('deco')
              }
            }
          ]
        }
      );
      const result = await dialog.whenClosed();
      if (result.wasCancelled) {
        return;
      }
      if (result.output instanceof Function) {
        result.output.call(this);
      }
    } catch(error) {
      errorify(error);
    }
  }

  public async openArticleContextMenu(event: MouseEvent, article: ArticleModel): Promise<void> {
    try {
      const dialog = await this.contextMenuService.open(
        event.target as HTMLElement, 
        {
          title: 'Actions',
          actions: [{
            icon: 'edit',
            label: `Editer l'article`,
            callback: () => {
              this.editArticle(article);
            }
          },
          {
            icon: 'delete',
            label: `Supprimer l'article`,
            callback: () => {
              this.deleteArticle(article);
            }
          }]
        }
      );
      const result = await dialog.whenClosed();
      if (result.wasCancelled) {
        return;
      }
      if (result.output instanceof Function) {
        result.output.call(this);
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async addArticle(): Promise<void> {    
    try {
      const newArticle = new ArticleModel();
      const dialog = await this.modalService.open({
        viewModel: DecoDemoArticleFormDialog,
        model: {
          article: newArticle
        },
        overlayDismiss: false,
        position: 'center'
      });
      const result = await dialog.whenClosed();
      if (result.wasCancelled) {
        return;
      }
      if (result.output instanceof ArticleModel) {
        this.articles.push(result.output);
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async editArticle(article: ArticleModel): Promise<void> {
    try {
      const editedArticle = new ArticleModel();
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
      if (result instanceof ArticleModel) {
        const existingArticle = this.articles.find(a => a.id === result.id);
        if (existingArticle) {
          await existingArticle.updateInstanceFromElement(result);
        }
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async deleteArticle(article: ArticleModel): Promise<void> {
    try {
      const index = this.articles.findIndex(a => a.id === article.id);
      if (index !== -1) {
        await article.remove();
        this.articles.splice(index, 1);
      }
    } catch (error) {
      errorify(error);
    }
  }

}
