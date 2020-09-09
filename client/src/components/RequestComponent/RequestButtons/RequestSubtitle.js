import React, { Component } from "react";
import { connect } from 'react-redux'
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import { useFormikContext } from 'formik';

const RequestSubtitle = ( props ) => {
    
    return ( props.method == "approval" && props.user != undefined  ?
      <div style={{float:''}}>
        <span>Name: { props.user.full_name }</span> <br/>
        <span>Department: { props.user.department }</span>
      </div> 
      : null 
    );
}

export default connect(null, null)(RequestSubtitle);