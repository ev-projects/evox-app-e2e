import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import Authenticator from "../../../services/Authenticator";
import Validator from "../../../services/Validator";
import { logOut } from "../../../store/actions/userActions";
import "./Sidebar.css";
import { setSelectedAttendanceSummary } from "../../../store/actions/report/reportActions";
import { useHistory } from "react-router-dom";

const Sidebar = (props) => {
  const { user, settings, selected_summary, my_team_pending_request } = props;
  const history = useHistory();
  var name = "Loading...";
  if (user.first_name != null && user.last_name != null) {
    name = user.first_name + " " + user.last_name;
  }
  const country = props.settings?.country ? props.settings?.country : "";

  var profile_picture_url = "/images/default-user-image.png";
  if (Validator.isValid(settings.profile_picture)) {
    profile_picture_url = "data:image/jpg;base64," + settings.profile_picture;
  }

  return (
    <div>
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link
          className="brand-link brand-link-color"
          to={global.links.dashboard}
        >
          <img
            src="/images/icon.jpg"
            className="brand-image img-circle elevation-3"
            alt="User Image"
          />
          {/* <span className="brand-text font-weight-light"><b>EVOX</b></span> */}
          <span className="brand-text font-weight-light">
            <b className="green">EV</b>
            <b>OX</b>
          </span>
        </Link>
        <div className="sidebar">
          {/* <div className="user-panel mt-3 pb-3 mb-3 d-flex">
          <div className="image">
            <img className="img-circle elevation-2" src={profile_picture_url} alt="User Image" />
          </div>
          <div className="info">
            <p>{name}</p>
          </div>
        </div> */}
          <nav className="mt-2 ml-3">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              data-widget="treeview"
              role="menu"
              data-accordion="false"
            >
              <li className="nav-item">
                <Link className="nav-link" to={global.links.dashboard}>
                  <i className="nav-icon fa fa-dashboard " />
                  <p className="blue"> Dashboard</p>
                </Link>
              </li>

             
              {/* <li className="nav-item">
              <Link className="nav-link" to={global.links.profile + user.id}>
                <i className="nav-icon fa fa-user" />
                <p> My Profile</p>
              </Link>
            </li> */}

              {/*  EMPLOYEE Links */}
              {Authenticator.scanLevel_Feature(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], 'dtr_access') && (
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to={global.links.dtr + user.id + "/"}
                  >
                    <i className="nav-icon fa fa-clock-o nav-icon" />
                    <p> Daily Time Record</p>
                  </Link>
                </li>
              )}

                     {/*  EMPLOYEE Links */}
                      {Authenticator.scanLevel_Feature(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "multi_login")&& (
                     
                <>
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to={global.links.dtr_punch_history}
                  >
                    <i className="nav-icon fa fa-hand-rock-o nav-icon" />
                    <p> Multi Clock-in</p>
                  </Link>
                </li>
                    <li className="nav-item">
                    <Link
                      className="nav-link"
                      to={global.links.dtr_punchlist + user.id + "/"}
                    >
                      <span class="icon-stack">
                        <i class="fa fa-calendar-o icon-stack-3x"></i>
                        <i class="fa fa-hand-rock-o icon-stack-1x"></i>
                      </span>
                      <p> Multi Clock-in History</p>
                    </Link>
                  </li>
                  </>
              )}

              {Authenticator.scanLevel(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]) && (
                <li className="nav-item has-treeview ">
                  <a className="nav-link nav-link-main">
                    <i className="nav-icon fa fa-list-alt" />
                    <p>
                      Request Form
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                  {Authenticator.scanFeature('request_overtime')&&(
                      <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.base + "request/Overtime/"}
                      >
                        <i className="nav-icon fa fa-clock-o nav-icon" />
                        <p>Overtime</p>
                      </Link>
                    </li>
                  )}
                  {Authenticator.scanFeature('request_rest_day_work')&&(
                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.base + "request/RestDayWork/"}
                      >
                        <i className="nav-icon fa fa-plus nav-icon" />
                        <p>Rest Day Work</p>
                      </Link>
                    </li>
                  )}
                  {Authenticator.scanFeature('request_change_schedule')&&(
                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.base + "request/ChangeSchedule/"}
                      >
                        <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                        <p>Change of Schedule</p>
                      </Link>
                    </li>
                  )}

              

                  {Authenticator.scanFeature('request_alter_logs')&&(<>
                    {(Authenticator.scanLevel_Feature(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "multi_login")) && (
                      <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.base + "request/AlterLogPunch/"}
                      >
                        <i className="nav-icon fa fa-clock-o nav-icon" />
                        <p>Alter Punch Date</p>
                      </Link>
                    </li>
                    )}
                  </>)}
                   
                  {Authenticator.scanFeature('request_coe')&&(<>
                      {country.toLowerCase() == "philippines" && (
                        <li className="nav-item">
                          <Link
                            className="nav-link"
                            to={
                              global.links.base +
                              "request/CertificateOfEmployment/"
                            }
                          >
                            <i className="nav-icon fa fa-certificate nav-icon" />
                            <p>Certificate Of Employment</p>
                          </Link>
                        </li>
                      )}
                      </>
                      )}
                  </ul>
                </li>
              )}

               {/* IT Requirement Notification List  */}
                  {/* {
                    user.department_id === 28 &&
                    <li className="nav-item">
                    <Link className="nav-link" to={global.links.requirement_list}>
                      <i className="nav-icon fa fa-th-list" />
                      <p>IT Requirement List</p>
                    </Link>
                  </li>
                  } */}


                  {/* Meeting Room  */}

              {/* <li className="nav-item has-treeview ">
                <a className="nav-link nav-link-main">
                  <i className="nav-icon fa fa-calendar" />
                  <p>
                    Meeting Room Booking
                    <i className="right fa fa-chevron-left" />
                  </p>
                </a>
                <ul className="nav nav-treeview">
                {Authenticator.NULL(
                    ["supervisor", "team_leader"],
                    ["supervisor_access", "team_leader_access"]
                  ) && (
                <li className="nav-item">
                    <Link
                      className="nav-link"
                      to={global.links.room_master + "0"}
                    >
                      <i className="nav-icon fa fa-home" />
                      <p>Create Room</p>
                    </Link>
                  </li>
                  )}
                 
                  
                  {Authenticator.NULL(
                    ["supervisor", "team_leader"],
                    ["supervisor_access", "team_leader_access"]
                  ) && (
                  <li className="nav-item">
                    <Link className="nav-link" to={global.links.room_list}>
                      <i className="nav-icon fa fa-th-list" />
                      <p>Room List</p>
                    </Link>
                  </li>
                  )}
                  {Authenticator.NULL(
                    ["supervisor", "team_leader"],
                    ["supervisor_access", "team_leader_access"]
                  ) && (
                  <li className="nav-item">
                    <Link
                      className="nav-link"
                      to={global.links.location_master + "0"}
                    >
                      <i className="nav-icon fa fa-map-marker" />
                      <p>Create Location</p>
                    </Link>
                  </li>
                  )}
                  {Authenticator.NULL(
                    ["supervisor", "team_leader"],
                    ["supervisor_access", "team_leader_access"]
                  ) && (
                  <li className="nav-item">
                    <Link className="nav-link" to={global.links.location_list}>
                      <i className="nav-icon fa fa-th-list" />
                      <p>Location List</p>
                    </Link>
                  </li>
                  )}
                  <li className="nav-item">
                    <Link
                      className="nav-link"
                      to={global.links.meeting_calander + user.id}
                    >
                      <i className="nav-icon fa fa-calendar" />
                      <p>Reserve Meeting Room</p>
                    </Link>
                  </li>
                  
                  {Authenticator.NULL(
                    ["supervisor", "team_leader"],
                    ["supervisor_access", "team_leader_access"]
                  ) && (
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.booked_list}>
                        <i className="nav-icon fa fa-inbox" />
                        <p>Meeting Room Request</p>
                      </Link>
                    </li>
                  )}
                </ul>
              </li> */}

              {/* <li className="nav-item">
                    <Link
                      className="nav-link"
                      to={global.links.job_referal}
                    >
                      <i className="nav-icon fa fa-user-plus" />
                      <p>Job Referal</p>
                    </Link>
                  </li> */}

                {Authenticator.scanLevel(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]) && (
                <li className="nav-item">
                  <Link className="nav-link" to={global.links.my_request}>
                    <i className="nav-icon fa fa-inbox" aria-hidden="true"></i>
                    <p> My Requests</p>
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <Link className="nav-link" to={global.links.asset_management}>
                  <i className="nav-icon fa fa-desktop" />
                  <p className="blue"> Asset Management</p>
                </Link>
              </li>

                {Authenticator.scanLevel(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]) && (
                <li className="nav-item">
                  <Link className="nav-link" to={global.links.dpa}>
                    <i className="nav-icon fa fa-play-circle nav-icon" />
                    <p>DPA Webinar</p>
                  </Link>
                </li>
              )}

              {Authenticator.scanLevel(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]) && (
                <li className="nav-item">
                  {/* <Link className="nav-link" to={global.links.ev_learning}> */}
                  <a className="nav-link" target="_blank" href="https://lms.eastvantage.com/">
                    <i className="nav-icon fa fa-book nav-icon" />
                    <p>EV Academy</p>
                  </a>
                  {/* </Link> */}
                </li>
              )}

              <li className="nav-item">
                <Link className="nav-link" to={global.links.ops_schedule}>
                  <i className="nav-icon fa fa-address-book nav-icon" />
                  <p>EV Support Team Schedule</p>
                </Link>
              </li>

              {/* SUPERVISOR Links */}
              {Authenticator.scanLevel(["SubDepartment Head","Department Head","DivisionHead","Admin","Board","HR","Payroll","Client"])
               ? (
                <li className="nav-item has-treeview ">
                  <a className="nav-link nav-link-main">
                    <i className="nav-icon fa fa-users" />
                    <p>
                      My Team
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                    {/* {Authenticator.NULL("supervisor", "manage_teams") && (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.manage_teams}
                        >
                          <i
                            className="nav-icon fa fa-users"
                            aria-hidden="true"
                          ></i>
                          <p>Manage Teams</p>
                        </Link>
                      </li>
                    )} */}
                    {(Authenticator.scanLevel_Feature(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "manage_department_schedules")) && (
                      <li className="nav-item has-treeview ">
                        <a className="nav-link ">
                          <i className="nav-icon fa fa-calendar-o" />
                          <p>
                            Manage Department Schedule
                            <i className="right fa fa-chevron-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          <li className="nav-item">
                            <Link
                              className="nav-link"
                              to={global.links.template_list}
                            >
                              <i className="nav-icon fa fa-list nav-icon" />
                              <p>Template List</p>
                            </Link>
                          </li>
                          <li className="nav-item">
                            <Link
                              className="nav-link"
                              to={global.links.schedule_assign_department}
                            >
                              <i className="nav-icon fa fa-calendar-check-o nav-icon" />
                              <p style={{ fontSize: 13 }}>
                                Assign Department Schedule
                              </p>
                            </Link>
                          </li>
                          <li className="nav-item">
                            <Link
                              className="nav-link"
                              to={global.links.template_add}
                            >
                              <i className="nav-icon fa fa-plus nav-icon" />
                              <p>Add Template</p>
                            </Link>
                          </li>
                        </ul>
                      </li>
                    )}
                     {(Authenticator.scanLevel_Feature(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"], "view_employee_list")) && (
                    <>
                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.employee_list}
                      >
                        <i
                          className="nav-icon fa fa-address-book"
                          aria-hidden="true"
                        ></i>
                        <p>Employee List</p>
                      </Link>
                    </li>
                      </>
                    )}
                      {(Authenticator.scanLevel_Feature(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "view_employee_list")) && (
                    <>
                    <li className="nav-item">
                      <Link className="nav-link" to={global.links.dpa_list}>
                        <i
                          className="nav-icon fa fa-list-alt"
                          aria-hidden="true"
                        ></i>
                        <p> DPA List</p>
                      </Link>
                    </li>
                    </>
                    )}
                       {(Authenticator.scanFeature(['manage_alter_log_request' ,'manage_change_schedules_request' ,'manage_rest_day_work_request' ,'manage_overtime_request'])) && (
                    <>
                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.my_team_requests}
                      >
                        <i
                          className="nav-icon fa fa-users"
                          aria-hidden="true"
                        ></i>
                        <p>
                          {" "}
                          My Team Request{" "}
                          {my_team_pending_request == 0 ||
                          my_team_pending_request == null
                            ? ""
                            : "(" + my_team_pending_request + ")"}{" "}
                        </p>
                      </Link>
                    </li>
                    </>
                    )}
                    {/* <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.overallrequest}
                      >
                        <i
                          className="nav-icon fa fa-users"
                          aria-hidden="true"
                        ></i>
                        <p>
                          OverAll Requests
                        </p>
                      </Link>
                    </li> */}
                    {(Authenticator.scanFeature("view_dtr_summary")) && (
                    <>
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.dtr_summary}>
                          <i className="nav-icon fa fa-file-text nav-icon" />
                          <p>DTR Summary</p>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.dtr_multi_logs_summary}>
                          <i className="nav-icon fa fa-file-text nav-icon" />
                          <p>DTR Multi-clock in Summary</p>
                        </Link>
                      </li>
                    </>
                     )}
                     <>
                     {!Authenticator.scanLevel(["Payroll","Employee","Board","Admin","HR"]) && (
                <li className="nav-item">
                <Link className="nav-link" to={global.links.payroll_dispute}>
                  <i className="nav-icon fa fa-clock-o" />
                  <p className="blue"> Create Dispute</p>
                </Link>
                </li>
              )}</>
                                
                    {/* <li className="nav-item">
                      <Link className="nav-link" to={global.links.dtr_conflict}>
                        <i className="nav-icon fa fa-file-text nav-icon" />
                        <p>DTR Conflict Report</p>
                      </Link>
                     </li> */}
                      {(Authenticator.scanFeature("view_dtr_logs")) && (
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.dtr_logs}>
                          <i className="nav-icon fa fa-bars nav-icon" />
                          <p>DTR Logs</p>
                        </Link>
                      </li>
                     )}
               
                  </ul>
                </li>
              ) : null}
               {(Authenticator.scanLevel_Feature(["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "manage_announcement"))  &&
                          
                          <React.Fragment>
                          <li className="nav-item has-treeview newfeature_announcements">
                            <a className="nav-link" >
                              <i className="nav-icon fa fa-newspaper-o" />
                              <p>
                                Announcements
                                <i className="right fa fa-chevron-left" />
                              </p>
                            </a>
                            <ul className="nav nav-treeview">
                            <li className="nav-item">
                              <Link className="nav-link" to={global.links.department_announcement_list}>
                                <i className="nav-icon fa fa-newspaper-o  nav-icon" />
                                <p>My Announcement List</p>
                              </Link>
                            </li>
                              <li className="nav-item">
                                <Link className="nav-link" to={global.links.department_announcement_form} >
                                  <i className="nav-icon fa fa-plus" aria-hidden="true"></i>
                                  <p>Create Announcement</p>
                                </Link>
                              </li>

   
                              {/* {(Authenticator.check("admin", "admin_manage_all_announcements")|| Authenticator.check("supervisor", "manage_all_announcements")) && (
                              <li className="nav-item">
                                  <Link
                                    className="nav-link"
                                    to={global.links.admin_announcement_list}
                                  >
                                    <i className="nav-icon fa fa-comments-o  nav-icon" />
                                    <p>All Announcement List</p>
                                  </Link>
                                </li>
                              )} */}
                              {(Authenticator.scanLevel_Feature(["Admin"], "manage_announcement")) && (
                              <li className="nav-item">
                                  <Link
                                    className="nav-link"
                                    to={global.links.admin_announcement_list}
                                  >
                                    <i className="nav-icon fa fa-comments-o  nav-icon" />
                                    <p>All Announcement List</p>
                                  </Link>
                                </li>
                              )}
                            </ul>
                          </li>
                    
                        </React.Fragment>
                    }
              {/* CLIENT Links */}
              {/* {Authenticator.NULL("client", "client_access") && (
                <React.Fragment>
                  <li className="nav-item has-treeview ">
                    <a className="nav-link">
                      <i className="nav-icon fa fa-users" />
                      <p>
                        My Team
                        <i className="right fa fa-chevron-left" />
                      </p>
                    </a>
                    <ul className="nav nav-treeview">
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.employee_list}
                        >
                          <i
                            className="nav-icon fa fa-address-book"
                            aria-hidden="true"
                          ></i>
                          <p> Employee List</p>
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.dtr_logs}>
                          <i
                            className="nav-icon fa fa-clock-o"
                            aria-hidden="true"
                          ></i>
                          <p> DTR Logs</p>
                        </Link>
                      </li>
                    </ul>
                  </li>
                </React.Fragment>
              )} */}

              {/* Report Links Links */}
             {(Authenticator.scanFeature(['view_attendance_report', 'manage_department_schedules', 'manage_morocco_payroll'])) && (
                <li className="nav-item has-treeview ">
                  <a className="nav-link nav-link-main">
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
                    {(Authenticator.scanLevel("HR")) ? (
                    <li className="nav-item">
                      <a
                        className="nav-link"
                        onClick={() => {
                          history.push(global.links.hr_team_attendance_summary);
                          props.setSelectedAttendanceSummary("attendance");
                        }}
                      >
                        <i
                          className="nav-icon fa fa-bar-chart"
                          aria-hidden="true"
                        ></i>
                        <p>
                          Attendance Summary
                          {/* <i className="right fa fa-chevron-left" /> */}
                        </p>
                      </a>
                    </li>
                    ) : ((Authenticator.scanLevel_Feature(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","Payroll"], "view_attendance_report")) && (
                      <li className="nav-item">
                      <a
                        className="nav-link"
                        onClick={() => {
                          history.push(global.links.team_attendance_summary);
                          props.setSelectedAttendanceSummary("attendance");
                        }}
                      >
                        <i
                          className="nav-icon fa fa-bar-chart"
                          aria-hidden="true"
                        ></i>
                        <p>
                          Attendance Summary
                          {/* <i className="right fa fa-chevron-left" /> */}
                        </p>
                      </a>
                    </li>
                    )
                    
                    )}
                    {(Authenticator.scanLevel_Feature(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "manage_department_schedules")) ? (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.my_team_schedule}
                        >
                          <i
                            className="nav-icon fa fa-file-text"
                            aria-hidden="true"
                          ></i>
                          <p>Team Schedule</p>
                        </Link>
                      </li>
                    ) : null}

                    {Authenticator.scanLevel(["Admin","HR","Payroll"]) && (
                                  <li className="nav-item">
                                  <Link className="nav-link" to={global.links.view_report}>
                                    <i className="nav-icon fa fa-clock-o" />
                                    <p className="blue"> India Payroll Report</p>
                                  </Link>
                                  </li>
                    )}

                    {Authenticator.scanLevel_Feature(["Admin","HR","Payroll","MAR_Payroll","MAR_HR","SubDepartment Head","Department Head","Employee","DivisionHead"], "manage_morocco_payroll") && (
                                  <li className="nav-item">
                                  <Link className="nav-link" to={global.links.view_report_morocco}>
                                    <i className="nav-icon fa fa-clock-o" />
                                    <p className="blue"> Morocco Payroll Report</p>
                                  </Link>
                                  </li>
                    )}

                    {(Authenticator.scanLevel(["Admin","SubDepartment Head","Department Head","Payroll","DivisionHead"])) && (
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.payroll_dispute_view}>
                          <i className="nav-icon fa fa-clock-o" />
                          <p className="blue"> Payroll Dispute Report</p>
                        </Link>
                      </li>
                    )}
                  </ul>
                </li>
              )}

              {(Authenticator.scanFeature(['upload_policies']))
              && (
              <li className="nav-item has-treeview ">
                <a className="nav-link nav-link-main">
                  <i className="nav-icon fa fa-book" />
                  <p>
                    Policies
                    <i className="right fa fa-chevron-left" />
                  </p>
                </a>
                <ul className="nav nav-treeview">


                <li className="nav-item">
                  <Link className="nav-link" to={global.links.policies_upload}>
                    <i className="nav-icon fa fa-upload nav-icon" />
                    <p>Upload Policies</p>
                  </Link>
                </li>

                <li className="nav-item">
                  <Link className="nav-link" to={global.links.policies_document_list}>
                    <i className="nav-icon fa fa-toggle-on nav-icon" />
                    <p>Manage Policy Accessibility</p>
                  </Link>
                </li>

                {/* <li className="nav-item">
                  <Link className="nav-link" to={global.links.policies_download}>
                    <i className="nav-icon fa fa-download nav-icon" />
                    <p>Download Policies</p>
                  </Link>
                </li> */}
                </ul>
              </li>
            )}

              {/* HR Links */}
              {(Authenticator.scanLevel("Payroll")) && (
                <li className="nav-item has-treeview ">
                  <a className="nav-link">
                    <i className="nav-icon fa fa-cog" />
                    <p>
                    Payroll Functions
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
          

                  <ul className="nav nav-treeview">
                  {Authenticator.scanLevel_Feature("Payroll", 
                            "manage_payroll_cutoff",
                    )&& (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.payroll_cutoff}
                        >
                          <i className="nav-icon fa fa-table nav-icon" />
                          <p>Payroll Cutoff</p>
                        </Link>
                      </li>
                    )}
                  </ul>
                </li>
              )}

              {/* OPS Links */}
              {(Authenticator.scanLevel_Feature(["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"], "manage_ops"))&& (
                <li className="nav-item has-treeview ">
                  <a className="nav-link">
                    <i className="nav-icon fa fa-cubes" />
                    <p>
                      OPS Functions
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                  
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.ops_schedule_list}
                        >
                          <i className="nav-icon fa fa-wrench nav-icon" />
                          <p style={{ fontSize: 13 }}>Manage OPS Schedules</p>
                        </Link>
                      </li>
                    
                  </ul>
                </li>
              )}

              {/* ADMIN Links */}
              {console.log(Authenticator.scanLevel("Admin"))}
              {Authenticator.scanLevel("Admin") && (
                <li className="admin-sidebar nav-item has-treeview ">
                  <a className="nav-link nav-link-main">
                    <i className="nav-icon fa fa-cogs" />
                    <p>
                      Admin Functions
                      <i className="right fa fa-chevron-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                    {Authenticator.scanLevel_Feature("Admin", [
                      "biometric_sync",
                      "bhr_sync",
                    ]) && (
                      <li className="nav-item has-treeview ">
                        <a className="nav-link">
                          <i className="nav-icon fa fa-exchange" />
                          <p>
                            Sync
                            <i className="right fa fa-chevron-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                        {Authenticator.scanLevel_Feature("Admin", 
                            "biometric_sync",
                          ) && (
                            <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.sync_biometrics}
                              >
                                <i className="nav-icon fa fa-bars nav-icon" />
                                <p>Biometrics</p>
                              </Link>
                            </li>
                          )}
                          {Authenticator.scanLevel_Feature("Admin", 
                              "bhr_sync",
                            ) && (
                            <>
                              <li className="nav-item">
                                <Link
                                  className="nav-link"
                                  to={global.links.sync_bhr_user_updates}
                                >
                                  <i className="nav-icon fa fa-user nav-icon" />
                                  <p style={{ fontSize: 13 }}>BHR User Updates</p>
                                </Link>
                              </li>
                            
                              <li className="nav-item">
                                <Link
                                  className="nav-link"
                                  to={global.links.sync_bhr_leaves}
                                >
                                  <i className="nav-icon fa fa-calendar-o nav-icon" />
                                  <p style={{ fontSize: 13 }}>BHR Leaves</p>
                                </Link>
                              </li>
                            </>
                          )}
                          <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.sync_utc_adjustment}
                              >
                                <i className="nav-icon fa fa-adjust nav-icon" />
                                <p style={{ fontSize: 13 }}>UTC Sync</p>
                              </Link>
                            </li>
                        </ul>
                      </li>
                    )}
                    
                      <li className="nav-item has-treeview ">
                        <a className="nav-link">
                          <i className="nav-icon fa fa-tags" />
                          <p>
                            Assign
                            <i className="right fa fa-chevron-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          
                            {/* <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.assign_department_handlers}
                              >
                                <i className="nav-icon fa fa-building-o nav-icon" />
                                <p style={{ fontSize: 13 }}>
                                  Department Handlers
                                </p>
                              </Link>
                            </li>
                          
                          
                            <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.assign_employee_supervisors}
                              >
                                <i className="nav-icon fa fa-users nav-icon" />
                                <p style={{ fontSize: 13 }}>
                                  Employee Supervisors
                                </p>
                              </Link>
                            </li> */}

                            <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.assign_sub_department}
                              >
                                <i className="nav-icon fa fa-users nav-icon" />
                                <p style={{ fontSize: 13 }}>
                                 Assign Sub-Department
                                </p>
                              </Link>
                            </li>
                        
                          {/* {Authenticator.scanLevel_Feature("Admin", 
                            "manage_roles_and_permissions",
                          ) && (
                            <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.assign_role_permission}
                              >
                                <i className="nav-icon fa fa-user-o nav-icon" />
                                <p style={{ fontSize: 13 }}>
                                  Role/Permission to User
                                </p>
                              </Link>
                            </li>
                          )} */}

                        {Authenticator.scanLevel_Feature("Admin", 
                            "manage_roles_and_permissions",
                          ) && (
                            <li className="nav-item">
                              <Link
                                className="nav-link"
                                to={global.links.assign_feature}
                              >
                                <i className="nav-icon fa fa-user-o nav-icon" />
                                <p style={{ fontSize: 13 }}>
                                  Feature Management
                                </p>
                              </Link>
                            </li>
                          )}
                        </ul>
                      </li>
                    

                    {Authenticator.scanLevel("Admin") && (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.admin_import_careers}
                        >
                          <i className="nav-icon fa fa-arrow-up nav-icon" />
                          <p>Careers</p>
                        </Link>
                      </li>
                    )}
                    {Authenticator.scanLevel_Feature("Admin", 
                            "manage_payroll_cutoff",
                    )&& (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.payroll_cutoff}
                        >
                          <i className="nav-icon fa fa-table nav-icon" />
                          <p>Payroll Cutoff</p>
                        </Link>
                      </li>
                    )}
                    {/* {Authenticator && (
                      <li className="nav-item">
                        <Link className="nav-link" to={global.links.kpi_upload}>
                          <i className="nav-icon fa fa-user-plus nav-icon" />
                          <p style={{ fontSize: 13 }}>Register User</p>
                        </Link>
                      </li>
                    )} */}

                    <li className="nav-item">
                      <Link
                        className="nav-link"
                        to={global.links.generate_date}
                      >
                        <i className="nav-icon fa fa-bars nav-icon" />
                        <p>Generate Date</p>
                      </Link>
                    </li>

                    {Authenticator.scanLevel("Admin") && (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.manage_change_logs}
                        >
                          <i className="nav-icon fa fa-folder-open nav-icon" />
                          <p style={{ fontSize: 13 }}>EVOX Updates</p>
                        </Link>
                      </li>
                    )}
                    {Authenticator.scanLevel("Admin") && (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.department_list}
                        >
                          <i className="nav-icon fa fa-bars nav-icon" />
                          <p>Department List</p>
                        </Link>
                      </li>
                    )}

                    {Authenticator.scanLevel_Feature("Admin", 
                            "manage_announcements"
                          )&& (
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to={global.links.admin_announcement_list}
                        >
                          <i className="nav-icon fa fa-comments-o  nav-icon" />
                          <p>All Announcement List</p>
                        </Link>
                      </li>
                    )}
                  </ul>
                </li>
              )}

              {/* <li className="nav-item">
              <a onClick={() => props.logOut()} className="nav-link">
                <i className="fa fa-sign-out nav-icon" />
                <p>Log Out</p>
              </a>
            </li> */}
            </ul>
          </nav>
        </div>
      </aside>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    user: state.user,
    settings: state.settings,
    selected_summary: state.report.selected_summary,
    my_team_pending_request: state.myTeamRequestList?.statusNumbers?.pending
      ? state.myTeamRequestList.statusNumbers.pending
      : null,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    // logOut: () => dispatch(logOut()),
    
    setSelectedAttendanceSummary: (data) =>
      dispatch(setSelectedAttendanceSummary(data)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(Sidebar);
