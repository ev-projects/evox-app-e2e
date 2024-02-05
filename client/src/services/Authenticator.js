
import store from '../store'
/**
 *  a Class dedicated on Authenticating User Roles and Permissions
 */
class Authenticator {

    /**
     * Checks if the Permission is existing on the currently logged in user.
     */
    checkPermission = ( permission ) => {
      if (permission != "" && (permission != null) && (permission != undefined)) {
          if( permission instanceof Array ) {
            return permission.some( r => store.getState().user?.permissions?.includes(r) );
          }else {
            return store.getState().user?.permissions?.includes( permission );
          }
        return false;
      }
      return false;
    }
  
    /**
     * Checks if the Role is existing on the currently logged in user.
     */
    checkRole = ( role ) => {
        if (role != "" && (role != null) && (role != undefined)) {
            if( role instanceof Array ) {
              return role.some( r => store.getState().user?.roles?.includes(r) );
            }else {
              return store.getState().user?.roles?.includes( role );
            }
            
          return false;
        }
        return false;
    }


    /**
     * Checks for both Permission and Role of the Currently Logged in user.
     */
    check =( role, permission ) => {
        return  this.checkRole( role ) && this.checkPermission( permission );
    }

     /**
     * Checks for both Permission and Role of the Currently Logged in user.
     */
     check_department_permissions =() => {
      return store.getState().user?.schedule_active == true;
  }

///////////////////////////////////////////////////////////////////////// NEW VERSION

  scanFeature = ( features ) => {
    if (features != "" && (features != null) && (features != undefined)) {
        if( features instanceof Array ) {
          return features.some( r => store.getState().user?.features_access?.includes(r) );
        }else {
          return store.getState().user?.features_access?.includes( features );
        }
      return false;
    }
    return false;
  }

  scanLevel = ( level ) => {
      if (level != "" && (level != null) && (level != undefined)) {
        if( store.getState().user?.level?.Name != "" && (store.getState().user?.level?.Name != null) && (store.getState().user?.level?.Name != undefined)){
            if( level instanceof Array ) {
              // return level.some( r => store.getState().user?.roles?.includes(r) );
              return level.includes(store.getState().user?.level?.Name);
            }else {
              return store.getState().user?.level == level;
            }
         
          
        }

        return false;
      }
      return false;
  }

  scanLevel_Feature =( level, features ) => {
      return  this.scanLevel( level ) && this.scanFeature( features );
  }



  }
  
  export default new Authenticator();
  