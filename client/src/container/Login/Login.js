import React, { Component } from "react";
import { connect } from 'react-redux';
import { logIn } from '../../store/actions/userActions'
import { Redirect } from "react-router-dom";
import Validator from "../../services/Validator";
import { Form,Button,Container,Col,Card,InputGroup,FormControl,Image,OverlayTrigger,Tooltip } from 'react-bootstrap';
import { Spring } from 'react-spring/renderprops';
import { Formik } from 'formik';
import * as yup from "yup";

import "./Login.css";

class Login extends Component {

  onSubmitHandler = (values) => {
    this.props.logIn(values)
  }

  render = () => {  

    const { user } = this.props
    
    if( Validator.isValid( localStorage.getItem("access_token") ) && Validator.isValid(user.emp_num) ) {
      return <Redirect to={global.dashboard_url} />
    } 

    return (
    <Spring 
      from={{ opacity: 0 }} 
      to={{ opacity: 1 }} 
      config={{ delay: 400, duration: 400 }}
    >
      {props => (
      <Container style={props} className="min-vh-80 d-flex flex-column justify-content-center">
          <Col md={5}>
              <Card>
                  <Card.Body>{process.env.PUBLIC_URL}
                      <Image src={process.env.PUBLIC_URL +"/images/logo.png"} className="image_header" fluid />
                      <Card.Text>
                          <Formik validationSchema={validationSchema} onSubmit={this.onSubmitHandler}
                          initialValues={{ username:'', password:''}}>
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
                                  <Button className="login_btn btn-success" variant="primary" type="submit">
                                      Submit
                                  </Button>
                              </form>
                              )}
                          </Formik>
                      </Card.Text>
                  </Card.Body>
              </Card>
              <div className="powered_by">Powered by &nbsp;
                <Image src={process.env.PUBLIC_URL +"/images/eastvantage_logo.png"} fluid />
              </div>
          </Col>
      </Container>
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
      logIn: ( credentials ) => dispatch( logIn(credentials) )
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Login);
