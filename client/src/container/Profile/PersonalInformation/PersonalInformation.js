import React, { useState } from 'react';
import "./PersonalInformation.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import Select from "react-select";
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import Authenticator from "../../../services/Authenticator";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';

import { fetchProfile, updateUserProfile } from '../../../store/actions/profile/profileActions' ;
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import ChangePasswordForm from "../../../components/ChangePasswordForm";
import { Link } from "react-router-dom"; 

const PersonalInformation = ( props ) => {

    const [showChangePasswordForm, setShowChangePasswordForm] =  useState( false );

    const { profile, user } = props;

    const is_disabled = (user.id === profile.details.id && Authenticator.checkRole('client') ? false : true)

    const options = [
      { value: 1, label: 'Active' },
      { value: 0, label: 'Inactive' },
    ]
    
    function onSubmitHandler(values) {

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

        if (window.confirm("Are you sure you want to save these changes?")) {
            
            formData['_method'] = 'PUT';
            props.updateUserProfile( profile.details.id, formData );
        }
    }
  
    const initialValue = {
        first_name : profile.details?.first_name ? profile.details.first_name : null,
        last_name : profile.details?.last_name ? profile.details.last_name : null,
        email : profile.details?.email ? profile.details.email : null,
        mobile_number : profile.details?.mobile_number ? profile.details.mobile_number : null,
    }
  
    var validationSchema = Yup.object().shape({
        first_name : Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),         
        last_name : Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),         
        email : Yup.string().min(3, '3 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").email('Not a valid email address.').nullable(),
        mobile_number : Yup.string().min(1, '11 Minimum Characters').max(50, '50 Maximum Characters').required("This field is required").nullable(),
    });

   return ( 
        Validator.isValid( profile ) ?
        <Formik 
            enableReinitialize
            onSubmit={onSubmitHandler} 
            validationSchema={validationSchema} 
            initialValues={initialValue}
        >
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
            <form onSubmit={handleSubmit}>
                <Row>            
                    <div className="col-lg-8" >
                        <h4>Basic Information</h4>

                        { // Show Status and Employee Numbers if viewing other profiles OR viewing own profile (if not client).
                         user.id != profile.details.id || (!Authenticator.checkRole('client')  && user.id == profile.details.id) ?
                            <Row>
                                <div className="col-lg-6 col-md-6 col-sm-12">  
                                    <label> Status: </label>    
                                    { profile.details.is_active != null ?
                                        <InputGroup>
                                            <Select
                                                name="year"
                                                className="year-dropdown col-lg-12"
                                                placeholder="Select Status"
                                                isDisabled={true}
                                                value={options.filter(option => option.value === profile.details.is_active)}
                                                options={options}
                                            />
                                        </InputGroup> 
                                        :
                                        null
                                    }
                                </div>
                                <div className="col-lg-6 col-md-6 col-sm-12"> 
                                    <label> Employee Number: </label>    
                                    <InputGroup>
                                        <FormControl class="form-control" variant="primary" disabled={is_disabled} value={profile.details?.emp_num}  />
                                    </InputGroup>
                                </div> 
                            </Row>  
                            : 
                            null
                        } 
                            
                        
                        <Row>
                            <div className="col-lg-6 col-md-6 col-sm-12"> 
                                <label> First Name: </label> 
                                <InputGroup>
                                    <FormControl class="form-control" variant="primary" disabled={is_disabled} name="first_name" onChange={handleChange} value={values.first_name} />
                                    <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name={"first_name"} className="input-feedback" />
                                    </Form.Control.Feedback> 
                                </InputGroup>
                            </div> 
                            <div className="col-lg-6 col-md-6 col-sm-12">  
                                <label> Last Name: </label>    
                                <InputGroup>
                                    <FormControl class="form-control" variant="primary" disabled={is_disabled} name="last_name" onChange={handleChange} value={values.last_name}  />
                                    <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name={"last_name"} className="input-feedback" />
                                    </Form.Control.Feedback> 
                                </InputGroup> 
                            </div> 
                        </Row>
                        
                        { // Show Birthday and Nickname if viewing other profiles OR viewing own profile (if not client).
                         user.id != profile.details.id || (!Authenticator.checkRole('client')  && user.id == profile.details.id) ?
                            <Row>  
                                <div className="col-lg-6 col-md-6  col-sm-12">  
                                    <label> Nickname: </label>    
                                    <InputGroup>
                                        <FormControl class="form-control" variant="primary" disabled={is_disabled} value={profile.details.nickname}  />
                                    </InputGroup> 
                                </div> 
                                <div className="col-lg-6 col-md-6  col-sm-12">  
                                    <label> Birth Date: </label>    
                                    <InputGroup>
                                        <FormControl class="form-control" variant="primary" disabled={is_disabled} value={profile.details.birthdate}  />
                                    </InputGroup> 
                                </div> 
                            </Row>
                            : 
                            null
                        }   
                    
                            <React.Fragment>
                                <hr /> 
                                <h4>Contact Information</h4>
                                <Row>  
                                    { // Show Mobile Number if the viewing own profile OR the currently logged user in has no client role.
                                    user.id === profile.details.id || !Authenticator.checkRole('client') ?
                                        <div className="col-lg-6 col-md-6 col-sm-12"> 
                                            <label> Mobile Number: </label>    
                                            <InputGroup>
                                                <FormControl class="form-control" variant="primary" disabled={is_disabled} name="mobile_number" onChange={handleChange} value={values.mobile_number}  />
                                                <Form.Control.Feedback type="invalid">
                                                    <ErrorMessage component="div" name={"mobile_number"} className="input-feedback" />
                                                </Form.Control.Feedback> 
                                            </InputGroup> 
                                        </div>
                                        :
                                        null
                                    }
                                    <div className="col-lg-6 col-md-6 col-sm-12">  
                                        <label> Email Address: </label>    
                                        <InputGroup>
                                            <FormControl class="form-control" variant="primary" disabled={is_disabled} name="email" onChange={handleChange} value={values.email}  />
                                            <Form.Control.Feedback type="invalid">
                                                <ErrorMessage component="div" name={"email"} className="input-feedback" />
                                            </Form.Control.Feedback> 
                                        </InputGroup> 
                                    </div> 
                                </Row> 
                            </React.Fragment>
                        <hr /> 
                        <Row>
                            <Col size="6">  
                                { // Show Buttons if viewing own profiles.
                                user.id === profile.details.id ?
                                    <React.Fragment>
                                        { Authenticator.checkRole('client') ? <Button type="submit" className="btn btn-primary" ><i className="fa fa-edit" /> Save</Button> : null }&nbsp;
                                        <Button type="button" className="btn btn-secondary" onClick={()=> {setShowChangePasswordForm(true)}} ><i className="fa fa-edit" /> Change Password</Button>
                                    </React.Fragment>
                                    : 
                                    null
                                }
                            </Col>
                        </Row>
                        <br/>
                        {
                            showChangePasswordForm ? 
                            <ChangePasswordForm {...props} setShowChangePasswordForm={setShowChangePasswordForm} size="12"/>
                            : 
                            null
                        }
                    </div>
                </Row>
            </form>
        )}
        </Formik>
        :
        null
    );

};

const mapStateToProps = (state) => {
    return {
        profile : state.profile,
        user : state.user
    }
} 

const mapDispatchToProps = (dispatch) => {

    return {
      updateUserProfile : ( id, formData ) => dispatch( updateUserProfile( id, formData ) )
  
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(PersonalInformation);