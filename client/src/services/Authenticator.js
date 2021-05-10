
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
  }
  
  export default new Authenticator();
  