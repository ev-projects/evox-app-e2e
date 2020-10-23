
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
          if( store.getState().user?.permissions?.includes( permission ) ) {
            return true;
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
            if( store.getState().user?.roles?.includes( role ) ) {
              return true;
            }
          return false;
        }
        return false;
    }


    /**
     * Checks for both Permission and Role of the Currently Logged in user.
     */
    check =( role, permission ) => {
        return this.checkPermission( permission ) && this.checkRole( role );
    }
  }
  
  export default new Authenticator();
  