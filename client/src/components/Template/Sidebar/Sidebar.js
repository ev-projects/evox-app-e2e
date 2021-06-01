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
    profile_picture_url =  "data:image/jpg;base64,"+settings.profile_picture
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
                  <img className="img-circle elevation-2"src={ profile_picture_url }  alt="User Image"/>
                </div>
                <div className="info">
                  <a href="/" className="d-block">{name}</a>
                </div>
              </div>
              <nav className="mt-2">
                <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                  <li className="nav-item">
                    <Link className="nav-link" to={global.links.dashboard}>
                      <i className="nav-icon fa fa-dashboard "/>
                      <p> Dashboard</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to={ global.links.profile  + user.id  }>
                      <i className="nav-icon fa fa-user"/>
                      <p> My Profile</p>
                    </Link>
                  </li>

                  {/*  EMPLOYEE Links */}
                  { Authenticator.check('employee', 'employee_access') ?
                      <li className="nav-item">
                        <Link className="nav-link" to={ global.links.dtr + user.id +'/' }>
                          <i className="nav-icon fa fa-clock-o nav-icon" />
                          <p> Daily Time Record</p>
                        </Link>
                      </li>
                    :
                    null
                  }
                  
                  { Authenticator.check('employee', 'employee_access') ?
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
                            <Link className="nav-link" to={ global.links.base +'request/Overtime/' }>
                              <i className="nav-icon fa fa-clock-o nav-icon" />
                              <p>Overtime</p>
                            </Link> 
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.links.base +'request/RestDayWork/' }>
                              <i className="nav-icon fa fa-plus nav-icon" />
                              <p>Rest Day Work</p>
                            </Link>
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.links.base +'request/ChangeSchedule/' }>
                              <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                              <p>Change of Schedule</p>
                            </Link>
                          </li>
                          
                        </ul>
                      </li>
                    :
                    null
                  }
                
                  { Authenticator.check('employee', 'employee_access') ?
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.my_request}>
                        <i class="nav-icon fa fa-inbox" aria-hidden="true"></i>
                          <p> My Requests</p> 
                        </Link>
                      </li>
                    :
                    null
                  }
                  
                  { Authenticator.check('employee', 'employee_access') ?
                      <li className="nav-item">
                        <Link className="nav-link" to={ global.links.dpa}>
                          <i className="nav-icon fa fa-play-circle nav-icon" />
                          <p>DPA Webinar</p>
                        </Link> 
                      </li>
                    :
                    null
                  }

                  { Authenticator.check('employee', 'employee_access') ?
                      <li className="nav-item">
                        <Link className="nav-link" to={ global.links.ev_learning}>
                          <i className="nav-icon fa fa-book nav-icon" />
                          <p>EV Learning</p>
                        </Link> 
                      </li>
                    :
                    null
                  }

                  
                  {/* SUPERVISOR Links */}
                  { Authenticator.check(['supervisor', 'team_leader'], ['supervisor_access', 'team_leader_access']) ?
                      <li className="nav-item has-treeview ">
                        <a className="nav-link" >
                          <i className="nav-icon fa fa-users" />
                          <p>
                            My Team
                            <i className="right fa fa-chevron-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          { Authenticator.check(['supervisor'], ['supervisor_access']) ?
                            <li className="nav-item">
                              <Link className="nav-link" to={global.links.manage_teams} >
                                <i className="nav-icon fa fa-users" aria-hidden="true"></i>
                                <p>Manage Teams</p> 
                              </Link>
                            </li> 
                            : null 
                          }
                          {Authenticator.check(['supervisor', 'team_leader'], ['supervisor_access', 'team_leader_access']) ?
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
                                  <Link className="nav-link" to={ global.links.template_list }>
                                    <i className="nav-icon fa fa-list nav-icon" />
                                    <p>Template List</p>
                                  </Link>
                                </li>
                                <li className="nav-item">
                                  <Link className="nav-link" to={ global.links.schedule_assign_department }>
                                    <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                                    <p style={{'fontSize':13}}>Assign Department Schedule</p>
                                  </Link>
                                </li>
                                <li className="nav-item">
                                  <Link className="nav-link" to={ global.links.template_add }>
                                    <i className="nav-icon fa fa-plus nav-icon" />
                                    <p>Add Template</p>
                                  </Link>
                                </li>
                              </ul>
                            </li>
                            :
                            null
                          }
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.employee_list} >
                              <i className="nav-icon fa fa-address-book" aria-hidden="true"></i>
                              <p>Employee List</p> 
                            </Link>
                          </li> 
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.dpa_list} >
                              <i className="nav-icon fa fa-list-alt" aria-hidden="true"></i>
                              <p> DPA List</p> 
                            </Link>
                          </li> 
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.my_team_requests} >
                              <i className="nav-icon fa fa-users" aria-hidden="true"></i>
                              <p> My Team Request</p> 
                            </Link>
                          </li> 
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.dtr_summary} >
                              <i className="nav-icon fa fa-file-text nav-icon" />
                              <p>DTR Summary</p>
                            </Link>
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.dtr_logs} >
                              <i className="nav-icon fa fa-bars nav-icon" />
                              <p>DTR Logs</p>
                            </Link>
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.team_schedule} >
                              <i className="nav-icon fa fa-file-text" aria-hidden="true"></i>
                              <p> Team Schedule </p> 
                            </Link>
                          </li> 
                        </ul>
                      </li>
                    :
                    null
                  }

                  {/* CLIENT Links */}
                  { Authenticator.check('client', 'client_access') ?
                    <React.Fragment>
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
                              <Link className="nav-link" to={global.links.employee_list} >
                                <i className="nav-icon fa fa-address-book" aria-hidden="true"></i>
                                <p> Employee List</p> 
                              </Link>
                            </li> 
                            <li className="nav-item">
                              <Link className="nav-link" to={global.links.dtr_logs} >
                                <i className="nav-icon fa fa-clock-o" aria-hidden="true"></i>
                                <p> DTR Logs</p> 
                              </Link>
                            </li> 
                          </ul>
                        </li>
                      </React.Fragment>
                    :
                    null
                  }

                        
                    {/* Report Links Links */}
                    { Authenticator.check(['supervisor', 'client'], 'supervisor_access', 'client_access') ?
                        <li className="nav-item has-treeview ">
                          <a className="nav-link" >
                            <i className="nav-icon fa fa-line-chart" />
                            <p>
                              Reports
                              <i className="right fa fa-chevron-left" />
                            </p>
                          </a>
                          <ul className="nav nav-treeview">
                            <li className="nav-item">
                              <Link className="nav-link" to={global.links.team_attendance_summary} >
                                <p>Team Attendance Summary</p> 
                              </Link>
                            </li> 
                            <li className="nav-item">
                              <Link className="nav-link" to={global.links.team_schedule} >
                                <i className="nav-icon fa fa-file-text" aria-hidden="true"></i>
                                <p> Team Schedule </p> 
                              </Link>
                            </li>
                          </ul>
                        </li>
                        :
                        null
                  }


                  
                  {/* ADMIN Links */}
                  { Authenticator.check('admin', 'full_access') ?
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
                            <Link className="nav-link" to={ global.links.payroll_cutoff }>
                              <i className="nav-icon fa fa-table nav-icon" />
                              <p>Payroll Cutoff</p>
                            </Link> 
                          </li>
                          <li className="nav-item has-treeview ">
                            <a className="nav-link">
                              <i className="nav-icon fa fa-exchange" />
                              <p>
                                Sync
                                <i className="right fa fa-chevron-left" />
                              </p>
                            </a>
                            <ul className="nav nav-treeview">
                              <li className="nav-item">
                                <Link className="nav-link" to={ global.links.sync_biometrics }>
                                  <i className="nav-icon fa fa-bars nav-icon" />
                                  <p>Biometrics</p>
                                </Link> 
                              </li>
                              <li className="nav-item">
                                <Link className="nav-link" to={ global.links.sync_bhr_user_updates }>
                                  <i className="nav-icon fa fa-user nav-icon" />
                                  <p style={{'fontSize':13}}>BHR User Updates</p>
                                </Link> 
                              </li>
                              <li className="nav-item">
                                <Link className="nav-link" to={ global.links.sync_bhr_leaves }>
                                  <i className="nav-icon fa fa-calendar-o nav-icon" />
                                  <p style={{'fontSize':13}}>BHR Leaves</p>
                                </Link> 
                              </li>
                            </ul>
                          </li>
                          <li className="nav-item has-treeview ">
                            <a className="nav-link">
                              <i className="nav-icon fa fa-tags" />
                              <p>
                                Assign
                                <i className="right fa fa-chevron-left" />
                              </p>
                            </a>
                            <ul className="nav nav-treeview">
                              <li className="nav-item">
                                <Link className="nav-link" to={ global.links.assign_department_handlers }>
                                  <i className="nav-icon fa fa-building-o nav-icon" />
                                  <p style={{'fontSize':13}}>Department Handlers</p>
                                </Link> 
                              </li>
                              <li className="nav-item">
                                <Link className="nav-link" to={ global.links.assign_employee_supervisors }>
                                  <i className="nav-icon fa fa-users nav-icon" />
                                  <p style={{'fontSize':13}}>Employee Supervisors</p>
                                </Link> 
                              </li>
                              <li className="nav-item">
                                <Link className="nav-link" to={ global.links.assign_role }>
                                  <i className="nav-icon fa fa-user-o nav-icon" />
                                  <p style={{'fontSize':13}}>Role to User</p>
                                </Link> 
                              </li>
                            </ul>
                          </li>
                          <li className="nav-item">
                            <Link className="nav-link" to={ global.links.register_user }>
                              <i className="nav-icon fa fa-user-plus nav-icon" />
                              <p style={{'fontSize':13}}>Register User</p>
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