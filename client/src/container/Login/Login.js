import React, { Component } from "react";
import "./Login.css";
import { Form, FormGroup, Input, Button } from "reactstrap";
import Validator from "../../services/Validator";
import { connect } from 'react-redux';
import { logIn } from '../../store/actions/userActions'
import { Redirect } from "react-router-dom";

class Login extends Component {

  onChangeHandler = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  }

  onSubmitHandler = async(e) => {
    e.preventDefault();
    console.log(this.state)
    await this.props.logIn(this.state)
  }

  render = () => {
    
    const { user } = this.props
    const { page } = this.props

    // Checks if there's an Existing Access Token and an Employee Number property from Users. Redirects to Dashboard if True
    if( Validator.isValid( localStorage.getItem("access_token") ) && 
        Validator.isValid(user.emp_num) ) {
      return <Redirect to={global.dashboard_url} />
    }

    return (
      <Form className="login-form" onSubmit={this.onSubmitHandler}>
        <h1 className="text-center">
          <span className="font-weight-bold">EVOX</span>
        </h1>

        <h2 className="text-center"> Welcome </h2>
        <FormGroup className="username-form-group">
          <label>Username or E-mail</label>
          <Input name="username" type="username" onChange={this.onChangeHandler}></Input>
        </FormGroup>
        <FormGroup className="password-form-group">
          <label>Password</label>
          <Input
            name="password"
            type="password"
            onChange={this.onChangeHandler}
          ></Input>
        </FormGroup>
        <Button type="submit" className="btn-lg btn-dark btn-block" disabled={page.isRequesting} >
          Log-in
        </Button>
      </Form>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    user : state.user,
    page : state.page
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      logIn: ( credentials ) => dispatch( logIn(credentials) )
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Login);
