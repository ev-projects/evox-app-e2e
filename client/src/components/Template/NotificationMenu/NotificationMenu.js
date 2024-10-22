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
      selectedTag: 'request',
      notificaion_list: [],
      dropdownOpen: false,
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
          celebrations: isCelebration ? "It's ":"",
          imagebase64: isCelebration ? "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" : ""
          // imagebase64: isCelebration ? "" : ""
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
   
  };

  handleLinkClick = () => {
    this.setState({ dropdownOpen: false }); // Close dropdown on link click
  };

  toggleDropdown = (isOpen) => {
    this.setState({ dropdownOpen: isOpen });
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
    const { setNumNotificationsToShow, selectedTag, notificaion_list, dropdownOpen  } = this.state;
    const { alldata, approval, announcement, celebration, missingdtr,user } = this.props; // Use props directly instead of state
    console.log(alldata);
    return (
      <li className="nav-item">
        {alldata > 0 ? (
          <Dropdown className="nav-notification-bell-dropdown notificationnn"
          show={dropdownOpen}
          onToggle={this.toggleDropdown}>
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
                {/* <Tab eventKey="all" title="All Notification" /> */}
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
        imglink = item.imagebase64 ? "data:image/jpeg;base64, "+item.imagebase64 : "/images/default-user-image.png"; // Handle the default case if needed
    }
    return ( // Return the JSX here
      <div key={item.id} className="notification unread" id="notification">

      <img src={imglink} alt="Mark Webber"></img>
        {item.type === "DTR" ? (
          <div className="row row-item">
          <div className="col-lg-8 pt-1 pb-1 not">
          <p class="utitle"> {item.description} </p>
          </div>
          <div className="col-lg-2 " >
          <Link className="not utitle link-line" to={`${link}${item.requestID}`} onClick={this.handleLinkClick}>
          <i className="fa fa-arrow-right fa-sm" aria-hidden="true" style={{"padding": "1em 1em 1em 7em","font-size": "12px"}}></i>
          </Link>
          </div>
          </div> 
        ) : item.type === "missedDTR" ? (
          <div className="row row-item">
            <div className="col-lg-8 pt-1 pb-1 not">
         
          <p class=" utitle"> {item.title} </p>
        
          </div>
          <div className="col-lg-2 " >
             <Link className="not utitle link-line" to={{
            pathname: global.links.base +'request/AlterLog/',
            date: '2024-10-08',
            current_time_in: '2024-10-08 09:00:00',
            current_time_out: '2024-10-08 18:00:00'
          }} onClick={this.handleLinkClick}>
          <i className="fa fa-arrow-right fa-sm" aria-hidden="true" style={{"padding": "1em 1em 1em 7em","font-size": "12px"}}></i>
          </Link>
          </div>
          </div>  
        ) : item.type === "announcement" ? (
          <div className="row row-item">
            <div className="col-lg-8 pt-1 pb-1 not">
            <p class="utitle"> {item.description} </p>
         
          </div>
          <div className="col-lg-2 " >
          <Link className="not utitle link-line" to={`${global.links.announcement_page}${item.announcementId}`} onClick={this.handleLinkClick}>
          <i className="fa fa-arrow-right fa-sm" aria-hidden="true" style={{"padding": "1em 1em 1em 7em","font-size": "12px"}}></i>
          </Link>
          </div>
          </div>
        ):(
          <div class="not">
          <p class="utitle"> 
            It's {item.description} <span class="st dark"></span></p>
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
