import React, { Component } from "react";
import "./Header.css";
import { connect } from 'react-redux'
import { logOut } from '../../../store/actions/userActions'

const Header = (props) => {

    const { user } = props;
    const name    = user.emp_num ? "Welcome, " + user.first_name + " " + user.last_name : "";
    return (
      <div>
        <h1 className="text-center">{name}</h1>
        <button onClick={props.logOut}>Logout</button>
      </div>
    );
}

const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    logOut: () => dispatch( logOut() ) 
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(Header);
