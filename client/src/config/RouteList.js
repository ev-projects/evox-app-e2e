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
import Dashboard from "../container/Dashboard";
import TemplateCreate from "../container/Schedule/TemplateCreate";
import ScheduleAssign from "../container/Schedule/ScheduleAssign";
import TemplateEdit from "../container/Schedule/TemplateEdit";
import TemplateList from "../container/Schedule/TemplateList";
import PageNotFound from "../container/PageNotFound";
import DailyTimeRecord from "../container/DailyTimeRecord";

// Requests
import AlterLog from "../container/Request/AlterLog";
import ChangeSchedule from "../container/Request/ChangeSchedule";
import Overtime from "../container/Request/Overtime";
import RestDayWork from "../container/Request/RestDayWork";
import WorkFromHome from "../container/Request/WorkFromHome";

import MyTeamRequests from "../container/MyTeam/MyTeamRequests";
import MyRequests from "../container/MyRequests/MyRequests";

import DtrSummary from "../container/MyTeam/DtrSummary";

// Admin
import PayrollCutoff from "../container/Admin/PayrollCutoff";
import AssignDepartmentHandlers from "../container/Admin/AssignDepartmentHandlers";
import AssignEmployeeSupervisors from "../container/Admin/AssignEmployeeSupervisors";
import AssignRole from "../container/Admin/AssignRole";
import MyTeamList from "../container/MyTeam/MyTeamList";
import Profile from "../container/Profile";
import Validator from "../services/Validator";
import RequestEmailApproval from "../container/RequestEmailApproval";
import ScheduleAssignDepartment from "../container/Schedule/ScheduleAssignDepartment";
import DtrLogs from "../container/MyTeam/DtrLogs";
import ForgotPasswordRequest from "../container/ForgotPasswordRequest";
import DPAForm from "../container/DPAForm";

const RoutesList = (props) => {

  // Register all the Routes that will be used in the Application (excluding the Login)
  const DefaultContainer = () => (
    <div>
      <Switch>
        <ProtectedRoute exact path="/app/dashboard" ><Dashboard /></ProtectedRoute>
        <ProtectedRoute exact path="/app/schedule" ><TemplateCreate /></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/assign/user/:user_id" ><ScheduleAssign /></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/assign/department/" ><ScheduleAssignDepartment /></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/template/:templateid" ><TemplateEdit/></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/template/" ><TemplateList /></ProtectedRoute>


        {/* Requests */}
        <ProtectedRoute exact path="/app/request/AlterLog/:id?"><AlterLog onApproval={false}/></ProtectedRoute>

        <ProtectedRoute exact path="/app/request/ChangeSchedule/:id?"><ChangeSchedule onApproval={false}/></ProtectedRoute>

        <ProtectedRoute exact path="/app/request/Overtime/:id?"><Overtime onApproval={false}/></ProtectedRoute>
        
        <ProtectedRoute exact path="/app/request/RestDayWork/:id?"><RestDayWork onApproval={false}/></ProtectedRoute>

        <ProtectedRoute exact path="/app/request/WorkFromHome/:id?"><WorkFromHome onApproval={false}/></ProtectedRoute>

        <ProtectedRoute exact path="/app/account/MyRequests"><MyRequests/></ProtectedRoute>

        {/* For Supervisors */}
        <ProtectedRoute exact path="/app/team/MyTeamList"><MyTeamList/></ProtectedRoute>
        <ProtectedRoute exact path="/app/team/MyTeamRequests"><MyTeamRequests/></ProtectedRoute>
        <ProtectedRoute exact path="/app/team/DtrSummary"><DtrSummary/></ProtectedRoute>
        <ProtectedRoute exact path="/app/team/DtrLogs"><DtrLogs/></ProtectedRoute>

        {/* Settings */}
        <ProtectedRoute exact path="/app/admin/PayrollCutoff/"><PayrollCutoff /></ProtectedRoute>
        <ProtectedRoute exact path="/app/admin/AssignDepartmentHandlers/"><AssignDepartmentHandlers /></ProtectedRoute>
        <ProtectedRoute exact path="/app/admin/AssignEmployeeSupervisors/"><AssignEmployeeSupervisors /></ProtectedRoute>
        <ProtectedRoute exact path="/app/admin/AssignRole/"><AssignRole /></ProtectedRoute>

        
        <ProtectedRoute exact path="/app/dtr/:id/" ><DailyTimeRecord/></ProtectedRoute>
        <ProtectedRoute exact path="/app/profile/:id/" ><Profile/></ProtectedRoute>
        <ProtectedRoute exact path="/app/dpa/" ><DPAForm/></ProtectedRoute>
        <Route exact path="*" component={PageNotFound} />
      </Switch>
      <Footer />
    </div>
  );
  
  // Contains the Login Routes. (No specific changes needed to do here.)
  const LoginContainer = () => (
    <div className="container">
      <Route exact path="/" component={Login} />
      <Route path="/login" component={Login} />
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
        <Route exact path={["/", "/login"]} component={LoginContainer} />
        <Route exact path="/request/approval/:hashCode/:status?" component={RequestEmailApproval} />
        <Route exact path="/recover/password" component={ForgotPasswordRequest} />
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
