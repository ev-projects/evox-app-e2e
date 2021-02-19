import React from "react";
import { Route, Redirect } from "react-router-dom";
import withRouter from '../services/HandleRoute';

import Validator from "../services/Validator";
import { connect } from 'react-redux';
import ChangePasswordForm from "../components/ChangePasswordForm";
import { ContainerBody, ContainerWrapper } from "../components/GridComponent/AdminLte";

/**
 *
 *  This function secures the Route being accessed, checking if there's
 *   an authenticated login first before showing the exact component being accessed.
 *
 */

const  ProtectedRoute = (props) => {

  return (
    <Route {...props.routeProps} render={() => {

          const { user } = props;
          const { page } = props;

          // If User has Emp Num (Which means Auth is Successful), show the Actual Component.
          if ( Validator.isValid(user.emp_num) ) {

            let childrenWithProps;

            // If the user is forced to change password ( through forgot password process ), mandatorily show the Change Password Form before any components.
            if( Validator.isValid( user.force_change_password ) ) {

              childrenWithProps = <ContainerWrapper>
                                    <ContainerBody>
                                      <ChangePasswordForm forceChangePassword={true} />
                                    </ContainerBody>
                                 </ContainerWrapper>;

            // If the user is NOT forced to change password, show the actual component being accessed.
            } else {
              
              childrenWithProps = React.Children.map(props.children, child =>
                React.cloneElement(child, { params: props.computedMatch.params, ...props })
              );

            }

            return <div>{childrenWithProps}</div>;

          // If NOT Authenticated, Redirect to Login
          } else {
            
            // Set the URL being accessed as the urlQueryString to be passed on the login which will make the redirect after the login towards the pathname.
            let urlQueryString =  "";
            if( Validator.isValid( props.location?.pathname ) ){
              urlQueryString = props.location?.pathname;
            }

            // If page is currently being loaded and not fully rendering, don't redirect yet on Login
            if( !page.isReloading ){

              // If has clear login parameters props set to true, remove the search object from the Redirect components
              if( props.user.clearLoginParameters ) {
                return (
                  <Redirect to={{pathname: global.login_url, state: {from: props.location}}}/>
                );

              // If clear login parameters is not set, add the Url Query String when being redirected on the login url.
              } else {
                return (
                  <Redirect to={{pathname: global.login_url, state: {from: props.location}, search: "?redirect="+urlQueryString }}/>
                );
              }
              
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

export default connect(mapStateToProps, null)( withRouter(ProtectedRoute));