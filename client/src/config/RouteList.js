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
import ScheduleInfo from "../container/Schedule/ScheduleInfo";
import TemplateEdit from "../container/Schedule/TemplateEdit";
import TemplateList from "../container/Schedule/TemplateList";
import PageNotFound from "../container/PageNotFound";
import DailyTimeRecord from "../container/DailyTimeRecord";
import DailyTimeRecordPuncher from "../container/DailyTimeRecordPuncher";
import DtrPunch from "../container/DtrPunch";
import EVLearning from "../container/EVLearning/EVLearning";
import ElSecureCoding from "../container/ElSecureCoding/ElSecureCoding";
import OpsSchedule from "../container/OpsSchedule/";

// Requests
import AlterLog from "../container/Request/AlterLog";
import AlterLogPunch from "../container/Request/AlterLogPunch";
import ChangeSchedule from "../container/Request/ChangeSchedule";
import Overtime from "../container/Request/Overtime";
import RestDayWork from "../container/Request/RestDayWork";
import WorkFromHome from "../container/Request/WorkFromHome";
import COE from "../container/Request/COE/COE";

import MyTeamRequests from "../container/MyTeam/MyTeamRequests";
import MyTeamSchedule from "../container/MyTeam/MyTeamSchedule";

import MyRequests from "../container/MyRequests/MyRequests";

import DtrSummary from "../container/MyTeam/DtrSummary";
import DtrSummaryNew from "../container/MyTeam/DtrSummaryNew";
import DtrSummaryConflictReport from "../container/MyTeam/DtrConflictReport";
// Admin
import PayrollCutoff from "../container/Admin/PayrollCutoff";
import AssignDepartmentHandlers from "../container/Admin/AssignDepartmentHandlers";
import AssignEmployeeSupervisors from "../container/Admin/AssignEmployeeSupervisors";
import AssignSubDepartment from "../container/Admin/AssignSubDepartment";
import SyncBhrLeaves from "../container/Admin/SyncBhrLeaves"; 
import SyncUTCAdjustment from "../container/Admin/SyncUTCAdjustment";
import SyncUserUpdates from "../container/Admin/SyncUserUpdates"; 
import AssignRolesPermissions from "../container/Admin/AssignRolesPermissions";
import AssignFeature from "../container/Admin/AssignFeature";
import AdminAnnouncementsList from "../container/Admin/AdminAnnouncementsList";
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
import HRTeamAttendanceSummary from "../container/Report/HRTeamAttendanceSummary";
import AssignEmployeesClient from "../container/Admin/AssignEmployeesClient";
import ChangeLogs from "../container/Admin/ChangeLogs";
import DepartmentList from "../container/Admin/DepartmentList";
import DepartmentAnnouncementsList from "../container/DepartmentAnnouncements/DepartmentAnnouncementsList";
import DepartmentAnnouncementsForm from "../container/DepartmentAnnouncements/DepartmentAnnouncementsForm";
import AnnouncementsPage from "../container/DepartmentAnnouncements/AnnouncementsPage";

import HrAnnouncements from "../container/Hr/Announcements";
import PostHrAnnouncements from "../container/Hr/PostAnnouncements";

import HrAnnouncementsForm from "../container/Hr/HrAnnouncementsForm";
import HrAnnouncementsList from "../container/Hr/HrAnnouncementsList";
import Test from "../components/MeetingRoomBooking/Test";
// import Meetingcalander from "../components/MeetingRoomBooking/Meetingcalander";
import RoomMaster from "../components/MeetingRoomBooking/RoomMaster";
import Roomlist from "../components/MeetingRoomBooking/Roomlist";
import Meetingroombooking from "../components/MeetingRoomBooking/Meetingroombooking";
import LocationMaster from "../components/MeetingRoomBooking/LocationMaster";
import Locationlist from "../components/MeetingRoomBooking/Locationlist";
import Meetingroomapproval from "../components/MeetingRoomBooking/Meetingroomapproval";
import Meetingcalander from "../components/MeetingRoomBooking/Meetingcalander";
import Referjobs from "../components/JobReferal/Referjobs";
import MyTeamAllRequest from "../container/MyTeam/MyTeamRequests/MyTeamAllRequest";
import MyOverallRequest from "../container/MyOverallRequest/MyOverallRequest";
import ItRequirementList from "../components/MeetingRoomBooking/ItRequirementList";
import OverallRequest from "../container/MyTeam/OverallRequest";
import OpsScheduleForm from "../container/OpsSchedule/OpsScheduleForm";
import OpsScheduleList from "../container/OpsSchedule/OpsScheduleList";
import JobOpeningsUpdate from "../container/Admin/JobOpeningsUpdate/JobOpeningsUpdate";

