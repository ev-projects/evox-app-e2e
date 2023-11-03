import React, { Component } from "react";
import "./ChangePasswordForm.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchProfile, changePassword } from '../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Validator from "../../services/Validator";

const ChangePasswordForm = ( context ) => {

   
  

    async function onSubmitHandler (values) {

        var formData = {};
        
        for (var key in values) {
            if( values[key] != null && values[key] != ""  ) {
                switch( key ) {
                    default:
                    formData[key] = values[key];
                    break;
                }
            } 
        }

        // If the instance has forceChangePassword set to true, add it as a form data.
        if(  context.forceChangePassword ) {
            formData['reset_password'] = true;
        }

        // If action is NULL, it means it's either store/update
        if (window.confirm("Are you sure you want to change your password?")) {
            context.changePassword( context.user.id, formData );
            console.log( context.changePassword( context.user.id, formData ));
        }
      
    }
  
    const initialValue = {
        current_password: null,
        new_password: null,
        confirm_new_password: null,
    }
  
    var validationSchema = Yup.object().shape({
        current_password:            Yup.string().min(6, '6 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),         
        new_password:            Yup.string().min(6, '6 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),
        confirm_new_password:    Yup.string().min(6, '6 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable()/*.match( Yup.ref('new_password'), 'Passwords do not match')*/,
    });

    return  <Content  col={ (context.size ? context.size : "8")} title={ (context.forceChangePassword ? "Reset" : "Change") +  " Password"} subtitle={ (context.forceChangePassword ? <div>This is required before doing any transactions.</div> : null)} >
               <div >
               <Formik 
                    enableReinitialize
                    onSubmit={onSubmitHandler} 
                    validationSchema={validationSchema} 
                    initialValues={initialValue}>
                    {
                    ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                    <form onSubmit={handleSubmit}>
                        <Row>  
                            <Col size="8">         
                                <label> { context.forceChangePassword ? "Temporary" : "Current" } Password: </label> 
                                <InputGroup>   
                                    <FormControl class="form-control"  type="password" variant="primary" name="current_password" onChange={handleChange} value={values.current_password} />
                                    <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name={"current_password"} className="input-feedback" />
                                    </Form.Control.Feedback> 
                                </InputGroup> 
                            </Col> 
                        </Row>   
                        <Row>  
                            <Col size="8">        
                                <label> New Password: </label>   
                                <InputGroup> 
                                    <FormControl class="form-control" type="password" variant="primary" name="new_password" onChange={handleChange} value={values.new_password} />
                                    <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name={"new_password"} className="input-feedback" />
                                    </Form.Control.Feedback> 
                                </InputGroup> 
                            </Col> 
                        </Row> 
                        <Row>  
                            <Col size="8">      
                                <label> Confirm New Password: </label>     
                                <InputGroup> 
                                    <FormControl class="form-control"  type="password" variant="primary" name="confirm_new_password" onChange={handleChange} value={values.confirm_new_password} />
                                    <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name={"confirm_new_password"} className="input-feedback" />
                                    </Form.Control.Feedback> 
                                </InputGroup> 
                            </Col> 
                        </Row> 
                        <br/>
                        <Row>  
                            <Col size="8"> 
                            <Button type="submit" className="btn btn-primary" ><i className="fa fa-edit" /> Update</Button>&nbsp;
                            { ! context.forceChangePassword ? 
                                <Button type="button" className="btn btn-secondary" onClick={()=> {context.setShowChangePasswordForm(false)}} ><i className="fa fa-ban" /> Cancel</Button> 
                                : 
                                null 
                            }
                            
                            </Col> 
                        </Row> 
                    </form>
                    )}
                    
                </Formik>
               </div>
        </Content>;
}

const mapStateToProps = (state) => {
  return {
      profile : state.profile,
      user : state.user,
      page : state.page
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    changePassword: ( id, formData) => dispatch( changePassword( id, formData) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(ChangePasswordForm);
