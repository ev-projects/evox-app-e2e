import React, { useState } from 'react';
import "./PersonalInformation.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import Select from "react-select";
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchPersonalInformation, changePassword } from '../../../store/actions/profile/profileActions' ;
import Authenticator from "../../../services/Authenticator";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import ChangePasswordForm from "../../../components/ChangePasswordForm";
import { Link } from "react-router-dom"; 

const PersonalInformation = ( props ) => {

    const [showChangePasswordFormState, setShowChangePasswordFormState] =  useState( false );

    const { profile, user } = props;

    const options = [
      { value: 1, label: 'Active' },
      { value: 0, label: 'Inactive' },
    ]

   return ( 
        Validator.isValid( profile ) ?
        <Row>            
            <div className="col-lg-8" >
                <h4>Basic Information</h4>
                
                   
                    { !Authenticator.checkRole('client') ? 
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
                            <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.emp_num}  />
                        </InputGroup>
                    </div> 
                        </Row>
                        : 
                        null
                      }   
                    
                
                <Row>
                    <div className="col-lg-6 col-md-6 col-sm-12"> 
                        <label> Full Name: </label> 
                        <InputGroup>
                            <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.full_name}  />
                        </InputGroup>
                    </div> 
                    <div className="col-lg-6 col-md-6 col-sm-12">  
                        <label> Nick Name: </label>    
                        <InputGroup>
                            <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.nickname}  />
                        </InputGroup> 
                    </div>     
                </Row>
                 { !Authenticator.checkRole('client') ? 
                      <Row>  
                    <div className="col-lg-6 col-md-6  col-sm-12">  
                        <label> Birth Date: </label>    
                        <InputGroup>
                            <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.birthdate}  />
                        </InputGroup> 
                    </div> 
                </Row>
                        
                        : 
                        null
                      }   
               
                <hr /> 
                <h4>Contact Information</h4>
                {!Authenticator.check('client') ?
                    <Row>  
                       <div className="col-lg-6 col-md-6 col-sm-12"> 
                            <label> Mobile Number: </label>    
                            <InputGroup>
                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.personal_information?.mobile_phone}  />
                            </InputGroup> 
                        </div>
                       <div className="col-lg-6 col-md-6 col-sm-12">  
                            <label> Work Email: </label>    
                            <InputGroup>
                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.email}  />
                            </InputGroup> 
                        </div> 
                    </Row> 
                    :
                    null
                }
                <hr /> 
                <Row>
                    <Col size="6">  
                        { profile.details.id == user.id ?
                            <Button type="button" className="btn btn-secondary" onClick={()=> {setShowChangePasswordFormState(true)}} >Change Password</Button>
                            :
                            null
                        }
                    </Col>
                </Row>
                <br/>
                {
                    showChangePasswordFormState ? 
                    <ChangePasswordForm {...props} setShowChangePasswordFormState={setShowChangePasswordFormState} size="12"/>
                    : 
                    null
                }
            </div>
        </Row>
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

export default connect(mapStateToProps, null)(PersonalInformation);