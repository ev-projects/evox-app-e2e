import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { showAlert } from '../../store/actions/settings/alertActions'
import { Redirect } from "react-router-dom";
import Validator from "../../services/Validator";
import { Form,Button,Container,Col,Card,InputGroup,FormControl,Image, Alert } from 'react-bootstrap';
import { Spring } from 'react-spring/renderprops';
import { Formik } from 'formik';
import * as yup from "yup";

import styles from "./EmailNotFound.css";

class EmailNotFound extends Component {
    
  componentWillMount() {
    
  }

  render = () => {  

    const { user } = this.props

    // Check if there's a redirect link and if so, use that redirect link instead of the default dashboard link.
    let login_link = global.links.login;

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
                              <Alert variant="danger">
                                <p>Your email address is not linked to an EVOX account. Please make sure you are using the correct Google account for EVOX.</p>
                              </Alert>
                              <Button block variant="primary" size="lg" href={login_link}>
                                <i class="fa fa-arrow-left" /> Go Back to Login Page
                              </Button>
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



const mapStateToProps = (state) => {
  return {
    user : state.user,
    page : state.page,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      showAlert: ( message, timeout ) => dispatch( showAlert( message, timeout ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(EmailNotFound);
