import React, { Component } from "react";
import "./Header.css";
import { Link } from "react-router-dom"; 
import { Nav, Navbar, NavDropdown } from 'react-bootstrap';
import moment from 'moment';

import DropDownMenu from "../DropDownMenu/DropDownMenu";
import NavQuickPunch from "../NavQuickPunch/NavQuickPunch";
import NotificationMenu from "../NotificationMenu/NotificationMenu";
import NotificationCenter from "../NotificationMenu/NotificationCenter";

const Header = (props) => {

    return (
      <>
        <nav className="main-header navbar navbar-expand navbar-white navbar-light">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" data-widget="pushmenu" href="#"><i className="fa fa-navicon" /></a>
              {/* <i className="fa-bell"></i> */}
            
            </li>
          </ul>

        
          <ul className="navbar-nav ml-auto">
            
              <NavQuickPunch/> 
            

              <li className="nav-item notifi">
                {/* <i className="fa fa-bell"></i> */}
              <NotificationMenu/>
              {/* <NotificationCenter/> */}
            
            </li>
            <li className="nav-item">
              <DropDownMenu/>
            
            </li>
          </ul>
        </nav>
        <></>
      </>

        
    );
}

export default (Header);
