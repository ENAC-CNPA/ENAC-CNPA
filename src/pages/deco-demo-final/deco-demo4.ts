import { ConfirmDialog, PromptBooleanDialog, PromptDateDialog, PromptSelectDialog, PromptTextDialog } from 'aurelia-resources';
import { UxModalService } from '@aurelia-ux/modal';
import { inject } from 'aurelia-framework';

@inject(UxModalService)
export class DecoDemo4 {
  
  public confirmResponse?: boolean = undefined;
  public promptBooleanResponse?: boolean = undefined;
  public promptDateResponse?: Date = undefined;
  public promptSelectResponse?: string = undefined;
  public promptTextResponse?: string = undefined;

  private promptSelectOptions: {player: string, name: string}[] = [
    {player: 'nadal', name: 'Rafaël Nadal'},
    {player: 'djoko', name: 'Novak Djokovic'},
    {player: 'federer', name: 'Roger Federer'},
    {player: 'tsitsipas', name: 'Stéphanos Tsistipas'},
    {player: 'other', name: 'Un autre'},
  ];

  public constructor(private modalService: UxModalService) {

  }

  public async confirm(): Promise<void> {

    // tous les dialog par défaut décrits dans cette page
    // contiennent un "titre" et/ou "text" qui s'affiche dans la boite
    // de dialogue. Ces paramètres sont facultatifs
    const dialog = await this.modalService.open({
      viewModel: ConfirmDialog,
      model: {
        title: 'Etes-vous sûr',
        text: 'Vous êtes sur le point de me dire que vous êtes sûr'
      },
      overlayDismiss: false,
    });
    const result = await dialog.whenClosed();
    if (result.wasCancelled) {
      this.confirmResponse = false;
      return;
    }
    this.confirmResponse = true;
  }

  public async promptBoolean(): Promise<void> {
    const dialog = await this.modalService.open({
      viewModel: PromptBooleanDialog,
      model: {
        title: 'Votre pronostique',
        text: 'Est-ce que Servette va gagner le prochain championnat de hockey sur glace ?'
      },
      overlayDismiss: false,
    });
    const result = await dialog.whenClosed();
    if (result.wasCancelled) {
      return;
    }
    this.promptBooleanResponse = result.output;
  }

  public async promptDate(): Promise<void> {
    const dialog = await this.modalService.open({
      viewModel: PromptDateDialog,
      model: {
        title: 'A votre avis',
        text: 'A quelle date pourra-t-on enlever les masques dans les magasins ?'
      },
      overlayDismiss: false,
    });
    const result = await dialog.whenClosed();
    if (result.wasCancelled) {
      return;
    }
    this.promptDateResponse = result.output;
  }

  public async promptSelect(): Promise<void> {
    // Le promptSelect est assez flexible. On peut lui passer commes "options"
    // un tableau de valeur et via les "labelKey" et "valueKey" il s'adapte pour afficher
    // et retourner des valeurs pertinentes.
    const dialog = await this.modalService.open({
      viewModel: PromptSelectDialog,
      model: {
        title: 'Sport Quizz',
        text: 'Qui va gagner Roland Garros 2021 ?',
        mode: 'single', // le mode peut être single ou multiple
        options: this.promptSelectOptions,
        labelKey: 'name',
        valueKey: 'player',
        required: true,
        showSearch: false, // showSearch est un paramètre indiquant si on doit afficher un champs de recherche en haut des options. On peut passer "auto" ou boolean. En mode "auto" le champs de recherche s'affiche dès qu'il y a plus de 10 options. C'est la valeur par défaut
        autoClose: true // lorsque autoClose est vrai alors si une valeur est choisie la dialogue se ferme toute seule
      },
      overlayDismiss: false,
    });
    const result = await dialog.whenClosed();
    if (result.wasCancelled) {
      return;
    }
    this.promptSelectResponse = result.output;
  }

  public async promptText(): Promise<void> {
    const dialog = await this.modalService.open({
      viewModel: PromptTextDialog,
      model: {
        title: `Un peu d'histoire`,
        text: 'De quelle couleur est le cheval blanc de Napoléon ?'
      },
      overlayDismiss: false,
    });
    const result = await dialog.whenClosed();
    if (result.wasCancelled) {
      return;
    }
    this.promptTextResponse = result.output;
  }

}
