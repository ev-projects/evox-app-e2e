import React from "react";
import { Route, Redirect } from "react-router-dom";

import Validator from "../services/Validator";
import { connect } from 'react-redux';

/**
 *
 *  This function secures the Route being accessed, checking if there's
 *   an authenticated login first before showing the exact component being accessed.
 *
 */

const  ProtectedRoute = (props) => {

  return (
    <Route {...props.routeProps}  render={() => {

          const { user } = props;
          const { page } = props;

          // If User has Emp Num (Which means Auth is Successful), show the Actual Component.
          if ( Validator.isValid(user.emp_num) ) {
            return <div>{props.children}</div>;

          // If NOT Authenticated, Redirect to Login
          } else {

            // If page is currently being loaded and not fully rendering, don't redirect yet on Login
            if( !page.isReloading ){
              return (
                <Redirect to={{pathname: global.login_url,state: {from: props.location}}}/>
              );
            }

          }
        }
      }
    />
  );
}


const mapStateToProps = (state) => {
  return {
      user : state.user,
      page : state.page
  }
}

export default connect(mapStateToProps, null)(ProtectedRoute);