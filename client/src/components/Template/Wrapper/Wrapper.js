import React, { Component } from "react";
import "./Wrapper.css";
import { connect } from 'react-redux';
import { Redirect } from "react-router-dom";

import { clearRedirect } from '../../../store/actions/redirectActions';

const Wrapper = (props) => {
  
  let link = ( props.previousPath != undefined ) ? props.previousPath : ( props.redirect.link != undefined ) ? props.redirect.link : null;

  if( props.redirect.run == true && link != null ) {
    props.clearRedirect();
    return <Redirect to={link} />;
  } else {
    return  <div>{props.children}</div> 
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