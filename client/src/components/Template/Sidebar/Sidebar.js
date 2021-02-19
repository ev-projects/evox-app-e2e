import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from 'react-redux'
import Authenticator from "../../../services/Authenticator";
import Validator from "../../../services/Validator";
import { logOut } from '../../../store/actions/userActions'
import "./Sidebar.css";

const Sidebar = (props) => {
  
  
  const { user, settings } = props;

  var name = 'Loading...';
  if(user.first_name!=null&&user.last_name!=null){
     name =  user.first_name + " " + user.last_name;
  }

  var profile_picture_url = '/images/default-user-image.png';
  if( Validator.isValid( settings.profile_picture ) ){
    profile_picture_url =  settings.profile_picture
  }


  return <div>      
          <aside className="main-sidebar sidebar-dark-primary elevation-4">
            <a href="/" className="brand-link">
              <img src="/images/icon.jpg" className="brand-image img-circle elevation-3" alt="User Image"/>
              <span className="brand-text font-weight-light"><b>EVOX</b></span>
            </a> 
            <div className="sidebar">
              <div className="user-panel mt-3 pb-3 mb-3 d-flex">
                <div className="image">
                  <img className="img-circle elevation-2"src={ "data:image/jpg;base64,"+profile_picture_url }  alt="User Image"/>
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
                  <li className="nav-item">
                    <Link className="nav-link" to={ global.profile_url + user.id +'/' }>
                      <i className="nav-icon fa fa-user"/>
                      <p> My Profile</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to={ global.daily_time_record_view + user.id +'/' }>
                      <i className="nav-icon fa fa-clock-o nav-icon" />
                      <p> Daily Time Record</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/app/account/MyRequests">
                    <i class="nav-icon fa fa-inbox" aria-hidden="true"></i>
                      <p> My Requests</p> 
                    </Link>
                  </li>
                  
                  {/* Show Schedule if role is Supervisor and has supervisor access */}
                  {Authenticator.check('supervisor', 'supervisor_access') ?
                    <li className="nav-item has-treeview ">
                      <a className="nav-link" >
                        <i className="nav-icon fa fa-calendar-o" />
                        <p>
                          Manage Schedule
                          <i className="right fa fa-chevron-left" />
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        <li className="nav-item">
                          <Link className="nav-link" to={ global.template_list }>
                            <i className="nav-icon fa fa-list nav-icon" />
                            <p>Template List</p>
                          </Link>
                        </li>
                        <li className="nav-item">
                          <Link className="nav-link" to={ global.schedule_assign_department }>
                            <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                            <p style={{'fontSize':13}}>Assign Department Schedule</p>
                          </Link>
                        </li>
                        <li className="nav-item">
                          <Link className="nav-link" to={ global.template_add }>
                            <i className="nav-icon fa fa-plus nav-icon" />
                            <p>Add Template</p>
                          </Link>
                        </li>
                        {/* <li className="nav-item">
                          <Link className="nav-link" to={ global.default_schedule + user.id  }>
                            <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                            <p>Default Schedule</p>
                          </Link>
                        </li> */}
                      </ul>
                    </li>
                    :
                    null
                  }

                  {/* Show My Team Lists if role is Supervisor and has supervisor access */}
                  {Authenticator.check('supervisor', 'supervisor_access') ?
                      <li className="nav-item has-treeview ">
                        <a className="nav-link" >
                          <i className="nav-icon fa fa-users" />
                          <p>
                            My Team
                            <i className="right fa fa-chevron-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          <li className="nav-item">
                            <Link className="nav-link" to="/app/team/MyTeamList" >
                              <i className="nav-icon fa fa-users" aria-hidden="true"></i>
                              <p> My Team List</p> 
                            </Link>
                          </li> 
                          <li className="nav-item">
                            <Link className="nav-link" to="/app/team/MyTeamRequests" >
                              <i className="nav-icon fa fa-users" aria-hidden="true"></i>
                              <p> My Team Request</p> 
                            </Link>
                          </li> 
                          <li className="nav-item">
                            <Link className="nav-link" to="/app/team/DtrSummary" >
                              <i className="nav-icon fa fa-file-text nav-icon" />
                              <p>DTR Summary</p>
                            </Link>
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to="/app/team/DtrLogs" >
                              <i className="nav-icon fa fa-bars nav-icon" />
                              <p>DTR Logs</p>
                            </Link>
                          </li>
                        </ul>
                      </li>
                    :
                    null
                  }
                  <li className="nav-item has-treeview ">
                    <a className="nav-link">
                      <i className="nav-icon fa fa-list-alt" />
                      <p> 
                        Request Form
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
                        <Link className="nav-link" to={ global.base_url +'request/RestDayWork/' }>
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
                  { // Checks if the User has 'admin' role and 'full_access' Permission before rendering Settings
                    Authenticator.check('admin', 'full_access') ?
                      <li className="nav-item has-treeview ">
                        <a className="nav-link">
                          <i className="nav-icon fa fa-cog" />
                          <p>
                            Admin Functions
                            <i className="right fa fa-chevron-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.payroll_cutoff }>
                              <i className="nav-icon fa fa-table nav-icon" />
                              <p>Payroll Cutoff</p>
                            </Link> 
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.assign_department_handlers }>
                              <i className="nav-icon fa fa-users nav-icon" />
                              <p style={{'fontSize':13}}>Assign Department Handlers</p>
                            </Link> 
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.assign_employee_supervisors }>
                              <i className="nav-icon fa fa-users nav-icon" />
                              <p style={{'fontSize':13}}>Assign Employee Supervisors</p>
                            </Link> 
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.assign_role }>
                              <i className="nav-icon fa fa-users nav-icon" />
                              <p style={{'fontSize':13}}>Assign Role  to User</p>
                            </Link> 
                          </li>
                        </ul>
                      </li>
                    :
                    null
                  }
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
      </div>;
}


const mapStateToProps = (state) => {
  return {
      user : state.user,
      settings : state.settings
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    logOut: () => dispatch( logOut() ) 
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(Sidebar);