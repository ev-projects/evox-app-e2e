import React, { Component } from "react";
import "./Profile.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchProfile, changePassword } from '../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../components/Template/Wrapper";
import QuickPunch from "../QuickPunch";
import BackButton from "../../components/Template/BackButton";
import Validator from "../../services/Validator";

class Profile extends Component {
    constructor(props){
      super(props)

      this.initialState = {

        showChangePasswordForm : false,
      }
      

      this.state = this.initialState; 
    }
    
    componentWillMount(){
        this.props.fetchProfile( this.props.params.id );
    }

    
    componentWillReceiveProps = async(nextProps) => {
        
        // If the closeAllForm is triggered, manually set all the showing of forms to False.
        if( nextProps.profile?.closeAllForm  ) {
            
           this.setShowChangePasswordForm(false);
        }
    }

    
    componentDidUpdate(prevProps) {
        if (this.props.location.pathname !== prevProps.location.pathname) {
            this.onRouteChanged();
        }
    }

    onRouteChanged() {
      this.props.fetchProfile( this.props.params.id );
    }

    setShowChangePasswordForm = ( bool ) => {
        this.setState({
            showChangePasswordForm : bool
        })
    }

    render(){
      const { profile, user, page } = this.props;
        console.log(profile)
        return (
            <Wrapper >
               <ContainerWrapper>
                  <ContainerBody>
                    { Object.keys(profile.details).length > 0 && !page.isReloading ?
                        <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                            <Row>
                                <Content col="5" title="User Profile"  subtitle={ <BackButton {...this.props}/>} >
                                        
                                            <Row>
                                                <div className="col-lg-4 text-center" >
                                                    <img src={ Validator.isValid( profile.profilePicture ) ? "data:image/jpg;base64,"+ profile.profilePicture : "/images/default-user-image.png"}
                                                        style={{'marginTop': '15px'}} />
                                                </div>
                                                <div className="col-lg-8" >
                                                    
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> Name: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.full_name}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> Username: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.username}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> E-mail: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.email}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                </div>
                                            </Row>
                                            <br/>
                                            <Row>
                                                <div className="col-lg-12" >
                                                    { profile.details.id == user.id ?
                                                        <Button type="button" className="btn btn-secondary" onClick={()=> {this.setShowChangePasswordForm(true)}} >Change Password</Button>
                                                        :
                                                        null
                                                    }
                                                    
                                                </div>
                                            </Row>
                                </Content>
                                {
                                    this.state.showChangePasswordForm ? 
                                    <ChangePasswordForm {...this} />
                                    : 
                                    null
                                }
                            </Row>
                        </div>
                    :
                        null
                    }
                  </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
        );
    }
};


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

        // If action is NULL, it means it's either store/update
        if (window.confirm("Are you sure you want to change your password?")) {
            await context.props.changePassword( context.props.profile.details.id, formData );
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

    return  <Content col="5" title="Change Password"  >
                <Formik 
                    enableReinitialize
                    onSubmit={onSubmitHandler} 
                    validationSchema={validationSchema} 
                    initialValues={initialValue}>
                    {
                    ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                    <form onSubmit={handleSubmit}>
                        <Row>  
                            <Col size="12">         
                                <label> Current Password: </label> 
                                <InputGroup>   
                                    <FormControl class="form-control"  type="password" variant="primary" name="current_password" onChange={handleChange} value={values.current_password} />
                                    <Form.Control.Feedback type="invalid">
                                        <ErrorMessage component="div" name={"current_password"} className="input-feedback" />
                                    </Form.Control.Feedback> 
                                </InputGroup> 
                            </Col> 
                        </Row>   
                        <Row>  
                            <Col size="12">        
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
                            <Col size="12">      
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
                            <Col size="12"> 
                            <Button type="submit" className="btn btn-secondary" >Update</Button>&nbsp;
                            <Button type="button" className="btn btn-secondary" onClick={()=> {context.setShowChangePasswordForm(false)}} >Cancel</Button>
                            </Col> 
                        </Row> 
                    </form>
                    )}
                    
                </Formik>
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
    fetchProfile : ( id ) => dispatch( fetchProfile( id) ),
    changePassword: ( id, formData) => dispatch( changePassword( id, formData) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Profile);
