import React from "react";
import { Route, Switch, Component } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoutes";
import API from "../services/API";
import { connect } from 'react-redux'

// Templated Components
import Header from "../components/Template/Header";
import Sidebar from "../components/Template/Sidebar";
import Footer from "../components/Template/Footer";

// Containers
import Login from "../container/Login";
import AuthenticateClient from "../container/AuthenticateClient";
import EmailNotFound from "../container/EmailNotFound";
import Dashboard from "../container/Dashboard";
import TemplateCreate from "../container/Schedule/TemplateCreate";
import ScheduleAssign from "../container/Schedule/ScheduleAssign";
import TemplateEdit from "../container/Schedule/TemplateEdit";
import TemplateList from "../container/Schedule/TemplateList";
import PageNotFound from "../container/PageNotFound";
import DailyTimeRecord from "../container/DailyTimeRecord";
import EVLearning from "../container/EVLearning/EVLearning";
import OpsSchedule from "../container/OpsSchedule/";

// Requests
import AlterLog from "../container/Request/AlterLog";
import ChangeSchedule from "../container/Request/ChangeSchedule";
import Overtime from "../container/Request/Overtime";
import RestDayWork from "../container/Request/RestDayWork";
import WorkFromHome from "../container/Request/WorkFromHome";

import MyTeamRequests from "../container/MyTeam/MyTeamRequests";
import MyTeamSchedule from "../container/MyTeam/MyTeamSchedule";

import MyRequests from "../container/MyRequests/MyRequests";

import DtrSummary from "../container/MyTeam/DtrSummary";

// Admin
import PayrollCutoff from "../container/Admin/PayrollCutoff";
import AssignDepartmentHandlers from "../container/Admin/AssignDepartmentHandlers";
import AssignEmployeeSupervisors from "../container/Admin/AssignEmployeeSupervisors";
import SyncBhrLeaves from "../container/Admin/SyncBhrLeaves"; 
import SyncUserUpdates from "../container/Admin/SyncUserUpdates"; 
import AssignRolesPermissions from "../container/Admin/AssignRolesPermissions";
import JobInformation from "../container/Profile/JobInformation";
import PersonalInformation from "../container/Profile/PersonalInformation";
import Validator from "../services/Validator";
import RequestEmailApproval from "../container/RequestEmailApproval";
import ScheduleAssignDepartment from "../container/Schedule/ScheduleAssignDepartment";
import DtrLogs from "../container/MyTeam/DtrLogs";
import ForgotPasswordRequest from "../container/ForgotPasswordRequest";
import DPAForm from "../container/DPAForm";
import DPAFormIndia from "../container/DPAFormIndia";
import DPAList from "../container/MyTeam/DPAList";
import RegisterUser from "../container/Admin/RegisterUser";
import GenerateDate from "../container/Admin/GenerateDate";
import SyncBiometrics from "../container/Admin/SyncBiometrics/SyncBiometrics";
import EmployeeList from "../container/MyTeam/EmployeeList";
import ManageTeams from "../container/MyTeam/ManageTeams";
import TimeOff from "../container/Profile/TimeOff";
import Profile from "../container/Profile";
import TeamAttendanceSummary from "../container/Report/TeamAttendanceSummary/TeamAttendanceSummary";
import AssignEmployeesClient from "../container/Admin/AssignEmployeesClient";
import ChangeLogs from "../container/Admin/ChangeLogs";
import DepartmentList from "../container/Admin/DepartmentList";

