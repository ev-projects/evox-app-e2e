import React, { Component } from "react";
import { connect } from 'react-redux'
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import { useFormikContext } from 'formik';
import { Link } from "react-router-dom"; 
import Authenticator from "../../../services/Authenticator";
const RequestSubtitle = ( props ) => {
    
    return ( props.method == "approval" && props.user != undefined  ?
      <div style={{float:''}}>
      <Link to={{
                                pathname: global.links.profile + props.user.id
                              }} className ="is-black">

        <span>{   (props.user.full_name==undefined ? props.user.name : props.user.full_name ) }</span>   <br/>
        </Link>
        { Authenticator.check('supervisor', ['view_employee_personal_info','view_employee_job_info']) ?
                        <Link to={{
                                pathname: global.links.profile + props.user.id
                              }}
                            title="View Profile"
                        >
                          <i className="fa fa-info ev-color" aria-hidden="true"></i>
                        </Link>
                     :
                    <> <span>Name: {   (props.user.full_name==undefined ? props.user.name : props.user.full_name ) }</span> <br/></>
                     }
        
        <span>{ props.user.department } </span> <span>( {   (props.user.timezone ) } )</span> 
     
      </div> 
      : null 
    );
}

export default connect(null, null)(RequestSubtitle);