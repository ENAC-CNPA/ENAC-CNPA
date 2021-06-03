# Aurelia Deco & Components

Ce guide s'attends à ce que l'app client soit connectée à une API qui contient le modèle + contrôlleur suivant:

```ts
// article.model.ts
import { model, Model, type, validate, io } from 'deco-api';

@model('article')
export class ArticleModel extends Model {

  @type.string
  @io.all
  @validate.required
  title: string = '';

  @type.string
  @io.all
  @validate.required
  text: string = '';

  @type.array({type: 'string'})
  @io.all
  tags: string[] = [];

  @type.date
  @io.all
  @validate.required
  date: Date;

  @type.file({mimetype: 'image/*'})
  @io.all
  @validate.required
  image: Date;

  @type.integer
  @io.all
  @validate.required
  priority: number = 0;
}
```

```ts
// article.controller.ts
import { Router } from 'express';
import { ArticleModel } from './article.model';
import { ControllerMiddleware, AppMiddleware, MultipartMiddleware } from 'deco-api';

const router: Router = Router();

let mdController = new ControllerMiddleware(ArticleModel);

router.get(
  ControllerMiddleware.getAllRoute(),
  AppMiddleware.fetchWithPublicKey,
  mdController.prepareQueryFromReq(),
  mdController.getAll()
);

router.get(
  ControllerMiddleware.getOneRoute(),
  AppMiddleware.fetchWithPublicKey,
  mdController.getOne()
);

router.post(
  ControllerMiddleware.postRoute(),
  AppMiddleware.fetchWithPublicKey,
  MultipartMiddleware.parseDeco(<any>ArticleModel.deco),
  mdController.post()
);

router.put(
  ControllerMiddleware.putRoute(),
  AppMiddleware.fetchWithPublicKey,
  MultipartMiddleware.parseDeco(<any>ArticleModel.deco),
  mdController.put()
);

router.delete(
  ControllerMiddleware.deleteRoute(),
  AppMiddleware.fetchWithPublicKey,
  mdController.delete()
);

export const ArticleController: Router = router;
```

Avec le contrôlleur connecté à la route `/article`:

```ts
// server.ts
app.use('/article', ArticleController);  
```

## Utilisation des modèles DECO côté client

Aurelia Deco fournit les mêmes décorateurs de type que Deco API. Une fois les modèles définis avec les mêmes décorateur, on peut interagir avec le modèle API de façon très simple.

Exemple de modèle côté client:

```ts
// article.model.ts
import { model, Model, type, validate, form } from 'aurelia-deco';

@model('/article')
export class ArticleModel extends Model {

  @type.string
  @validate.required
  @validate.maxLength(20)
  @form.hint('Maximum 20 caractères')
  @form.label('Choisissez un super titre')
  title: string = '';

  @type.string({textarea: true})
  @validate.required
  text: string = '';

  @type.array({type: 'string'})
  tags: string[] = [];

  @type.date
  @validate.required
  date: Date;

  @type.file({mimetype: 'image/*'})
  @validate.required
  image: Date;

  @type.integer
  @validate.required
  @form.hint('Plus le chiffre est grand, plus la priorité est élevée')
  priority: number = 0;
}
```


### Composant: Deco Field (demo 1)

On utilise un composant `<deco-field>` pour gérer les propriétés des modèles décorés. Ce composant fournit une interface "formulaire" pour tous les type de données classiques.

Exemple d'un deco field:

```ts
  // View-model: create an instance (or get from API)
  initNewPerson() {
    this.newPerson = new Person();
  }
```


```html
<!-- View: handling the instance -->
<deco-field instance.bind="newPerson" property="firstname"></deco-field>
<deco-field instance.bind="newPerson" property="lastname"></deco-field>
<deco-field instance.bind="newPerson" property="department"></deco-field>
```

Les avantages de `<deco-field>`:

- Un champs de saisie automatique
- Avec le label
- Inclus la gestion des erreurs (validation)
- Permet de construire des formulaires "automatiquement"

Les types de données que `<deco-field>` peut gérer:

* `@type.string`
* `@type.float`
* `@type.integer`
* `@type.array('string')`
* `@type.date`
* `@type.select`
* `@type.boolean`
* `@type.file`
* `@type.files`

Lorsque les données à gérer sont d'un autre type il faut utiliser un composant spécifique. C'est le cas par exemple pour les `any`, pour les `array` complexes ou pour les `model` et `models`.

### Formulaire "automatique" avec `adDialogModel()` (demo 2)