const RoutesList = (props) => {
  const  country = props.settings?.country ? props.settings?.country : "";
  // Register all the Routes that will be used in the Application (excluding the Login)
  const DefaultContainer = () => (
    
    <div>
      <Switch>

        { /* General Links */ }
        <ProtectedRoute exact path={global.links.dashboard} >
          <Dashboard role={['employee', 'supervisor', 'team_leader', 'client']} permission={['employee_access', 'supervisor_access', 'team_leader_access', 'client_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dpa} >
            {country.toLowerCase() == "india" ? 
              <><DPAFormIndia  role={['employee']} permission={['employee_access']}/> </> 
              :
              <><DPAForm  role={['employee']} permission={['employee_access']}/></>
            }
      </ProtectedRoute>


        
        { /* Employee Links */ }
        <ProtectedRoute exact path={global.links.dtr+":id"} >
          <DailyTimeRecord role={['employee', 'supervisor', 'team_leader', 'client']} permission={['employee_access', 'supervisor_access', 'team_leader_access', 'client_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.ev_learning} >
          <EVLearning role={['employee', 'supervisor', 'team_leader', 'client']} permission={['employee_access', 'supervisor_access', 'team_leader_access', 'client_access']}/>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.ops_schedule} >
          <OpsSchedule role={['employee', 'supervisor', 'team_leader', 'client']} permission={['employee_access', 'supervisor_access', 'team_leader_access', 'client_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.profile+":id"} >
          <Profile role={['employee', 'supervisor', 'team_leader', 'client']} permission={['employee_access', 'supervisor_access', 'team_leader_access', 'client_access']}/>
        </ProtectedRoute>
        
        <ProtectedRoute exact path={global.links.my_request}>
          <MyRequests role={['employee']} permission={['employee_access']}/>
        </ProtectedRoute>


        

        { /* Request Links */ }
        <ProtectedRoute exact path={global.links.overtime+":id?"}>
          <Overtime onApproval={false} role={['employee']} permission={['employee_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.alter_log+":id?"}>
          <AlterLog onApproval={false} role={['employee']} permission={['employee_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.change_schedule+":id?"}>
          <ChangeSchedule onApproval={false} role={['employee']} permission={['employee_access']}/>
        </ProtectedRoute>
        
        <ProtectedRoute exact path={global.links.rest_day_work+":id?"}>
          <RestDayWork onApproval={false} role={['employee']} permission={['employee_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.work_from_home+":id?"}>
          <WorkFromHome onApproval={false} role={['employee']} permission={['employee_access']}/>
        </ProtectedRoute>


        

        { /* Team Links */ }
        <ProtectedRoute exact path={global.links.manage_teams}>
          <ManageTeams role={['supervisor']} permission={['manage_teams']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dpa_list}>
          <DPAList role={['supervisor']} permission={['view_dpa_list']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.employee_list}>
          <EmployeeList role={['supervisor', 'team_leader', 'client']} permission={['supervisor_access', 'team_leader_access', 'client_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.my_team_requests}>
          <MyTeamRequests role={['supervisor', 'team_leader']} permission={['view_employee_requests', 'team_leader_access']} />
        </ProtectedRoute> 

        <ProtectedRoute exact path={global.links.my_team_schedule}>
          <MyTeamSchedule role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_summary}>
          <DtrSummary role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_logs}>
          <DtrLogs role={['supervisor', 'team_leader', 'client']} permission={['view_dtr_logs', 'team_leader_access', 'client_access']} />
        </ProtectedRoute>

        
        

        { /* Schedule Links */ }
        <ProtectedRoute exact path={global.links.template_add} >
          <TemplateCreate role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.template_list+":templateid"} >
          <TemplateEdit  role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.template_list} >
          <TemplateList  role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.schedule_assign_user+":user_id"} >
          <ScheduleAssign role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.schedule_assign_department} >
          <ScheduleAssignDepartment role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']}/>
        </ProtectedRoute>


        

        {/* Report Links */}
        <ProtectedRoute exact path={global.links.team_attendance_summary}>
          <TeamAttendanceSummary role={['supervisor','client']} permission={['supervisor_access','client_access']} />
        </ProtectedRoute>


        

        {/* Admin Links */}
        <ProtectedRoute exact path={global.links.payroll_cutoff}>
          <PayrollCutoff role={['admin']} permission={['manage_payroll_cutoff']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_department_handlers}>
          <AssignDepartmentHandlers  role={['admin']} permission={['assign_department_handlers']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_employees_client}>
          <AssignEmployeesClient  role={['admin']} permission={['assign_employees_client']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_employee_supervisors}>
          <AssignEmployeeSupervisors  role={['admin']} permission={['assign_employee_supervisors']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.sync_biometrics}>
          <SyncBiometrics  role={['admin']} permission={['sync_biometrics']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.sync_bhr_leaves}>
          <SyncBhrLeaves  role={['admin']} permission={['sync_bhr_leaves']} />
        </ProtectedRoute> 

        <ProtectedRoute exact path={global.links.sync_bhr_user_updates}>
          <SyncUserUpdates  role={['admin']} permission={['sync_bhr_user_updates']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_role_permission}>
          <AssignRolesPermissions  role={['admin']} permission={['assign_role_permission']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.register_user}>
          <RegisterUser  role={['admin']} permission={['allow_register_user']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.generate_date}>
          <GenerateDate  role={['admin']}  />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.manage_change_logs}>
          <ChangeLogs  role={['admin']}  />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.department_list}>
          <DepartmentList  role={['admin']} permission={['access_department_list']} />
        </ProtectedRoute>
        
        <Route exact path={["/", global.links.authenticate_client ]} component={AuthenticateClient} />
        <Route exact path={["/", global.links.email_not_found ]} component={EmailNotFound} />
        <Route exact path="*" component={PageNotFound} />
      </Switch>
      <Footer />
    </div>
  );
  
  // Contains the Login Routes. (No specific changes needed to do here.)
  const LoginContainer = () => (
    <div className="container">
      <Route exact path="/" component={Login} />
      <Route path={global.links.login} component={Login} />
    </div>
  );

  

  return (
    <div>
      <div style={{'display' : ( Validator.isValid( props.user.first_name ) ) ? 'block':'none'}}>
        <Header />
        <Sidebar />
        <div>&nbsp;</div>
      </div>
      <Switch>
        <Route exact path={["/", global.links.login ]} component={LoginContainer} />
        <Route exact path={global.links.request_approval+":hashCode/:status?"} component={RequestEmailApproval} />
        <Route exact path={global.links.recover_password} component={ForgotPasswordRequest} />
        <Route component={DefaultContainer} />
      </Switch>
    </div>
  );
}


const mapStateToProps = (state) => {
  return {
      user : state.user,
      settings : state.settings
  }
}

export default connect(mapStateToProps, null)(RoutesList);
