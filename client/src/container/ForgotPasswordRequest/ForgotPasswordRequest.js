import React, { Component } from "react";
import { connect } from 'react-redux';
import { logIn } from '../../store/actions/userActions'
import { showAlert } from '../../store/actions/settings/alertActions'
import { Link, Redirect } from "react-router-dom";
import Validator from "../../services/Validator";
import { Form,Button,Container,Col,Card,InputGroup,FormControl,Image } from 'react-bootstrap';
import { Spring } from 'react-spring/renderprops';
import { Formik,ErrorMessage } from 'formik';
import * as yup from "yup";

import styles from "./ForgotPasswordRequest.css";

import { forgotPasswordRequest } from '../../store/actions/userActions';
import { setRedirect, clearRedirect } from '../../store/actions/redirectActions';
import PageLoading from "../PageLoading";
import Formatter from "../../services/Formatter";
import BackButton from "../../components/Template/BackButton";

class ForgotPasswordRequest extends Component {

  constructor(props){
    super(props);
    this.state ={
      isSuccessful : false
    }; 
  }

  onSubmitHandler = async(values) => {
    await this.props.forgotPasswordRequest(values.email)
  }


  componentDidMount() {
    // If the HashCode and Status is in the URL parameter, proceed on calling the Request Approval Change Status
    // if ( Validator.isValid( this.props.match.params.hashCode ) && Validator.isValid( this.props.match.params.status ) ) {
    //     this.props.requestApprovalChangeStatus( this.props.match.params.hashCode, this.props.match.params.status );
    // }
  }

  componentWillReceiveProps = async(nextProps) => {
    // if( nextProps.requestApproval?.isInstanceValid != this.props.requestApproval?.isInstanceValid) {
    //     this.setState({
    //       isLoading : false
    //     })
    // }
  }

  render = () => {  

    if( this.props.redirect.run == true && this.props.redirect.link != null ) {

      this.props.clearRedirect();
      return <Redirect to={this.props.redirect.link} />;
    }
  

    return (<div id="forgotPasswordRequest">
              <Container className="min-vh-80 d-flex flex-column justify-content-center">
              <Col md={8}>
                  <Card>
                      <Card.Body>
                          <div className="card-text">
                              <Formik validationSchema={validationSchema} onSubmit={this.onSubmitHandler}
                              initialValues={{ email: '' }}>
                              {({ values, handleChange, handleSubmit, touched, errors}) => (
                                  <form onSubmit={handleSubmit}>
                                      <h3>Recover your password</h3>
                                      <span className="forgot-password-header">
                                        Please enter your e-mail address:
                                      </span>
                                      <br/>
                                      <InputGroup>
                                        <FormControl class="form-control" variant="primary" name="email" onChange={handleChange} value={values.email} />
                                        <Form.Control.Feedback type="invalid">
                                            <ErrorMessage component="div" name={"email"} className="input-feedback" />
                                        </Form.Control.Feedback> 
                                      </InputGroup> 



                                    <Button type="submit" >
                                      <i className="fa fa-location-arrow" />  Submit
                                    </Button>
                                    &nbsp;
                                    <BackButton  style={{'float': 'right'}} {...this.props} />
                                  </form>
                                  )}
                              </Formik>
                          </div>
                      </Card.Body>
                  </Card>
              </Col>
          </Container>
            </div>
  );
  }
}


// Object for Data Validation
const validationSchema = yup.object().shape({
  email: yup
    .string()
    .min(3)
    .max(255)
    .required()
});

const mapStateToProps = (state) => {
  return {
    redirect          : state.redirect
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      forgotPasswordRequest: ( email ) => dispatch( forgotPasswordRequest( email ) ),
      clearRedirect : () => dispatch( clearRedirect() )
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(ForgotPasswordRequest);
