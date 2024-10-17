import React, { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Dropdown, Tabs, Tab, Button } from 'react-bootstrap';
import { getMyNotifications } from '../../../store/actions/dashboard/dashboardActions';
import "./NotificationMenu.css";
import "./NotificationMenunew.css";

class NotificationMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      setNumNotificationsToShow: 5,
      selectedTag: 'all',
      notificaion_list: [],
    };
  }

  mergeNotifications = (selecttag, data) => {
    const notifications = [];
    const addNotifications = (items, type, isCelebration = false) => {
      items.forEach(item => {
        notifications.push({
          id: item.id,
          requestID: item.requestID || "",
          type: item.requestID ? "DTR" : isCelebration ? 'celebration' : type,
          title: item.title || item.eventType || (item.requestType ? item.title : "Request Status") ,
          description: item.description || (isCelebration ? ` ${item.eventType}` : "") || item.actionStatus,
          timestamp: item.timestamp || item.eventDate,
          pagetype: item.requestType ? item.requestType : "",
          announcementId: item.announcementId ? item.announcementId : "",
          celebrations: isCelebration ? "It's ":""
        });
      });
    };

    if (selecttag === 'all') {
      addNotifications(data.requestsForApproval, 'request');
      addNotifications(data.requestStatus, 'status');
      addNotifications(data.announcements, 'announcement');
      addNotifications(data.celebrations, 'celebration', true);
      addNotifications(data.missedDtr, 'missedDTR');
    } else if (selecttag === 'DTR') {
      addNotifications(data.missedDtr, 'missedDTR');
    } else if (selecttag === 'announcements') {
      addNotifications(data.announcements, 'announcement');
    } else if (selecttag === 'birthday') {
      addNotifications(data.celebrations, 'celebration', true);
    } else if (selecttag === 'request') {
      addNotifications(data.requestsForApproval, 'request');
      addNotifications(data.requestStatus, 'status');
    }
    console.log(notifications);
    this.setState({ notificaion_list: notifications });
  };

  handleTabSelect = (key) => {
    this.setState({ selectedTag: key, notificaion_list: [] }, () => {
      this.mergeNotifications(key, this.props.notificationCenter);
    });
  };

  componentDidMount() {
    const { user } = this.props;
    if (user && user.id) {
      this.props.getMyNotifications(user.id);
    } else {
      console.error("User ID is not defined.");
    }
  }

  componentDidUpdate(prevProps) {
    const { user, notificationCenter, approval, announcement, celebration, missingdtr } = this.props;

    // Update notifications when notificationCenter changes
    if (prevProps.notificationCenter !== notificationCenter) {
      this.mergeNotifications(this.state.selectedTag, notificationCenter);
    }

    // Update the state if approval or other props change
    if (prevProps.approval !== approval || 
        prevProps.announcement !== announcement || 
        prevProps.celebration !== celebration || 
        prevProps.missingdtr !== missingdtr) {
      this.setState({
        approval,
        announcement,
        celebration,
        missingdtr
      });
    }

    // Refresh notifications when user ID changes
    if (prevProps.user.id !== user.id && user.id) {
      this.props.getMyNotifications(user.id);
    }
  }

  render() {
    const { setNumNotificationsToShow, selectedTag, notificaion_list } = this.state;
    const { alldata, approval, announcement, celebration, missingdtr,user } = this.props; // Use props directly instead of state
    console.log(alldata);
    return (
      <li className="nav-item">
        {alldata > 0 ? (
          <Dropdown className="nav-notification-bell-dropdown notificationnn">
            <Dropdown.Toggle variant="" className="bell-toggle" id="dropdown-basic">
              <span className="icon-stack">
                <i className="fa fa-bell-o icon-stack-3x"></i>
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="notification-content notification-panel msnhp-style">
            {/* <Dropdown.Menu className="notification-content notification-panel msnhp-style"> */}
              <div className="notification-header">
                <div className="notification-header-title">
                  <i className="fa fa-bell" aria-hidden="true"></i> Notifications
                </div>
              </div>

              <Tabs
                defaultActiveKey="all"
                transition={false}
                className="mb-3 tabing"
                activeKey={selectedTag}
                onSelect={this.handleTabSelect}
              >
                <Tab eventKey="all" title="All Notification" />
                { approval > 0 ?
                <Tab eventKey="request" title="Approval" />
                :""}
                {announcement > 0 ?
                <Tab eventKey="announcements" title="Announcements" />
                : ""}
                {celebration > 0 ?
                <Tab eventKey="birthday" title="Celebrations" />
                :""}
                {missingdtr > 0?
                <Tab eventKey="DTR" title="Missed DTR" />
                :""}
              </Tabs>
              {/* <div className="scrollable-notifications">
              <div class="notification unread" id="notification">
      <img src="/images/Carmela_Garcia.jpg" alt="Mark Webber"></img>
      <div class="not">
        <p class="utitle"><span>Mark Webber</span> reacted to your recent post <span class="st dark">My first tournament today!</span></p>
        <p>1m ago</p>
      </div>
    </div>
    <div class="notification unread" id="notification">
    <img src="/images/Carmela_Garcia.jpg" alt="Mark Webber"></img>
      <div class="not">
        <p class="utitle"><span>Mark Webber</span> reacted to your recent post <span class="st dark">My first tournament today!</span></p>
        <p>1m ago</p>
      </div>
    </div>
    <div class="notification unread" id="notification">
    <img src="/images/Carmela_Garcia.jpg" alt="Mark Webber"></img>
      <div class="not">
        <p class="utitle"><span>Mark Webber</span> reacted to your recent post <span class="st dark">My first tournament today!</span></p>
        <p>1m ago</p>
      </div>
    </div>
</div> */}


<div className="scrollable-notifications">
              {notificaion_list.length > 0 ? (
  notificaion_list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, setNumNotificationsToShow).map(item => {
    let link = '';
    let imglink = '';
    let time_in = 1712115000;
    switch (item.pagetype) {
      case "change_schedules":
        link = global.links.change_schedule;
        break;
      case "alter_logs":
        link = global.links.alter_log;
        break;
      case "rest_day_works":
        link = global.links.rest_day_work;
        break;
      case "overtimes":
        link = global.links.overtime;
        break;
      default:
        link = ''; // Handle the default case if needed
    }
    switch (item.type) {
      case "DTR":
        imglink = '/images/img1.webp';
        break;
      case "status":
        imglink = '/images/img1.webp';
        break;
      case "missedDTR":
        imglink = "/images/img2.png";
        break;
      case "announcement":
        imglink = "/images/img3.jpg";
        break;
      default:
        imglink = '/images/Carmela_Garcia.jpg'; // Handle the default case if needed
    }
    return ( // Return the JSX here
      <div key={item.id} className="notification unread" id="notification">

      <img src={imglink} alt="Mark Webber"></img>
        {item.type === "DTR" ? (

        <Link className="not utitle" to={`${link}${item.requestID}`}>
        <p class="utitle"> {item.description} </p>
        </Link>
        ) : item.type === "missedDTR" ? (
          <Link className="not utitle" to={{
            pathname: global.links.base +'request/AlterLog/',
            date: '2024-06-01',
            current_time_in: '2024-10-08 09:00:00',
            current_time_out: '2024-10-08 18:00:00'
          }}>
          <p class="utitle"> {item.title} </p>
          </Link>
        ) : item.type === "announcement" ? (
          <Link className="not utitle" to={`${global.links.announcement_page}${item.announcementId}`}>
          <p class="utitle"> {item.description} </p>
          </Link>
        ):(
          <div class="not">
          <p class="utitle"> 
            {item.celebrations ?<span>{ item.celebrations}</span>: ""} {item.description} <span class="st dark"></span></p>
          </div>
        )}
        {/* <div className="notification-item_content">{item.description}</div>
        <small>{item.timestamp}</small> */}
      </div>
    );
  })
) : (
  <div className="no_notifi">No Notifications Available.</div>
)}

                <div className="showmore_div">
                  {setNumNotificationsToShow < notificaion_list.length && (
                    <Button variant="" onClick={() => this.setState({ setNumNotificationsToShow: setNumNotificationsToShow + 5 })}>
                      Show more
                    </Button>
                  )}
                </div>
              </div>







              {/* <div className="scrollable-notifications">
              {notificaion_list.length > 0 ? (
  notificaion_list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, setNumNotificationsToShow).map(item => {
    let link = '';
    switch (item.pagetype) {
      case "change_schedules":
        link = global.links.change_schedule;
        break;
      case "alter_logs":
        link = global.links.alter_log;
        break;
      case "rest_day_works":
        link = global.links.rest_day_work;
        break;
      case "overtimes":
        link = global.links.overtime;
        break;
      default:
        link = ''; // Handle the default case if needed
    }
    return ( // Return the JSX here
      <div key={item.id} className="notification-item">
        {item.type === "DTR" ? (
          <div className="row titleDTR">
            <div className="col">
              <h2>
                <i className="nav-icon fa fa-bars nav-icon" />
                <span>{item.title ? item.title : item.description}</span>
              </h2>
            </div>
            <div className="col">
              <Link className="nav-link" to={`${link}${item.requestID}`}>
                <i className="nav-icon fa fa-arrow-right" />
              </Link>
            </div>
          </div>
        ) : item.type === "missedDTR" ? (
          <div className="row titleDTR">
            <div className="col">
              <h2>
                <i className="nav-icon fa fa-bars nav-icon" />
                <span>{item.title ? item.title : item.description}</span>
              </h2>
            </div>
            <div className="col">
              <Link className="nav-link" to={`${global.links.dtr}${user.id}`}>
                <i className="nav-icon fa fa-arrow-right" />
              </Link>
            </div>
          </div>
        ) : item.type === "announcement" ? (
          <div className="row titleDTR">
            <div className="col-10">
              <h2>
                <i className="nav-icon fa fa-bars nav-icon" />
                <span>{item.title ? item.title : item.description}</span>
              </h2>
            </div>
            <div className="col">
              <Link className="nav-link" to={`${global.links.announcement_page}${item.announcementId}`}>
                <i className="nav-icon fa fa-arrow-right" />
              </Link>
            </div>
          </div>
        ):(
          <h2>
            <i className="nav-icon fa fa-bars nav-icon" />
            <span>{item.title ? item.title : item.description}</span>
          </h2>
        )}
        <div className="notification-item_content">{item.description}</div>
        <small>{item.timestamp}</small>
      </div>
    );
  })
) : (
  <div className="no_notifi">No Notifications Available.</div>
)}

                <div className="showmore_div">
                  {setNumNotificationsToShow < notificaion_list.length && (
                    <Button variant="" onClick={() => this.setState({ setNumNotificationsToShow: setNumNotificationsToShow + 5 })}>
                      Show more
                    </Button>
                  )}
                </div>
              </div> */}
            </Dropdown.Menu>
          </Dropdown>
        ) : "" }
      </li>
    );
  }
}

const mapStateToProps = (state) => ({
  user: state.user,
  notificationCenter: state.dashboard.my_notifications,
  approval: state.dashboard.approval,
  announcement: state.dashboard.announcement,
  celebration: state.dashboard.celebration,
  missingdtr: state.dashboard.missingdtr,
  alldata: state.dashboard.alldata,
  settings: state.settings
});

const mapDispatchToProps = (dispatch) => ({
  getMyNotifications: (id) => dispatch(getMyNotifications(id)),
});

export default connect(mapStateToProps, mapDispatchToProps)(NotificationMenu);
