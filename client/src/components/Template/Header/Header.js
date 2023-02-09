import React, { Component } from "react";
import "./Header.css";
import { Link } from "react-router-dom"; 
import { Nav, Navbar, NavDropdown } from 'react-bootstrap';
import moment from 'moment';


const Header = (props) => {

    return (
        <nav className="main-header navbar navbar-expand navbar-white navbar-light">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" data-widget="pushmenu" href="#"><i className="fa fa-navicon" /></a>
            </li>
          </ul>
        </nav>
    );
}

export default (Header);
