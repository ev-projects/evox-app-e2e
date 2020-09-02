import React, { Component } from "react";
import "./Header.css";
import { connect } from 'react-redux'
import { logOut } from '../../../store/actions/userActions'
import { useHistory } from "react-router-dom";
import { Link } from "react-router-dom"; 
import { Nav, Navbar, NavDropdown } from 'react-bootstrap';



const Header = (props) => {
  
  const history = useHistory();

    const { user } = props;
    var name = 'Loading...';
    if(user.first_name!=null&&user.last_name!=null){
       name =  user.first_name + " " + user.last_name;
    }

    return (
      <div>
        <nav className="main-header navbar navbar-expand navbar-white navbar-light">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" data-widget="pushmenu" href="#"><i className="fa fa-navicon" /></a>
            </li>
          </ul>
        </nav>
        <aside className="main-sidebar sidebar-dark-primary elevation-4">
          <a href="/" className="brand-link">
            <img src="/images/icon.jpg" className="brand-image img-circle elevation-3" alt="User Image"/>
            <span className="brand-text font-weight-light"><b>EVOX</b></span>
          </a>
          <div className="sidebar">
            <div className="user-panel mt-3 pb-3 mb-3 d-flex">
              <div className="image">
                <img src="/images/Carmela_Garcia.jpg" className="img-circle elevation-2" alt="User Image"/>
              </div>
              <div className="info">
                <a href="/" className="d-block">{name}</a>
              </div>
            </div>
            <nav className="mt-2">
              <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                <li className="nav-item">
                  <Link className="nav-link" to="/app/Dashboard">
                    <i className="nav-icon fa fa-dashboard "/>
                    <p> Dashboard</p>
                  </Link>
                </li>
                <li className="nav-item has-treeview ">
                  <a className="nav-link" >
                    <i className="nav-icon fa fa-calendar-o" />
                    <p>
                      Schedule
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.template_list_url }>
                        <i className="nav-icon fa fa-list nav-icon" />
                        <p>Template List</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.template_add }>
                        <i className="nav-icon fa fa-plus nav-icon" />
                        <p>Add Template</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.default_schedule + user.id  }>
                        <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                        <p>Default Schedule</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.daily_time_record_view + user.id +'/2020-01-01/2020-01-31' }>
                        <i className="nav-icon fa fa-clock-o nav-icon" />
                        <p>Daily Time Record</p>
                      </Link>
                    </li>
                  </ul>
                </li>
                <li className="nav-item has-treeview ">
                  <a className="nav-link">
                    <i className="nav-icon fa fa-list-alt" />
                    <p>
                      Request
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.base_url +'request/Overtime/' }>
                        <i className="nav-icon fa fa-clock-o nav-icon" />
                        <p>Overtime</p>
                      </Link> 
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.base_url +'request/WorkFromHome/' }>
                        <i className="nav-icon fa fa-list nav-icon" />
                        <p>Work From Home</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.base_url +'request/RestdayWork/' }>
                        <i className="nav-icon fa fa-plus nav-icon" />
                        <p>Rest Day Work</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to={ global.base_url +'request/ChangeSchedule/' }>
                        <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                        <p>Change of Schedule</p>
                      </Link>
                    </li>
                    
                  </ul>
                </li>
                <li className="nav-item">
                  <a onClick={() => props.logOut()} className="nav-link">
                    <i className="fa fa-sign-out nav-icon" />
                    <p>Log Out</p>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </aside>
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
