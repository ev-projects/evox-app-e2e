import React, { Component,useState } from "react";
import "./ChangePasswordFormComponent.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchProfile, changePassword } from '../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Validator from "../../services/Validator";

class ChangePasswordFormComponent  extends Component {


    constructor(props, context) {
        super(props, context);
        // const [showChangePasswordForm, setShowChangePasswordForm] =  useState( false );
        this.state = {
            // showChangePasswordForm :false,
            // setShowChangePasswordForm : false
          };
          

      }

       componentWillReceiveProps = async(nextProps) => {
        if(this.props.profile.closeAllForm == true){
            this.props.setShowChangePasswordForm(false)
        }
         }

    onSubmitHandler = async (values) => {

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
        // if (window.confirm("Are you sure you want to change your password?")) {
            console.log(this.props,this.props.profile.closeAllForm);

            this.props.changePassword( this.props.user.id, formData );
           
            console.log(this.props,this.props.profile.closeAllForm);
          
                // if(this.props.profile.closeAllForm == true){
                //     this.props.setShowChangePasswordForm(false)
                // }
               
           
            
        // }
      
    }
    render = () => {
        const initialValue = {
            current_password: null,
            new_password: null,
            confirm_new_password: null,
        }
      
     
    
        return  <Content  col={12} title={"Change" +  " Password"} >
                   <div >
                   <Formik 
                        enableReinitialize
                        onSubmit={this.onSubmitHandler} 
                        validationSchema={this.validationSchema} 
                        initialValues={initialValue}>
                        {
                        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                        <form onSubmit={handleSubmit}>
                            <Row>  
                                <Col size="8">         
                                    <label> { "Current" } Password: </label> 
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
                                
                                <Button type="button" className="btn btn-secondary" onClick={()=> {  console.log(this.props);this.props.setShowChangePasswordForm(false)}} ><i className="fa fa-ban" /> Cancel</Button> 
                                
                                
                                </Col> 
                            </Row> 
                        </form>
                        )}
                        
                    </Formik>
                   </div>
            </Content>;
    }
}
const validationSchema = Yup.object().shape({
    current_password:            Yup.string().min(6, '6 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),         
    new_password:            Yup.string().min(6, '6 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable(),
    confirm_new_password:    Yup.string().min(6, '6 Minimum Characters').max(255, '255 Maximum Characters').required("This field is required").nullable().oneOf([Yup.ref('new_password')], 'Your passwords do not match.'),
});
const mapStateToProps = (state) => {
  return {
      profile : state.profile,
      user : state.user,
      page : state.page,
      closeAllForm : state.closeAllForm,
      
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    changePassword: ( id, formData) => dispatch( changePassword( id, formData) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(ChangePasswordFormComponent);
