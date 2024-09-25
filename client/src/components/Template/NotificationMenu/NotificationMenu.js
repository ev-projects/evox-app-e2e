import React, { Component,useState, useEffect } from "react";
import axios from 'axios';
import "./NotificationMenu.css";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import Validator from "../../../services/Validator";
import { Link } from "react-router-dom";
import { logOut } from '../../../store/actions/userActions'
import { Container, Row, Col, Table, Image, Spinner, Button, Badge, Tab, Tabs, Dropdown } from 'react-bootstrap';
import $ from 'jquery';
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions'
// import { DocumentStore } from 'ravendb';
class NotificationMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      NavHasLoaded: false,
      setNumNotificationsToShow: 5,
    };
  }

  componentDidMount() {

    // const store = new DocumentStore('http://localhost:8080', 'Northwind');

    // store.initialize();
    
    
    // const session = store.openSession();

    
    // const id = 'products/77-A';
    // console.log("here2")
    // session.load(id)
    //   .then(document => {
    //     console.log("here2")

    //     console.log(document);
    
    //   })
    
    //   .catch(error => {
    
    //     console.error(error);
    
    //   });

  }

  render = () => {

    const { my_dtr_notifications } = this.props.dashboard;
    // const notificationCount = my_dtr_notifications?.length || 0; 

    const notifications = [

      {

        id: 1,

        tag: "DTR",

        title: "DTR",

        summary: "Date from Aug 8 has no clock in",

        date_created: "2023-03-01",
                
        CountryId: "2",

        DepartmentId: "23",


        read: false,

        user_id: 142

      },

      {

        id: 1,

        tag: "warning",

        title: "Payroll Deadline",

        summary: "Nearing Payroll Deadline",

        date_created: "2023-03-01",
                
        CountryId: "2",

        DepartmentId: "23",


        read: false,

        user_id: null

      },
      {

        id: 2,

        tag: "request",

        title: "Leave Request",

        summary: "You have requested a leave on March 15, 2023",

        date_created: "2023-03-05",
                
        CountryId: "2",

        DepartmentId: "23",


        read: false,

        user_id: 301

      },

      {

        id: 3,

        tag: "announcements",

        title: "Happy Birthday!",

        summary: "Wishing John Doe a happy birthday!",

        date_created: "2023-03-07",
                
        CountryId: "2",

        DepartmentId: "23",


        read: true,

        user_id: 27

      },

      {

        id: 4,

        tag: "DTR",

        title: "DTR incomplete",

        summary: "Date from Aug 9 has no clock out",

        date_created: "2023-03-01",

        CountryId: "2",
        
        DepartmentId: "23",
        
        read: false,

        user_id: 198

      },

      {

        id: 5,

        tag: "request",

        title: "Overtime Request",

        summary: "You have requested overtime on March 10, 2023",

        date_created: "2023-03-08",
                
        CountryId: "2",

        DepartmentId: "23",

        souce_id: "8888", 


        read: false,

        user_id: 391

      },

      {

        id: 6,

        tag: "announcements",

        title: "New Policy Announcement",

        summary: "Please review the new company policy on attendance",

        date_created: "2023-03-12",
                
        CountryId: "2",

        DepartmentId: "23",



        read: false,

        user_id: 219

      }

    ];
    const unreadNotifications = notifications.filter(notification => !notification.read);
    // console.log(unreadNotifications.length);
    const notificationCount = unreadNotifications.length;
    if (this.props.user != null && this.props.user.id != null && this.state.NavHasLoaded == false) {
      this.props.getMyDtrNotifications(this.props?.user?.id);
      this.state.NavHasLoaded = true
    }

    let circleClass;
    if (notificationCount > 90) {
      circleClass = 'icon-stack-red';
    } else if (notificationCount <= 90 && notificationCount > 50) {
      circleClass = 'icon-stack-yellow';
    } else {
      circleClass = 'icon-stack-green'; 
    }

   


    return (
      <li className="nav-item">
        <Dropdown className="nav-notification-bell-dropdown">
          <Dropdown.Toggle variant="" className="bell-toggle" id="dropdown-basic">
            <span class="icon-stack">
              <i class="fa fa-bell icon-stack-3x" ></i>
              <i class={`fa fa-circle icon-stack-1x icon-stack-1x-BL ${circleClass}`} ></i>
            </span>
          </Dropdown.Toggle>
          <Dropdown.Menu className="nav-notification-bell-dropdown nav-notification-bell-dropdown-menu  ">
            <div className="card">
              <Tabs
                defaultActiveKey="all"
                transition={false}
                className="mb-3"
              >
                <Tab eventKey="all" title="All">
                  {/* Request tab content */}
                </Tab>
                <Tab eventKey="dtr" title="DTR">
                  {/* Priority tab content */}
                </Tab>
                <Tab eventKey="request" title="Request">
                  {/* Important tab content */}
                </Tab>
                {/* <Tab eventKey="request" title="others">
                
                </Tab> */}
              
              </Tabs>
              <Button variant="" className="mark-read"/*onClick={() => this.props.markAllAsRead(this.props.user.id)}*/>Mark all as read</Button>

             

                  <div className="scrollable-notifications">

                  {notifications.slice(0, this.state.setNumNotificationsToShow).map((notification, index) => (

                    <div key={index} className={`notification-item ${notification.tag}`}>

                      <h4>{notification.title}</h4>

                      <p>{notification.summary}</p>

                      <small>{notification.date_created}</small>

                      {/* {notification.read ? <span>Read</span> : <span>Unread</span>} */}

                    </div>

                  ))}

                  </div>

                 
                  {this.state.setNumNotificationsToShow < notifications.length && (

                    <Button variant="" onClick={() => this.setState({ setNumNotificationsToShow: this.state.setNumNotificationsToShow + 5 })}>

                      Show more

                    </Button>

                    )}
            </div>
          </Dropdown.Menu>
        </Dropdown>
      </li>
    );
  };
}

const mapStateToProps = (state) => {
  return {
    user: state.user,
    dashboard: state.dashboard,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    getMyDtrNotifications: (id) => dispatch(getMyDtrNotifications(id)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NotificationMenu);