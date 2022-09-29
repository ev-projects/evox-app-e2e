import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { logIn } from '../../store/actions/userActions'
import { showAlert } from '../../store/actions/settings/alertActions'
import { Redirect } from "react-router-dom";
import Validator from "../../services/Validator";
import { Form,Button,Container,Col,Card,InputGroup,FormControl,Image } from 'react-bootstrap';
import { Spring } from 'react-spring/renderprops';
import { Formik } from 'formik';
import * as yup from "yup";

import styles from "./Login.css";

class Login extends Component {

  onSubmitHandler = (values) => {
    this.props.logIn(values)
  }

    
  componentWillMount() {
    // If there's a redirect parameter in the Login page, prompt a Alert to inform that they need to login to access the link.
    if ( Validator.isValid( this.props.location?.search ) && new URLSearchParams(this.props.location.search).get('redirect') != null) {
        this.props.showAlert( "Please login to access the link.", 3000 );
    }
}

  render = () => {  

    const { user } = this.props

    let googleLoginUrl = process.env.REACT_APP_BACKED_ROOT_URL + "/google-login";

    // Check if there's a redirect link and if so, use that redirect link instead of the default dashboard link.
    let redirect_link = global.links.dashboard;
    if( Validator.isValid( this.props.location?.search ) ){
      redirect_link = new URLSearchParams(this.props.location.search).get('redirect');
    }
    
    if( Validator.isValid( localStorage.getItem("access_token") ) && Validator.isValid(user.id) ) {
      return <Redirect to={redirect_link} />
    } 

    return (
    <Spring 
      from={{ opacity: 0 }} 
      to={{ opacity: 1 }} 
      config={{ delay: 400, duration: 400 }}
    >
      {props => (
        <div className="login-wrapper">
          <Container style={props} className="min-vh-80 d-flex flex-column justify-content-center">
              <Col md={5}>
                  <Card>
                      <Card.Body>
                          <Image src={process.env.PUBLIC_URL +"/images/logo.png"} className="image_header" fluid />
                          <div className="card-text">
                              <Formik validationSchema={validationSchema} onSubmit={this.onSubmitHandler}
                              initialValues={{ username: '', password: '' }}>
                              {({ values, handleChange, handleSubmit, touched, errors}) => (
                                  <form onSubmit={handleSubmit}>
                                      <InputGroup>
                                          <InputGroup.Prepend>
                                              <InputGroup.Text id="basic-addon1">&nbsp;<i className="fa fa-user"></i>&nbsp;</InputGroup.Text>
                                          </InputGroup.Prepend>
                                          <FormControl isInvalid={touched.username && errors.username} variant="primary" placeholder="Email or Username" name="username" onChange={handleChange} value={values.username} />
                                          <Form.Control.Feedback type="invalid">
                                              &nbsp;{errors.username && touched.username && errors.username}
                                          </Form.Control.Feedback>
                                      </InputGroup> 
                                      
                                      <InputGroup>
                                          <InputGroup.Prepend>
                                              <InputGroup.Text id="basic-addon1">&nbsp;<i className="fa fa-key"></i></InputGroup.Text>
                                          </InputGroup.Prepend>
                                          <FormControl type="password" isInvalid={touched.password && errors.password} placeholder="Password" type="password" name="password" onChange={handleChange} value={values.password} />
                                          <Form.Control.Feedback type="invalid">
                                              &nbsp;{errors.password && touched.password && errors.password}
                                          </Form.Control.Feedback>
                                      </InputGroup>
                                      <div className="btn-wrapper">
                                      <Button className="login_btn" variant="primary" type="submit">
                                        <i class="fa fa-sign-in" /> Log In
                                      </Button>
                                      <Link className="forgot-password-link" to={global.links.recover_password} >
                                        Forgot Password?
                                      </Link>
                                      </div>
                                      <br />
                                      <Button className="login_btn" variant="secondary" size="lg" href={googleLoginUrl}>
                                        <i class="fa fa-google" /> Log In with Google
                                      </Button>
                                  </form>
                                  )}
                              </Formik>
                          </div>
                      </Card.Body>
                  </Card>
                  <div className="powered_by">
                    <a href="https://eastvantage.com/privacy-policy" target="_blank">Privacy Policy</a> | <a href="https://eastvantage.com/terms-and-condition" target="_blank">Terms & Condition</a> | Powered by <Image src={process.env.PUBLIC_URL +"/images/eastvantage_logo.png"} fluid />
                  </div>
              </Col>
          </Container>
        </div>
      )}
    </Spring>
  );
  }
}


// Object for Data Validation
const validationSchema = yup.object().shape({
  username: yup
    .string()
    .min(3)
    .max(255)
    .required(),
  password: yup
    .string()
    .min(3)
    .max(255)
    .required()
});


const mapStateToProps = (state) => {
  return {
    user : state.user,
    page : state.page,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      logIn: ( credentials ) => dispatch( logIn(credentials) ),
      showAlert: ( message, timeout ) => dispatch( showAlert( message, timeout ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Login);
