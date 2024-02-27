import React, { Component } from "react";
import "./Wrapper.css";
import { connect } from 'react-redux';
import { Redirect } from "react-router-dom";

import { ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { clearRedirect } from '../../../store/actions/redirectActions';
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import PageNotFound from "../../../container/PageNotFound";
import PageNotAllowed from "../../../container/PageNotAllowed";

const Wrapper = (props) => {
  
  let link = ( props.location?.previousPath != undefined ) ? props.location?.previousPath : ( props.redirect.link != undefined ) ? props.redirect.link : null;
  
  // // Check if a role is needed to be authenticated
  // const role = props?.role ? props.role : null;

  // // Check if a permission is needed to be authenticated
  // const permission = props?.permission ? props.permission : null;

   // Check if a role is needed to be authenticated
   const level = props?.level ? props.level : null;

   // Check if a permission is needed to be authenticated
   const feature = props?.feature ? props.feature : null;

  
  let allow_to_show = true;

  // // If role and permission are to be checked, proceed on this code
  // if( Validator.isValid( role )  && Validator.isValid( permission ) ) {

  //     allow_to_show = Authenticator.check( role, permission );

  // // If permission only is to be checked, proceed on this code
  // } else if( !Validator.isValid( role )  && Validator.isValid( permission ) ) {

  //   allow_to_show = Authenticator.checkPermission( permission );
    
  // // If role only is to be checked, proceed on this code
  // }else if( Validator.isValid( role )  && !Validator.isValid( permission ) ) {

    // allow_to_show = Authenticator.checkRole( role );
    
  // }


  if( Validator.isValid( level )  && Validator.isValid( feature ) ) {

      allow_to_show = Authenticator.scanLevel_Feature( level, feature );


  } else if( !Validator.isValid( level )  && Validator.isValid( feature ) ) {

    allow_to_show = Authenticator.scanFeature( feature );
    

  }else if( Validator.isValid( level )  && !Validator.isValid( feature ) ) {

    allow_to_show = Authenticator.scanLevel( level );
    
  }


  if( props.redirect.run == true && link != null ) {

    props.clearRedirect();
    return <Redirect to={link} />;

  } else {

    return  (
      allow_to_show ? 
       <React.Fragment> {props.children}</React.Fragment>
      : 
        <PageNotAllowed />
    ) 
  }

}

const mapStateToProps = (state) => {
  return {
    redirect          : state.redirect
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    clearRedirect : () => dispatch( clearRedirect() )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Wrapper);