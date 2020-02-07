import React, { Component } from 'react';
import { Alert, Fade } from 'react-bootstrap';
import { connect } from 'react-redux'

import './AlertContainer.css';

const AlertContainer = (props) => {
    
  const { alert } = props;


  // This handles the Timeout where it triggers the hideAlert after a specific time.
  if( alert.onShow  && alert.timeOut != 0) {
    const timeOut = window.setTimeout(()=>{
      props.hideAlert();
    }, alert.timeOut)
  }


  
  // Declares the header. Nothing must show if there are no contents on the alert.header.
  const header = alert.header && <Alert.Heading className="alert-heading text-center">{alert.header}</Alert.Heading>;

  
  /** Body List iteration */
    let body_list = [];

    // If the Body has an array as parameter, loops it to create a multiple list to be shown as message.
    if( Array.isArray( alert.body ) ) {
      alert.body.forEach(string => {
        body_list.push(<li>{string}</li>);
      });

    // If the Body has an string as parameter, sets it as list to be shown as message.
    }  else if ( alert.body != "" ){
      body_list = <li>{alert.body}</li>;
    }

    // Declares the body where the Body List is being shown. Nothing must show if there are no contents on the Body_list.
    const body =  alert.body != "" && <ul>{body_list}</ul>


    return (
      alert.onShow &&
      <Fade in={alert.onShow}>
        <div className="alert-pop-up">
          <Alert className="alert-container"  variant={alert.variant} onClose={props.hideAlert} dismissible>
            {header}
            <div className="alert-body">
                {body}
            </div>
          </Alert>
        </div>
      </Fade>
    );
}


const mapStateToProps = (state) => {
  return {
      alert : state.alert
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    hideAlert: () => dispatch({'type': 'HIDE_ALERT'}),
    toggleTimeOut : () => dispatch({'type': 'TOGGLE_TIMEOUT'}),
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(AlertContainer);