`aurelia-deco` fournit une méthode pour générer une boîte de dialogue de gestion d'un modèle. Si le modèle ne contient que des types gérés par `deco-field`. Elle fonctionne particulièrement bien avec les modèles qui peuvent être entièrement gérés par `deco-field`.

```ts
public async addArticle(): Promise<void> {
  const newArticle = new ArticleModel();
  adDialogModel(newArticle, {title: 'Ajouter un article'}, 'all');
}

public async editArticle(article: ArticleModel): Promise<void> {
  adDialogModel(article, {
    title: 'Editer article'
  }, 'all');
}
```

### Boîte de dialogue personnalisée (demo 3)

Il est souvent nécessaire de créer des boîtes de dialogue pour interagir avec l'utilisateur. L'exemple ci-dessous se place dans le contexte de la gestion de modèle mais les boîtes de dialogue peuvent évidement être utilisées dans de nombreux autres contextes.

La pièce maîtresse qui ouvre / ferme / garde un trace des couches de dialogues ouvertes s'appelle `UxModalService` et fait partie d'Aurelia UX. On ouvre une dialogue avec la fonction `.open()` :

```ts
const dialog = await this.modalService.open({
  viewModel: DecoDemoArticleFormDialog, // elle utilise un ViewModel pour l'afficher en mode modal
  model: { // la propriété "model" passe des paramètrs à la fonction "activate" du composant ViewModel passé ci-dessus
    article: newArticle // dans notre cas on passe l'instance de l'article que l'on est en train de créer
  },
  overlayDismiss: false, // interdit de "fermer" accidentellement la modale
  position: 'center' // c'est la valeur par défaut de la position
});
```

Important: `.open()` retourne une promesse car elle travaille de manière asynchrone pour établir tous les éléments du DOM et les composer avec Aurelia. Il est donc nécessaire de faire un `await` ou `.then()`.

#### Attributs de lifecycle des boîtes de dialogue

La fonction `.open()` demande une propriété `viewModel` qui pointe vers un composant Aurelia qui sera utilisé pour la dialogue. Ce composant peut contenir absoluement n'importe quoi. Par défaut, la dialogue est configurée pour qu'un clique "en dehors" la referme. Mais attention en mobile les dialogues prennent parfois tous le viewport et un clic "en dehors" n'est peut-être pas possible, il faut donc toujours prévoir une façon de la refermer.

Pour fermer une dialogue, le plus simple est de placer un attribut sur un bouton dans une partie du template. Exemple:

```ts
// view-model.html
<template>
  <div>
    Le contenu de ma dialogue
    <ux-button type="cancel" dismiss-modal>Annuler</ux-button>
    <ux-button type="raised" ok-modal.bind="bindedValue">Enregistrer</ux-button>
  </div>
</template>
```

On découvre ci-dessus 2 nouveaux attributs:

