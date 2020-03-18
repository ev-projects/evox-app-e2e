import React, { Component } from "react";
import "./Header.css";
import { connect } from 'react-redux'
import { logOut } from '../../../store/actions/userActions'
import { Nav, Navbar, NavDropdown } from 'react-bootstrap';

const Header = (props) => {

    const { user } = props;
    const name    = user.emp_num ? "Welcome, " + user.first_name + " " + user.last_name : "";
    return (
      <Navbar expand="lg">
      <Navbar.Brand href="/">EVOX</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="ml-auto">
          <Nav.Item >
            <Nav.Link href="/">
              Home
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <NavDropdown title="Schedule" id="basic-nav-dropdown">
              <NavDropdown.Item href={`${global.template_list_url}`}>Template List</NavDropdown.Item>
              <NavDropdown.Item href={`${global.template_add}`}>Template  </NavDropdown.Item>
              <NavDropdown.Item href={`${global.daily_time_record_view}1/2020-03-01/2020-03-31`}>Daily Time Record</NavDropdown.Item>
            </NavDropdown>
          </Nav.Item>
          <Nav.Link>
              Logout
            </Nav.Link>
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
