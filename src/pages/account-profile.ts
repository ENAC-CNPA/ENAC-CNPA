import {inject} from 'aurelia-framework';
import { Global } from 'global';
import { getLogger, Logger } from 'aurelia-logging';
import { UserModel, errorHandler, ProfileModel, ProfileHelper } from 'aurelia-swissdata';
import { countries } from 'aurelia-resources';

@inject(Global)
export class AccountProfile {    

  private log: Logger;
  editingUserInstance: UserModel;
  editingProfileInstance: ProfileModel;
  countries = countries;
  
  constructor(private global: Global) {
    this.log = getLogger('page:account-profile');
  }

  public async logout() {
    this.global.logout();
  }

  public activate() {
    return ProfileHelper.getCurrentProfile().then(() => {
      this.editingProfileInstance = ProfileHelper.getEditingInstance();
      this.editingUserInstance = ProfileHelper.getEditingUserInstance();
      if (!this.editingProfileInstance || !this.editingUserInstance) return false;
    });
  }

  public updateProfile() {
    let promises: Array<Promise<any>> = [];
    promises.push(this.editingProfileInstance.updateProperties('', ['picture', 'street', 'zip', 'city', 'country']));
    promises.push(this.editingUserInstance.updateProperties('', ['firstname', 'lastname']/*, {route: `/app/5b90ff91009a891c3a07bed4/user/${this.editingUserInstance.id}`}*/));
    Promise.all(promises).then(() => {
      let promises2: Array<Promise<any>> = [];
      promises2.push(this.global.swissdataApi.setCurrentUser());
      promises2.push(ProfileHelper.getCurrentProfile())
      return Promise.all(promises);
    }).then(() => {
      // this.drawer.close();
      // setTimeout(() => {
      //   this.editingProfileInstance = undefined;
      //   this.editingUserInstance = undefined;
      // }, 10)
    }).catch(errorHandler('main'));
  }
}
