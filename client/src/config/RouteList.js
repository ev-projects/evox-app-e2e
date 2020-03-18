import React from "react";
import { Route, Switch, Component } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoutes";
import API from "../services/API";

// Templated Components
import Header from "../components/Template/Header";
import Sidebar from "../components/Template/Sidebar";
import Footer from "../components/Template/Footer";

// Containers
import Login from "../container/Login";
import Dashboard from "../container/Dashboard";
import Schedule from "../container/Schedule";
import AssignDefault from "../container/AssignDefault";
import Template_Edit from "../container/Template/Template_Edit";
import Template_List from "../container/Template/Template_List";
import PageNotFound from "../container/PageNotFound";
import DailyTimeRecord from "../container/DailyTimeRecord";

const RoutesList = () => {

  // Register all the Routes that will be used in the Application (excluding the Login)
  const DefaultContainer = () => (
    <div>
      <Header />
      <Sidebar />
      <Switch>
        <ProtectedRoute exact path="/app/dashboard" ><Dashboard /></ProtectedRoute>
        <ProtectedRoute exact path="/app/schedule" ><Schedule /></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/assign/:userid" ><AssignDefault /></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/template/:templateid" ><Template_Edit/></ProtectedRoute>
        <ProtectedRoute path="/app/schedule/template/" ><Template_List /></ProtectedRoute>
        <ProtectedRoute exact path="/app/dtr/:id/:from/:to" ><DailyTimeRecord/></ProtectedRoute>
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
      <Switch>
        <Route exact path={["/", "/login"]} component={LoginContainer} />
        <Route component={DefaultContainer} />
      </Switch>
    </div>
  );
}

export default RoutesList;
