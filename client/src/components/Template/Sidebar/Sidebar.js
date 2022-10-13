import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from 'react-redux'
import Authenticator from "../../../services/Authenticator";
import Validator from "../../../services/Validator";
import { logOut } from '../../../store/actions/userActions'
import "./Sidebar.css";
import { setSelectedAttendanceSummary } from "../../../store/actions/report/reportActions";
import { useHistory } from "react-router-dom";


const Sidebar = (props) => {


  const { user, settings, selected_summary, my_team_pending_request } = props;
  const history = useHistory();
  var name = 'Loading...';
  if (user.first_name != null && user.last_name != null) {
    name = user.first_name + " " + user.last_name;
  }

  var profile_picture_url = '/images/default-user-image.png';
  if (Validator.isValid(settings.profile_picture)) {
    profile_picture_url = "data:image/jpg;base64," + settings.profile_picture
  }


  return <div>
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      <a href="/" className="brand-link">
        <img src="/images/icon.jpg" className="brand-image img-circle elevation-3" alt="User Image" />
        <span className="brand-text font-weight-light"><b>EVOX</b></span>
      </a>
      <div className="sidebar">
        <div className="user-panel mt-3 pb-3 mb-3 d-flex">
          <div className="image">
            <img className="img-circle elevation-2" src={profile_picture_url} alt="User Image" />
          </div>
          <div className="info">
            <a href="/" className="d-block">{name}</a>
          </div>
        </div>
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
            <li className="nav-item">
              <Link className="nav-link" to={global.links.dashboard}>
                <i className="nav-icon fa fa-dashboard " />
                <p> Dashboard</p>
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to={global.links.profile + user.id}>
                <i className="nav-icon fa fa-user" />
                <p> My Profile</p>
              </Link>
            </li>

            {/*  EMPLOYEE Links */}
            {Authenticator.check('employee', 'employee_access') &&
              <li className="nav-item">
                <Link className="nav-link" to={global.links.dtr + user.id + '/'}>
                  <i className="nav-icon fa fa-clock-o nav-icon" />
                  <p> Daily Time Record</p>
                </Link>
              </li>
            }

            {Authenticator.check('employee', 'employee_access') &&
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
                    <Link className="nav-link" to={global.links.base + 'request/Overtime/'}>
                      <i className="nav-icon fa fa-clock-o nav-icon" />
                      <p>Overtime</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to={global.links.base + 'request/RestDayWork/'}>
                      <i className="nav-icon fa fa-plus nav-icon" />
                      <p>Rest Day Work</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to={global.links.base + 'request/ChangeSchedule/'}>
                      <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                      <p>Change of Schedule</p>
                    </Link>
                  </li>

                </ul>
              </li>
            }

            {Authenticator.check('employee', 'employee_access') &&
              <li className="nav-item">
                <Link className="nav-link" to={global.links.my_request}>
                  <i className="nav-icon fa fa-inbox" aria-hidden="true"></i>
                  <p> My Requests</p>
                </Link>
              </li>
            }

            {Authenticator.check('employee', 'employee_access') &&
              <li className="nav-item">
                <Link className="nav-link" to={global.links.dpa}>
                  <i className="nav-icon fa fa-play-circle nav-icon" />
                  <p>DPA Webinar</p>
                </Link>
              </li>
            }

            {Authenticator.check('employee', 'employee_access') &&
              <li className="nav-item">
                <Link className="nav-link" to={global.links.ev_learning}>
                  <i className="nav-icon fa fa-book nav-icon" />
                  <p>EV Learning</p>
                </Link>
              </li>

             
            }
            
             <li className="nav-item">
                <Link className="nav-link" to={global.links.ops_schedule}>
                  <i className="nav-icon fa fa-address-book nav-icon" />
                  <p>EV Support Team Schedule</p>
                </Link>
              </li>

            {/* SUPERVISOR Links */}
            {Authenticator.check(['supervisor', 'team_leader'], ['supervisor_access', 'team_leader_access']) ?
              <li className="nav-item has-treeview ">
                <a className="nav-link" >
                  <i className="nav-icon fa fa-users" />
                  <p>
                    My Team
                    <i className="right fa fa-chevron-left" />
                  </p>
                </a>
                <ul className="nav nav-treeview">
                  {Authenticator.check('supervisor', 'manage_teams') &&
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.manage_teams} >
                        <i className="nav-icon fa fa-users" aria-hidden="true"></i>
                        <p>Manage Teams</p>
                      </Link>
                    </li>
                  }
                  {Authenticator.check(['supervisor'], ['manage_schedule']) &&
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
                          <Link className="nav-link" to={global.links.template_list}>
                            <i className="nav-icon fa fa-list nav-icon" />
                            <p>Template List</p>
                          </Link>
                        </li>
                        <li className="nav-item">
                          <Link className="nav-link" to={global.links.schedule_assign_department}>
                            <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                            <p style={{ 'fontSize': 13 }}>Assign Department Schedule</p>
                          </Link>
                        </li>
                        <li className="nav-item">
                          <Link className="nav-link" to={global.links.template_add}>
                            <i className="nav-icon fa fa-plus nav-icon" />
                            <p>Add Template</p>
                          </Link>
                        </li>
                      </ul>
                    </li>
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
                      <p> My Team Request {my_team_pending_request == 0 || my_team_pending_request == null ? "" : '(' + my_team_pending_request + ')'}  </p>
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

                </ul>
              </li>
              :
              null
            }

            {/* CLIENT Links */}
            {Authenticator.check('client', 'client_access') &&
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
            }


            {/* Report Links Links */}
            {Authenticator.check(['supervisor', 'client'], ['supervisor_access', 'client_access']) &&
              <li className="nav-item has-treeview ">
                <a className="nav-link" >
                  <i className="nav-icon fa fa-line-chart" />
                  <p>
                    Reports
                    <i className="right fa fa-chevron-left" />
                  </p>
                </a>
                <ul className="nav nav-treeview">
                  {/* <li className="nav-item">
                              <Link className="nav-link" to={global.links.team_attendance_summary} >
                                <i className="nav-icon fa fa-bar-chart"  aria-hidden="true"></i>
                                <p>Attendance Summary</p> 
                              </Link>
                            </li>  */}

                  <li className="nav-item has-treeview ">
                    <a className="nav-link" onClick={() => {
                      history.push(global.links.team_attendance_summary)
                      props.setSelectedAttendanceSummary("attendance")
                    }}>
                      <i className="nav-icon fa fa-bar-chart" aria-hidden="true"></i>
                      <p>
                        Attendance Summary
                        <i className="right fa fa-chevron-left" />
                      </p>
                    </a>
                    <ul className="nav nav-treeview">
                      <li className="nav-item">
                        <Link className={selected_summary == "scheduled_employees" ? "nav-link activeAttendanceSummaryReport" : "nav-link"} to={global.links.team_attendance_summary}
                          onClick={() => {
                            props.setSelectedAttendanceSummary("scheduled_employees")
                          }}>
                          <i className="nav-icon fa fa-bars nav-icon" />
                          <p>Scheduled</p>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={selected_summary == "attendance" ? "nav-link activeAttendanceSummaryReport" : "nav-link"} to={global.links.team_attendance_summary}
                          onClick={() => {
                            props.setSelectedAttendanceSummary("attendance")
                          }}>
                          <i className="nav-icon fa fa-calendar nav-icon" />
                          <p>Attendance</p>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={selected_summary == "planned_leaves" ? "nav-link activeAttendanceSummaryReport" : "nav-link"} to={global.links.team_attendance_summary}
                          onClick={() => {
                            props.setSelectedAttendanceSummary("planned_leaves")
                          }}>
                          <i className="nav-icon fa fa-pencil-square nav-icon" />
                          <p>Planned Leaves</p>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={selected_summary == "unplanned_leaves" ? "nav-link activeAttendanceSummaryReport" : "nav-link"} to={global.links.team_attendance_summary}
                          onClick={() => {
                            props.setSelectedAttendanceSummary("unplanned_leaves")
                          }}>
                          <i className="nav-icon fa fa-window-close-o nav-icon" />
                          <p>Unplanned</p>
                        </Link>
                      </li>

                      <li className="nav-item">
                        <Link className={selected_summary == "total_rest_day_work" ? "nav-link activeAttendanceSummaryReport" : "nav-link"} to={global.links.team_attendance_summary}
                          onClick={() => {
                            props.setSelectedAttendanceSummary("total_rest_day_work")
                          }}>
                          <i className="nav-icon fa fa-plus nav-icon " />
                          <p>Rest day Work</p>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className={selected_summary == "total_overtime" ? "nav-link activeAttendanceSummaryReport" : "nav-link"} to={global.links.team_attendance_summary}
                          onClick={() => {
                            props.setSelectedAttendanceSummary("total_overtime")
                          }}>
                          <i className="nav-icon fa fa-clock-o nav-icon " />
                          <p>Overtime Work</p>
                        </Link>
                      </li>
                    </ul>
                  </li>

                  {Authenticator.check(['supervisor', 'team_leader'], ['supervisor_access', 'team_leader_access']) ?
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.my_team_schedule} >
                        <i className="nav-icon fa fa-file-text" aria-hidden="true"></i>
                        <p>Team Schedule</p>
                      </Link>
                    </li>
                    :
                    null
                  }
                </ul>

              </li>
            }



            {/* ADMIN Links */}
            {Authenticator.check('admin', 'full_access') &&
              <li className="nav-item has-treeview ">
                <a className="nav-link">
                  <i className="nav-icon fa fa-cog" />
                  <p>
                    Admin Functions
                    <i className="right fa fa-chevron-left" />
                  </p>
                </a>
                <ul className="nav nav-treeview">


                  {Authenticator.check('admin', ['sync_biometrics', 'sync_bhr_user_updates', 'sync_bhr_leaves']) &&
                    <li className="nav-item has-treeview ">
                      <a className="nav-link">
                        <i className="nav-icon fa fa-exchange" />
                        <p>
                          Sync
                          <i className="right fa fa-chevron-left" />
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        {Authenticator.check('admin', 'sync_biometrics') &&
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.sync_biometrics}>
                              <i className="nav-icon fa fa-bars nav-icon" />
                              <p>Biometrics</p>
                            </Link>
                          </li>
                        }
                        {Authenticator.check('admin', 'sync_bhr_user_updates') &&
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.sync_bhr_user_updates}>
                              <i className="nav-icon fa fa-user nav-icon" />
                              <p style={{ 'fontSize': 13 }}>BHR User Updates</p>
                            </Link>
                          </li>
                        }
                        {Authenticator.check('admin', 'sync_bhr_leaves') &&
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.sync_bhr_leaves}>
                              <i className="nav-icon fa fa-calendar-o nav-icon" />
                              <p style={{ 'fontSize': 13 }}>BHR Leaves</p>
                            </Link>
                          </li>
                        }
                      </ul>
                    </li>
                  }
                  {Authenticator.check('admin', ['assign_department_handlers', 'assign_employee_supervisors', 'assign_role_permission']) &&
                    <li className="nav-item has-treeview ">
                      <a className="nav-link">
                        <i className="nav-icon fa fa-tags" />
                        <p>
                          Assign
                          <i className="right fa fa-chevron-left" />
                        </p>
                      </a>
                      <ul className="nav nav-treeview">
                        {Authenticator.check('admin', 'assign_department_handlers') &&
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.assign_department_handlers}>
                              <i className="nav-icon fa fa-building-o nav-icon" />
                              <p style={{ 'fontSize': 13 }}>Department Handlers</p>
                            </Link>
                          </li>
                        }
                        {Authenticator.check('admin', 'assign_employee_supervisors') &&
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.assign_employee_supervisors}>
                              <i className="nav-icon fa fa-users nav-icon" />
                              <p style={{ 'fontSize': 13 }}>Employee Supervisors</p>
                            </Link>
                          </li>
                        }
                        {Authenticator.check('admin', 'assign_role_permission') &&
                          <li className="nav-item">
                            <Link className="nav-link" to={global.links.assign_role_permission}>
                              <i className="nav-icon fa fa-user-o nav-icon" />
                              <p style={{ 'fontSize': 13 }}>Role/Permission to User</p>
                            </Link>
                          </li>
                        }
                      </ul>
                    </li>
                  }


                  {Authenticator.check('admin', 'manage_payroll_cutoff') &&
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.payroll_cutoff}>
                        <i className="nav-icon fa fa-table nav-icon" />
                        <p>Payroll Cutoff</p>
                      </Link>
                    </li>
                  }
                  {Authenticator.check('admin', 'allow_register_user') &&
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.kpi_upload}>
                        <i className="nav-icon fa fa-user-plus nav-icon" />
                        <p style={{ 'fontSize': 13 }}>Register User</p>
                      </Link>
                    </li>
                  }

                  <li className="nav-item">
                    <Link className="nav-link" to={global.links.generate_date} >
                      <i className="nav-icon fa fa-bars nav-icon" />
                      <p>Generate Date</p>
                    </Link>
                  </li>

                  {Authenticator.check('admin', 'manage_change_logs') &&
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.manage_change_logs}>
                        <i className="nav-icon fa fa-folder-open nav-icon" />
                        <p style={{ 'fontSize': 13 }}>Change Logs</p>
                      </Link>
                    </li>
                  }
                </ul>
              </li>
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
    user: state.user,
    settings: state.settings,
    selected_summary: state.report.selected_summary,
    my_team_pending_request: state.myTeamRequestList?.statusNumbers?.pending ? state.myTeamRequestList.statusNumbers.pending : null
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    logOut: () => dispatch(logOut()),
    setSelectedAttendanceSummary: (data) => dispatch(setSelectedAttendanceSummary(data)),

  };
}
export default connect(mapStateToProps, mapDispatchToProps)(Sidebar);