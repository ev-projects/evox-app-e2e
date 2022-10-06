import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { authenticateClient } from '../../store/actions/userActions'
import { showAlert } from '../../store/actions/settings/alertActions'
import { Redirect } from "react-router-dom";
import Validator from "../../services/Validator";
import { Form,Button,Container,Col,Card,InputGroup,FormControl,Image } from 'react-bootstrap';
import { Spring } from 'react-spring/renderprops';
import { Formik } from 'formik';
import * as yup from "yup";

import styles from "./AuthenticateClient.css";

class AuthenticateClient extends Component {
    
  componentWillMount() {
    let token = new URLSearchParams(this.props.location.search).get('token');
    if (token)
    this.props.authenticateClient(token)
  }

  render = () => {  

    const { user } = this.props

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
                              <p><center>Authenticating, please wait...</center></p>
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
      authenticateClient: ( token ) => dispatch( authenticateClient(token) ),
      showAlert: ( message, timeout ) => dispatch( showAlert( message, timeout ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AuthenticateClient);