import DtrMultiLogsSummary from "../container/MyTeam/DtrMultiLogsSummary";


import ViewReport from "../components/DateReport/ViewReport";
import ViewReportMorocco from "../components/DateReport/ViewReportMorocco";
import DisputeForm from "../components/PayrollDispute/DisputeForm";
import DisputeReport from "../components/PayrollDispute/DisputeReport";
import PoliciesDocumentUpload from "../components/PoliciesDocument/PoliciesDocumentUpload";
import PoliciesDocumentDownload from "../components/PoliciesDocument/PoliciesDocumentDownload";
import UploadedDocumentList from "../components/PoliciesDocument/UploadedDocumentList";
import AssetManagementForm from "../components/AssetManagementForm/AssetManagementForm";
import AssetReport from "../components/AssetManagementForm/AssetReport/AssetReport";

const RoutesList = (props) => {
  const  country = props.settings?.country ? props.settings?.country : "";
  // Register all the Routes that will be used in the Application (excluding the Login)
  const DefaultContainer = () => (
    
    <div>
      <Switch>

        { /* General Links */ }
        <ProtectedRoute exact path={global.links.dashboard} >
          <Dashboard 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          
          
          
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dpa} >
            {country.toLowerCase() == "india" ? 
              <><DPAFormIndia  
              level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
              /> </> 
              :
              <><DPAForm  
              level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
              /></>
            }
      </ProtectedRoute>


        
        { /* Employee Links */ }
        <ProtectedRoute exact path={global.links.dtr+":id"} >
          <DailyTimeRecord 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_punchlist+":id"} >
          <DailyTimeRecordPuncher 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          feature={["multi_login"]}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_punch_history} >
          <DtrPunch 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          feature={["multi_login"]}/>
        </ProtectedRoute>
        

        <ProtectedRoute exact path={global.links.ev_learning} >
          <EVLearning 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.ev_learning_secure_coding} >
          <ElSecureCoding 
          />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.ops_schedule} >
          <OpsSchedule 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.profile+":id"} >
          <Profile 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.room_list}>
          <Roomlist />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.room_master + ":id"}>
          <RoomMaster/>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.meeting_calander + ":id"}>
          {/* <Test/> */}
          <Meetingcalander/>
         </ProtectedRoute>
        <ProtectedRoute exact path={global.links.location_list}>
          <Locationlist/>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.location_master + ":id"}>
          <LocationMaster/>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.booked_list}>
          <Meetingroombooking/>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.meetingroom_approval + ":id"}>
          <Meetingroomapproval />
        </ProtectedRoute>

        {/* <ProtectedRoute exact path={global.links.job_referal}>
          <Referjobs />
        </ProtectedRoute> */}
        <ProtectedRoute exact path={global.links.requirement_list}>
        <ItRequirementList/>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.my_request}>
          <MyRequests 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          
          
          />
        </ProtectedRoute>


        

        { /* Request Links */ }
        <ProtectedRoute exact path={global.links.overtime+":id?"}>
          <Overtime onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={['request_overtime']}
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.alter_log+":id?"}>
          <AlterLog onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={['request_alter_logs']}
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.alter_log_punch+":id?"}>
          <AlterLogPunch onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={['multi_login']}
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.change_schedule+":id?"}>
          <ChangeSchedule onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={['request_change_schedule']}
          />
        </ProtectedRoute>
        
        <ProtectedRoute exact path={global.links.rest_day_work+":id?"}>
          <RestDayWork onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={['request_rest_day_work']}
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.policies_upload}>
          <PoliciesDocumentUpload />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.policies_document_list}>
          <UploadedDocumentList />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.policies_download}>
          <PoliciesDocumentDownload />
        </ProtectedRoute>

        {/* <ProtectedRoute exact path={global.links.work_from_home+":id?"}>
          <WorkFromHome onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={[]}
          />
        </ProtectedRoute> */}

        <ProtectedRoute exact path={global.links.coe+":id?"}>
          <COE onApproval={false} 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          feature={['request_coe']}
          />
        </ProtectedRoute>

        { /* Team Links */ }
        {/* <ProtectedRoute exact path={global.links.manage_teams}>
          <ManageTeams 
          level={["Department Head","DivisionHead","Board","HR","Payroll","Client"]} 
          role={['supervisor']} permission={['manage_teams']}/>
        </ProtectedRoute> */}

        <ProtectedRoute exact path={global.links.dpa_list}>
          <DPAList 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll"]} 
          role={['supervisor']} permission={['view_dpa_list']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.employee_list}>
          <EmployeeList 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} feature={["view_employee_list"] }
          role={['supervisor', 'team_leader', 'client']} permission={['supervisor_access', 'team_leader_access', 'client_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.my_team_requests}>
          <MyTeamRequests 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]}   
          feature={['manage_alter_log_request',
            'manage_change_schedules_request',
            'manage_rest_day_work_request',
            'manage_overtime_request'] }
          role={['supervisor', 'team_leader']} permission={['view_employee_requests', 'team_leader_access']} />
        </ProtectedRoute> 

        <ProtectedRoute exact path={global.links.my_team_schedule}>
          <MyTeamSchedule 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR"]} feature = {['manage_department_schedules']}
          role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.my_team_all_requests}>
          <MyTeamAllRequest 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]}   
          feature={['manage_alter_log_request',
            'manage_change_schedules_request',
            'manage_rest_day_work_request',
            'manage_overtime_request'] }
          role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.my_overall_request}>
          <MyOverallRequest 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]}   
          feature={['manage_alter_log_request',
            'manage_change_schedules_request',
            'manage_rest_day_work_request',
            'manage_overtime_request'] }
          role={['supervisor', 'team_leader']} permission={['manage_schedule', 'team_leader_access']} />
        </ProtectedRoute>
        
        {/* <ProtectedRoute exact path={global.links.overallrequest}>
          <OverallRequest />
        </ProtectedRoute> */}

        {/* <ProtectedRoute exact path={global.links.dtr_summary}>
          <DtrSummary 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} />
        </ProtectedRoute> */}

        <ProtectedRoute exact path={global.links.dtr_summary}>
          {/* <DtrSummary 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} /> */}
          <DtrSummaryNew 
         feature={['view_dtr_summary'] }
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_multi_logs_summary}>
          {/* <DtrSummary 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} /> */}
          <DtrMultiLogsSummary 
         feature={['view_dtr_summary'] }
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_conflict}>
          {/* <DtrSummary 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} /> */}
          <DtrSummaryConflictReport 
          feature={['view_dtr_summary'] }
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_summary_new}>
          {/* <DtrSummary 
          level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} /> */}
          <DtrSummaryNew 
          feature={['view_dtr_summary'] }
          role={['supervisor', 'team_leader']} permission={['view_dtr_summary', 'team_leader_access']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.dtr_logs}>
          <DtrLogs 
          feature={['view_dtr_logs']} 
          role={['supervisor', 'team_leader', 'client']} permission={['view_dtr_logs', 'team_leader_access', 'client_access']} />
        </ProtectedRoute>

        
        

        { /* Schedule Links */ }
        <ProtectedRoute exact path={global.links.template_add} >
          <TemplateCreate 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR"]} feature = {['manage_department_schedules']}
          />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.template_list+":templateid"} >
          <TemplateEdit  
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR"]} feature = {['manage_department_schedules']}
          />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.template_list} >
          <TemplateList  
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR"]} feature = {['manage_department_schedules']}
          />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.schedule_assign_user+":user_id"} >
          <ScheduleAssign 
          level={["SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR"]} feature = {['change_employee_schedule']} 
          />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.profile+":user_id"+"/schedule/"+":schedule_id"} >
          <ScheduleInfo   />
        </ProtectedRoute>

        <ProtectedRoute path={global.links.schedule_assign_department} >
          <ScheduleAssignDepartment 

          />
        </ProtectedRoute>


        

        {/* Report Links */}
        <ProtectedRoute exact path={global.links.team_attendance_summary}>
          <TeamAttendanceSummary 
          feature = {['view_attendance_report']} 
          />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.hr_team_attendance_summary}>
          <HRTeamAttendanceSummary 
            feature = {['view_attendance_report']}  
            />
        </ProtectedRoute>


        {/* Announcement links */}
        <ProtectedRoute exact path={global.links.department_announcement_list}>
        <DepartmentAnnouncementsList  
          
          feature = {['manage_announcement']}   
        />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.announcement_page+":id"}>
          <AnnouncementsPage
          //any user under her deparment can access her department announcement page
          />
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.announcement_page+":id"}>
          <AnnouncementsPage
          //any user under her deparment can access her department announcement page
          />
        </ProtectedRoute>



        {/* Admin Links */}
        <ProtectedRoute exact path={global.links.payroll_cutoff}>
          <PayrollCutoff 
          level={["Admin","Payroll"]} 
          role={['admin']} permission={['manage_payroll_cutoff']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_department_handlers}>
          <AssignDepartmentHandlers  
          level={["Admin"]} 
          role={['admin']} permission={['assign_department_handlers']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_employees_client}>
          <AssignEmployeesClient  
          level={["Admin"]} 
          role={['admin']} permission={['assign_employees_client']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_employee_supervisors}>
          <AssignEmployeeSupervisors  
          level={["Admin"]} 
          role={['admin']} permission={['assign_employee_supervisors']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_sub_department}>
          <AssignSubDepartment  
          level={["Admin"]} 
          role={['admin']} permission={['assign_employee_supervisors']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.sync_biometrics}>
          <SyncBiometrics  
          level={["Admin"]} 
          role={['admin']} permission={['sync_biometrics']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.sync_bhr_leaves}>
          <SyncBhrLeaves  
          level={["Admin"]} 
          role={['admin']} permission={['sync_bhr_leaves']} />
        </ProtectedRoute> 

        <ProtectedRoute exact path={global.links.sync_utc_adjustment}>
          <SyncUTCAdjustment  
          level={["Admin"]} 
          role={['admin']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.sync_bhr_user_updates}>
          <SyncUserUpdates  
          level={["Admin"]} 
          role={['admin']} permission={['sync_bhr_user_updates']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_role_permission}>
          <AssignRolesPermissions  
          level={["Admin"]} 
          role={['admin']} permission={['assign_role_permission']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.assign_feature}>
          <AssignFeature  
          level={["Admin"]} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.register_user}>
          <RegisterUser  
          level={["Admin"]} 
          role={['admin']} permission={['allow_register_user']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.generate_date}>
          <GenerateDate  
          level={["Admin"]} 
          role={['admin']}  />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.admin_announcement_list}>
          <AdminAnnouncementsList  
          level={["Admin"]} 
          role={['admin']}  />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.manage_change_logs}>
          <ChangeLogs  
          level={["Admin"]} 
          role={['admin']}  />
        </ProtectedRoute>
          
        <ProtectedRoute exact path={global.links.department_list}>
          <DepartmentList  
          level={["Admin"]} 
          role={['admin']} permission={['access_department_list']} />
        </ProtectedRoute>


        <ProtectedRoute exact path={global.links.department_announcement_form+":id?"}>
          <DepartmentAnnouncementsForm
            
            feature = {['manage_announcement']}    
            role={['supervisor', 'client']} permission={['manage_department_announcements','client_access']} 
         />

         
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.ops_schedule_form+":id?"}>
          <OpsScheduleForm 
          // level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          // role={['ops']} permission={['manage_ops_schedules']}
          />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.ops_schedule_list}>
          <OpsScheduleList 
          // level={["Employee","SubDepartment Head","Department Head","DivisionHead","Board","Admin","HR","Payroll","Client"]} 
          // role={['ops']} permission={['manage_ops_schedules']} 
          />
        </ProtectedRoute>


        <ProtectedRoute exact path={global.links.manage_hr_announcements}>
          <HrAnnouncementsList  
          level={["HR"]} 
          role={['hr']} />
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.post_hr_announcements+":id?"}>
          <HrAnnouncementsForm  
          feature = {['manage_announcement']} 
          role={['hr']} permission={['manage_hr_announcements']}/>
        </ProtectedRoute> 

        <ProtectedRoute exact path={global.links.admin_import_careers}>
          <JobOpeningsUpdate  
          level={["Admin"]} 
          role={['admin']} permission={['full_access']}/>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.view_report}>
           <ViewReport></ViewReport>
        </ProtectedRoute> 

        <ProtectedRoute exact path={global.links.view_report_morocco}>
           <ViewReportMorocco></ViewReportMorocco>
        </ProtectedRoute>

        <ProtectedRoute exact path={global.links.payroll_dispute+":id?"}>
           <DisputeForm></DisputeForm>
        </ProtectedRoute> 
        <ProtectedRoute exact path={global.links.payroll_dispute_view}>
           <DisputeReport></DisputeReport>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.asset_management+":id?"}>
           <AssetManagementForm></AssetManagementForm>
        </ProtectedRoute>
        <ProtectedRoute exact path={global.links.asset_reports}>
           <AssetReport></AssetReport>
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