* `dismiss-modal` ferme la dialogue et la valeur de retour indiquere `wasCancelled=true``
* `ok-modal` est un attribut qui, si on lui fournit une valeur, fermera la dialogue avec cette valeur comme retour. On peut l'utiliser avec une valeur en dur: `ok-modal="ok"` ou une valeur bindée au View Model: `ok-modal.bind="bindedValue"`

#### Hook de lifecycle des boîtes de dialogue

On peut aussi gérer le lifecycle de dialogue du côté View Model du composant. Pour cela on utilise les hook standards aurelia, à savoir:

* `canActivate()` - determine si on peut ouvrir la dialogue ou pas
* `activate()` - paramètre la dialogue avec les data passées en argument
* `canDeactivate()` - determine si on peut fermer la dialogue et garantit la valeur de retour

Ces trois hook sont très puissants. Ils sont tous optionnels.

`canActivate(params: any)` est une méthode qui, si elle retourne `false` ou `Promise<false>` va empêcher la boîte de dialogue de s'afficher. Il reçoit le même `params` que `activate()` ci-dessous.

`activate(params: any)` reçoit en paramètre la valeur passée dans la propriété `model` de la méthode `open()` du modal service. Ainsi elle peut initialiser le composant avec les données passées en argument. Toutes les valeurs nécessaires au bon fonctionnement de la dialogue doivent avoir été vérifées au préalable dans `canActivate()` pour éviter une activation invalide.

`canDeactivate(result: UxModalServiceResult)` est l'endroit ou on valide que ce qui est demandé dans la boîte de dialogue est en ordre. Par exemple, si la boîte de dialogue est destinée à l'édition d'un modèle, on va faire une validation des données et tenter d'écrire vers l'API. En cas d'erreur, cette fonction retournera `false` ou `Promise<false>` pour empêcher la fermeture de la dialogue. En revanche, si tout se passe bien elle retourne `void|true` ou `Promise<void|true>`.

`canDeactivate(result: UxModalServiceResult)` est aussi utile pour garantir une valeur de retour correcte. Par exemple, si la dialogue est responsable de créer une nouvelle entrée d'un modèle de donnée. Une fois que l'API retourne la nouvelle entrée avec son nouvel ID, il est une bonne pratique de placer cette valeur dans `result.output`. Ainsi, lorsque le ViewModel qui avait ouvert la dialogue recevra la valeur de retour, il aura la bonne version.

Une autre bonne pratique de `canDeactivate()` est de permettre la fermeture de la dialogue en mode "annulé". Concrètement, si la vue contientun bouton "Annuler" avec l'attribut `dismiss-modal`, cela va initier une fermeture de la dialogue avec la valeur `result.wasCancelled = true`. Dès lors, dans `canDeactivate()` on a tendance à écrire:

```
public async canDeactivate(result: UxModalServiceResult) {
  if (result.wasCancelled) {
    return true;
  }
  // ... and continue with canDeactivate code
}
```

Sauf si la dialogue ne peut pas être annulée ou "dismissée", et dans ce cas il est naturel de garantir une fermeture valide sans "annulation".

#### Ouverture et traitement de la valeur de retour d'une dialogue

On gère une boîte de dialogue de la manière suivante:

1. Ouverture `await this.modalService.open()`
2. Attente de la valeur de retour: `const result = await dialog.whenClosed();`
3. Traiter la valeur de retour: 

```ts
// On vérifie si c'est annulé
if (result.wasCancelled) {
  return;
}
// Si pas annulé, on peut manipuler la valeur de retour
console.log(result.output);
```

L'exemple complet dans le cas de nos traitement de modèle de donnée:

```ts
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
```

### Boîtes de dialogues pré-configurées (demo 4)

`aurelia-resources` fournit une série de boîte de dialogue utile pour des courtes interactions. Pour éviter de chaque fois créer un composant pour une dialogue, lorsqu'on veut juste "poser une question" à l'utilisateur, ces dialogue fonctionnent bien.

On les manipulent de la même manière qu'une boîte de dialogue décrite ci-dessus, mais la partie composant est déjà faite. Il suffit d'importer le composant du type de boîte de dialogue que l'on souhaite, à savoir:

* `ConfirmDialog` : demande une confirmation avec soit "OK", soit "Annuler"
* `PromptBooleanDialog` : demande de choisir entre "Oui", "Non" ou "Annuler" 
* `PromptDateDialog` : demande de choisir une date
* `PromptSelectDialog` : demande de choisir dans une liste d'options à choix
* `PromptTextDialog` : demande de saisir un texte

Chacune de ces dialogue peut recevoir comme valeur dans `model` un `title` ou `texte` pour indiquer ce qu'on demande à l'utilisateur. Il faut fournir au moins une des deux valeur.

Chaque boîte de dialogue a aussi d'autres paramètres utiles comme par exemple `required`.

### Modal Service pour des menus contextuels (demo 5)

Le Modal Service permet de faire énormément de choses. On a vu jusqu'à maintenant un usage assez classique avec l'ouverture d'une boîte de dialogue centrée à l'écran. Mais il est aussi possible d'afficher un composant (modal) de façon différente.

Un usage courant est d'ouvrir un menu contextuel. Ceux-ci peuvent être fait de manière très simple en CSS pure avec un div en `position: absolute` positionné proche d'un bouton. Mais cette méthode simple se heurte à deux problématiques:

1. Ouverture du menu en fonction de la position du bouton qui l'ouvre et de la place qui se trouve autour
2. Lorque le menu est ouvert dans un élément parent qui contient un `overflow: hidden` ou `contain: content`

Pour palier à ces problèmatiques, le modal servie est puissant car il s'arrange pour que les composant modaux soient ouverts comme dernier enfant du `BODY`, avec une gestion des couches modales.

Avec l'usage du `UxPositioningService` on peut s'arranger pour placer un menu au meilleur emplacement possible selon le contexte.

Voici un exemple:

```ts
// la fonction .open() du modalService que l'on connaît bien
const modal = await this.modalService.open({
  viewModel: ContextMenu, // un composant, peut importe quoi, qui est utilisé comme "menu contextuel" ici
  model: {/*... */},
  position: 'absolute', // on demande au modal service de positionner le menu de façon `absolute`, on s'occupera ensuite de sa position effective
  lock: true, // lorsque `lock: true` les interactions hors modal sont désactivée (sauf dissmiss ci true ci-dessous)
  outsideDismiss: true,
  // la magie s'opère dans la méthode ci-dessous, appelée à l'ouvertue de la modale et renvoyant les éléments principaux qui la constitue
  openingCallback: (contentWrapperElement: HTMLElement, overlayElement: HTMLElement) => {
    const contentElement = contentWrapperElement.querySelector('.ux-modal__content') as HTMLElement;

    // positioningFactory retourne une instance du UxPositioningService liée à un
    // élément de référence (anchor) et à un élément qu'il doit positionner (contentElement)
    const positioning = this.positioningFactory(anchor, contentElement, {
      placement: 'bottom-start', // le placement "idéal", suit les mêmes conventions que `popperjs`
      offsetX: 4, // decalage selon X par rapport l'ancre
      offsetY: 4, // decalage selon Y par rapport l'ancre
      constraintMarginX: 8, // marge en X par rapport à la contrainte appliquée à sa position (permet d'éviter de coller l'élément au bord du viewport)
      constraintMarginY: 8 // marge en Y par rapport à la contrainte appliquée à sa position (permet d'éviter de coller l'élément au bord du viewport)
    });
    // autres options possibles:
    // constraintElement: HTMLElement | Window : l'élément "dans lequel" l'élément peut être visuellement positionné (par défaut Window)
    // missingSpaceStrategy: 'flip' | 'ignore' | 'hide' | 'over' : comment gérer s'il n'y a pas assez de place pour positionner l'élément (par défaut `flip`)
    // hiddenClass: string (par défaut `ux-positioning--hidden`)


    let iterations = 0;
    const interval = setInterval(() => {
      positioning.update();
      iterations++;
      if (iterations > 10) {
        clearInterval(interval)
      }
    }, 50)
  },
});
```

#### Updating positionning "on the fly"

L'instance `UxPositioningService` retournée par `positioningFactory` contient une méthode `.update()` qui s'assure que la position de l'élément qu'elle gère est correcte selon la configuration demandée et le context actuel.

Cette méthode est utile si on veut implémenter une modale qui adapte sa position lors de `scroll` or `resize` du viewport. Comme ce genre d'opération est relativement coûteuse, elle n'est pas implémentée "par défaut" mais doit être mise en place au besoin. Pour cela il suffit de:

* garder une référence à cette instance dans le View Model
* ajouter un listener des événements que l'on veut suivre
* appeler `positioning.update()` lors des ces événements

### Errorify et Notify

Vous aurez remarqué dans le code l'utilisation de méthodes qui viennt d'`aurelia-resources`:

* `errorify(error: Error, options?: NotifyOptions)` et
* `notify(message: string, options?: NotifyOptions)`

Ces méthodes permettent d'afficher un message temporaire à l'écran selon ce qui vient de se passer. 

The options are:

```ts
export interface NotifyOptions {
  append?: boolean; // true by default, append messages so that they stay as long as configured with timeout
  containerSelector?: string; // CSS selector pointing to the container where the message must be published
  timeout?: number; // time in milliseconds that the message must stay visible
  viewModel?: any; // optional settings to use a specific component to display the notification. By defaults it uses ArNotification from aurelia-resources
  limit?: number; // not used
  type?: 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'accent' | 'action';
  sendToSentry?: boolean; // if sentry is configured, this boolean can indicate to also send the message to sentry
  context?: { // context used for Sentry
      [key: string]: any;
  };
}
```

#### Configuration par défaut des message errorify et notify

Ces message vont se poster dans des container. La convention est que le template principal de l'application contient les DIV suivants:

```html
<!-- app.html -->
<div class="notify-top-host"></div>
<div class="notify-bottom-host"></div>
```

Avec des CSS du style:

```css
/* app.css */
body > .notify-top-host,
body > .notify-bottom-host {
  position: absolute;
  width: 100%;
  z-index: 400;
  pointer-events: none;
}
body > .notify-top-host {
  top: 0;
}

