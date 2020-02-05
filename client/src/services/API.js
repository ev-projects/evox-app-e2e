import Validator from "./Validator";
import Formatter from "./Formatter";
import { history } from './HandleHistory';
import axios from "axios";
import { trackPromise } from "react-promise-tracker";

/**
 *  A Class that provides a secure and Token-based API Call on the indicated backend.
 *  - Automatically handles the Redirect just in case there's a problem during the call.
 */

class API  {  

  // A secure API Call Function that automatically renders and checks the Token being passed from Local Storage.
  call(config){

    // If the current instance is already Authenticated and the URL is VALID, Proceed on the call.
    if (Validator.isValid(config) && Validator.isValid(config.url)) {

      // Declare the Default Headers that will be used on the API Call.
      var default_headers = {
        "Content-Type"    : Validator.isValid(config.method) && config.method == 'put' ? "application/x-www-form-urlencoded" : "application/json" ,

        // Pass the JWT Token given on Login for Secured User Authentication 
        "Authorization"   : "Bearer " + localStorage.getItem("access_token"),

        // Pass the API KEY Given by the Backend for Secured Request Authentication
        'X-Authorization' : process.env.REACT_APP_API_KEY
      };
      
      // Tracks the AXIOS call (Automatically outputs the Loader)
      return trackPromise(
        axios({
          // Renders the Method on the AXIOS Call
          method: Validator.isValid(config.method) ? config.method : "get",
  
          // Renders the URL on the AXIOS Call
          url: process.env.REACT_APP_API_BASE_URL + config.url,
  
          // Renders the Headers on the AXIOS Call
          headers: Formatter.merge_json(default_headers, config.headers),
  
          // Renders the Data on the AXIOS Call
          data: Validator.isValid(config.data) ? config.data  : {},
        
        })
      ).then(response => {
        return this.format(response);
      }).catch(e => {  
        throw this.check_error(e);     
      });
      
    // Returns Bad Request if there's no URL indicated.
    } else {
      return this.format();
    }
  }

  // Checks the error for Invalid Token Responses. Returns the default Error Format by default.
  check_error(e) {
    
    //If the Error Response has Invalid Token Responses, it means that the Token being passed is invalid, hence, removing the Token and redirecting the Page to the Login screen.
    if(  Validator.isValid( e.response.data.error ) 
        && Validator.isValid( e.response.data.error.message ) 
        && global.invalid_token_response.includes( e.response.data.error.message )){
      localStorage.removeItem("access_token");
      history.push(global.login_url)
      window.location.reload(true);

    // If the Response is NOT FALSE, return the response.
    }  else {
      return this.format(e.response);
    }
  }

  // Formats the Response with default value.
  format(response){
    return {
      status: Validator.isValid(response) && Validator.isValid(response.status)? response.status : 400,
      statusText: Validator.isValid(response) && Validator.isValid(response.statusText)? response.statusText : "Bad Request",
      data: Validator.isValid(response) && Validator.isValid(response.data)? response.data : {}
    };
  }
};

export default new API();
