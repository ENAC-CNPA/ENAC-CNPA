/*

- Modèles en dur
- Garder un modèle dynamique sous la main
- Utiliser un README pour "support de cours"
- API code: https://github.com/ENAC-CNPA/bimetat-api


- Faire un décorateur ensemble (@type.vector3)


- Deco field (sur modèle en dur ou sur dynamique data)
- Autre champs de saisie via aurelia-resources
- Multilang, gestion des locale ?
- Dialog auto edit
- Upload de fichiers
- Boite de dialog (confirm, prompt, custom)
- Errorify, notify
- Modal Service : drawer, dropdown


- Quelle API à utiliser ?


- Affichage avec ux-list et ux-cards


*/

import { ArticleModel } from './article.model';

export class DecoDemo1 {
  
  public newInstance: ArticleModel;

  public activate() {
    this.newInstance = new ArticleModel();
  }

}