body > .notify-bottom-host {
  bottom: 0;
}
body > .notify-top-host .ar-notification .ar-notification__message,
body > .notify-bottom-host .ar-notification .ar-notification__message {
  pointer-events: auto;
}
```

Finalement, `notify` et `errorify` ont besoin de connaître les selecteurs 

```ts
// app.ts
import { addNotifyContainerAlias, setNotifyDefaults } from 'aurelia-resources';

export class App {
  constructor() {
    // first we create two container alias, pointing to the DIV created above
    addNotifyContainerAlias('top', '.notify-top-host');
    addNotifyContainerAlias('bottom', '.notify-bottom-host');
    // this sets the default selector
    setNotifyDefaults({
      containerSelector: '.notify-top-host'
    });
  }
}
```

With all this in place, `notify` and `errorify` will publish messages into the default container (`.notify-top-host` above) or using the CSS selector provided as `NotifyOptions.containerSelector`. The aliases allow a developer to target the host by the alias name instead of the CSS selector, which reduces coupling and makes it easier to remember.


# Questions


## Validation Renderer

Problème mentionné: erreur dans le renderer `aurelia-deco/src/deco/components/form/aurelia-ux-form-renderer.ts` qui n'attribue pas les bonnes classes CSS.

Solution: ce renderer est une ancienne version - plus utilisée. Le renderer chargé par défaut est celui qui vient d'`aurelia-resources` comme on peut le voir dans le fichier `aurelia-deco/src/deco/decorators/model.ts`. La version d'aurelia resources contient les bonnes classes.

Action:
- [x] retirer l'ancienne implémentation inutile d'`aurelia-deco`. (fait)

## Clé de traduction pour les messages de validation

Besoin: utiliser des clés (de traduction) pour les messages de validation (plutôt que d'avoir le message direct).

Solution: Aurelia Validation fournit une solution utilisant la librairie de traduction par défaut (et déjà utilisée dans aurelia-deco). La documentation est ici: http://aurelia.io/docs/plugins/validation#integrating-with-aurelia-i18n

Action: 

- [x] implémenter la traduction des message d'erreurs
- [ ] ajouter les clés de traduction dans le dico

Pour info, voici les messages par défaut fournis dans Aurelia Validation:

```ts
default: "${$displayName} is invalid.",
required: "${$displayName} is required.",
matches: "${$displayName} is not correctly formatted.",
email: "${$displayName} is not a valid email.",
minLength: "${$displayName} must be at least ${$config.length} character${$config.length === 1 ? '' : 's'}.",
maxLength: "${$displayName} cannot be longer than ${$config.length} character${$config.length === 1 ? '' : 's'}.",
minItems: "${$displayName} must contain at least ${$config.count} item${$config.count === 1 ? '' : 's'}.",
maxItems: "${$displayName} cannot contain more than ${$config.count} item${$config.count === 1 ? '' : 's'}.",
min: "${$displayName} must be at least ${$config.constraint}.",
max: "${$displayName} must be at most ${$config.constraint}.",
range: "${$displayName} must be between or equal to ${$config.min} and ${$config.max}.",
between: "${$displayName} must be between but not equal to ${$config.min} and ${$config.max}.",
equals: "${$displayName} must be ${$config.expectedValue}.",
```

## Validation personnalisée (autres règles)

Besoin: créer des règles de validation personnalisées ou personnaliser le message de validation "required"

Solution proposée: créer un décorateur spécifique pour chaque besoin. Un exemple:

```
// custom-validation-decorator.ts
import { validate } from 'aurelia-deco';

export const requiredProject = <T>(target: T, key: keyof T, descriptor?: PropertyDescriptor): void | any => {
  if (descriptor) descriptor.writable = true;
  validate.addTargetValidation(target, 'requiredProject', key);
  if (descriptor) return descriptor;
}

validate.ValidationRules.customRule(
  `validate:requiredProject`,
  (value: any, obj: any, options: any) => {
    console.log('validation', value);
    return value !== null
      && value !== undefined
      && value !== '';
  },
  `requiredProject`
);
```

Et modification dans le modèle:

```ts
  @type.string
  @validate.required
  title: string = '';

  // devient

  @type.string
  @requiredProject
  title: string = '';
```

Ce qui aura pour effet de demander une autre clé de traduction pour la validation de type "required" du champs title. On peut bien entendu améliorer ce mécanisme en créant un décorateur qui accepte un paramètre de clé de traduction. Exemple d'utilisation finale:

```ts
  @type.string
  @requiredWithCustomKey('requiredTitle')
  title: string = '';

  @type.string
  @requiredWithCustomKey('requiredDescription')
  description: string = '';
```

## A traiter plus tard

* Découplage de aurelia-deco


