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

  onSubmitHandler = async(values) => {
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
      <Container style={props} className="min-vh-100 d-flex flex-column justify-content-center">
          <Col md={5}>
              <Card>
                  <Card.Body>
                      <Image src="https://evox.eastvantage.com/sites/all/themes/evox_style/logo.png" className="image_header" fluid />
                      <div className="powered_by">Powered By : &nbsp;
                      <Image src="https://evox.eastvantage.com/sites/all/themes/evox_style/img/eastvantage_logo.png" fluid />
                      </div>
                      <Card.Text>
                          <Formik validationSchema={validationSchema} onSubmit={this.onSubmitHandler}
                          initialValues={{ username: '', password: '' }}>
                          {({ values, handleChange, handleSubmit, touched, errors}) => (
                              <form onSubmit={handleSubmit}>
                                  <InputGroup className="mb-3">
                                      <InputGroup.Prepend>
                                          <InputGroup.Text id="basic-addon1">&nbsp;<i class="fa fa-user"></i>&nbsp;</InputGroup.Text>
                                      </InputGroup.Prepend>
                                      <FormControl isInvalid={touched.username && errors.username} variant="primary" placeholder="Email or Username" name="username" onChange={handleChange} value={values.username} />
                                      <Form.Control.Feedback type="invalid">
                                          &nbsp;{errors.username && touched.username && errors.username}
                                      </Form.Control.Feedback>
                                  </InputGroup> 
                                  <InputGroup className="mb-3">
                                      <InputGroup.Prepend>
                                          <InputGroup.Text id="basic-addon1">&nbsp;<i class="fa fa-key"></i></InputGroup.Text>
                                      </InputGroup.Prepend>
                                      <FormControl type="password" isInvalid={touched.password && errors.password} placeholder="Password" type="password" name="password" onChange={handleChange} value={values.password} />
                                      <Form.Control.Feedback type="invalid">
                                          &nbsp;{errors.password && touched.password && errors.password}
                                      </Form.Control.Feedback>
                                  </InputGroup>

                                  <Form.Control.Feedback type="invalid" className="invalid_credentials">{user.error_message} &nbsp;</Form.Control.Feedback>
                                  <Button className="login_btn" variant="primary" type="submit">
                                      Submit
                                  </Button>
                              </form>
                              )}
                          </Formik>
                      </Card.Text>
                  </Card.Body>
              </Card>
          </Col>
      </Container>
      )}
    </Spring>
  );
  }
}

function renderTooltip(props) {
  return <Tooltip {...props}>Simple tooltip</Tooltip>;
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
