import React, { Component } from "react";
import "./Header.css";
import { connect } from 'react-redux'
import { logOut } from '../../../store/actions/userActions'
import { Nav, Navbar } from 'react-bootstrap';

const Header = (props) => {

    const { user } = props;
    const name    = user.emp_num ? "Welcome, " + user.first_name + " " + user.last_name : "";
    return (
      <Navbar expand="lg">
      <Navbar.Brand href="/">EVOX</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="ml-auto">
          <Nav.Item>
            <Nav.Link>
              Home
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link>
              Daily Time Record
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link>
              Associates
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link>
              Inpiration
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
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
