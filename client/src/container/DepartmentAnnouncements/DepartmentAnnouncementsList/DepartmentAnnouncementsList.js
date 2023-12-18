import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Row,Col,Table, Card } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./DepartmentAnnouncementsList.css";
import { format, getDate } from "date-fns";
import { fetchMyHandleAnnouncementList, deleteDepartmentAnnouncement , clearDepartmentAnnouncementListInstance} from '../../../store/actions/announcement/departmentAnnouncementActions'
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import Authenticator from "../../../services/Authenticator";
import moment from 'moment';
import Formatter from '../../../services/Formatter'

import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";

class DepartmentAnnouncementsList extends Component {    



  constructor(props){
   

    super(props)

    var joyride_steps =  [
      {
        target: ".dum",
        content: "dum",
      },
        {
          target: ".joyride-announcement-list",
          content: "Here you can see and manage your announcements.",
        },
        {
          target: ".joyride-announcement-create",
          content: "Try making an Announcement.",
        },
      
        
      ]


      var pre_run = true;
      if(localStorage.getItem("joyride-local-announcement-list") != null && localStorage.getItem("joyride-local-announcement-list") != undefined){
        var stored_local_session = JSON.parse(localStorage.getItem("joyride-local-announcement-list"));
      
        let date1 = new Date().getTime();
        let date2 = new Date(stored_local_session.local_expiration).getTime();
        
        console.log(date1 < date2, stored_local_session.step, joyride_steps.length-1);
        if(date1 < date2 && stored_local_session.step == joyride_steps.length-1){
         pre_run= false;
        }
        
      }

    this.state = { 
      modal_bool:false, 
      modal_name: '', 
      modal_id : '',
      index : null,
      run: pre_run,
      steps: joyride_steps,
      stepIndex: 0,
      spotlightClicks: false,
    
    }
  }
 
  handleJoyrideCallback = (data) => {
    const { dispatch } = this.props;
    const { action, index, status, type } = data;
    console.log(index)
    this.setState({ stepIndex: index });
    if (index === 1) {
      // this.setState({ run: false });
    }
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Need to set our running state to false, so we can restart if we click start again.
      this.setState({ run: false });
      dispatch({
        type: "WORK_TOUR",
        worktour: false,
      });
      // if(status === "finished"){
      //   localStorage.setItem('user', JSON.stringify(this.props.user?.id));
      // }
    }
    if ([ACTIONS.CLOSE].includes(action)) {
      this.setState({ run: false });
      dispatch({
        type: "WORK_TOUR",
        worktour: false,
      });
    }
    if (index === 2) {
      var set_local = JSON.stringify({local_expiration: moment().add(6, 'M').format("YYYY-MM-DD"), step: index});
      localStorage.setItem("joyride-local-announcement-list", set_local);
      console.log(localStorage.getItem("joyride-local-announcement-list"));
    }

  };

  onSubmitHandler = (props,index) => {
    // this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
    // this.onDeleteHandler(props.id, index);
  }

  onDeleteHandler = (announcement, index) => {
    if (window.confirm("Are you sure you want to Remove this Anoouncement ?")) {

      this.props.deleteDepartmentAnnouncement(announcement.id);
      this.props.departmentAnnouncement.depAnnouncementlist.splice(index, 1);
      this.toggleModal();
    }
  }

  toggleModal = () => {
    this.setState({ modal_bool: !this.state.modal_bool });
  }

  componentWillMount(){
    this.props.clearDepartmentAnnouncementListInstance();
    this.props.fetchMyHandleAnnouncementList();
  }
  componentDidMount() {
    // alert(this.props.dashboard?.worktour);
    // this.setState({ run: true });

    // var exdate = Date.parse("2023-05-31");
    // var expiredate = format(exdate, "yyyy-MM-dd");
    // const current = new Date();
    // const date = current.getFullYear() + '-' + (current.getMonth() + 1) + '-' + current.getDate();
    // var cudate = Date.parse(date);
    // var currentdate = format(cudate, "yyyy-MM-dd");
    // // alert ("CurrentDate: "+ currentdate + "ExpDate: "+expiredate )
    // if (expiredate >= currentdate) this.setState({ run: this.props.dashboard?.worktour });
  } 
  render = () => {
    const { run, steps, stepIndex } = this.state;
    console.log(this.props.departmentAnnouncement);
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
      return <Wrapper  {...this.props} >
       
        <Joyride
          callback={this.handleJoyrideCallback}
          run={run}
          steps={steps}
          continuous={true}
          hideBackButton={stepIndex === 1 ? true : false}
          locale={{ skip: "Skip" }}
          showSkipButton={true}
          disableScrolling={true}
          styles={{
            options: {
              arrowColor: "#fff",
              backgroundColor: "#fff",
              primaryColor: "#0097A7",
              textColor: "#000",
              width: 400,
              zIndex: 1000,
            },
          }}
          // disableBeacon={true}
        />
        <ContainerWrapper>   
          <Content col="12" title="Manage my Departments Announcements">
            <div className="announcement-all-desc"> 
              <p>In the Announcement Management page, you can publish <u>Announcements</u> and this can only be seen by users of the same dapartments as you. 
              Users with the same permission as you can also edit your post if you have your hands are full. </p>
              <p>Note: the Editor will not save images, but for now, you can upload one image as a thmbnail and primary image of your announcement, you can also leave it empty. </p>
            </div>
          {/* <Link className="btn btn-primary create-announcement"  to={global.links.department_announcement_form}>
                       
                       Create Announcement
           </Link>   */}
        
         <Row className=" joyride-announcement-list">

         <Col  md={3} className="announcement-list-content">
         <Link  to={global.links.department_announcement_form}>
                    <div className="announcement-list-card create-announcement-card joyride-announcement-create"  >
                    <i class="fa fa-plus i-create-ann"></i>
                      <h3>Create Announcement</h3>
                      </div>
                      </Link>  
                    </Col>


              {this.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {
                return <Col  md={3} className="announcement-list-content">

                          <Card className="announcement-list-card"  >
                          {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                             <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                            <Card.Body>
                              {  announcement.is_expired?<div className="expired">expired</div>: <div className="ongoing">ongoing</div>}
                              <Card.Title> {announcement.title}</Card.Title>
                                    {announcement.headline ? 
                                        
                                        <Card.Text className="black-card-text">{announcement.headline}
                                        
                                        </Card.Text>
                                        
                                        : <Card.Text>Check it out</Card.Text>}
                              <div className="manage-announcement-option">
                                  <Link to={{
                                    pathname: global.links.department_announcement_form + announcement.id
                                  }}
                                      title="Edit Announcement"
                                  >
                                    <Button  className="btn btn-primary-2">Edit</Button>
                                    
                                  </Link>



                                  {/* <Link to={{
                                      pathname: global.links.announcement_page + announcement.id
                                  }}
                                      title="Visit Announcement"
                                  >
                                    <Button  className="btn btn-primary-2">Visit Page</Button>
                                    
                                  </Link> */}

                                  {announcement.on_link == 1 ? 
                    
                                      <a  href={  announcement.link.startsWith("http://") || announcement.link.startsWith("https://") ?
                                                  announcement.link
                                                  : `http://${announcement.link}`}  target="_blank">
                                        <Button  className="btn btn-primary-2">Visit Link <i className="nav-icon fa fa-link is-green" /></Button>
                                      </a>

                                      :  
                                      
                                      <Link to={{
                                        pathname: global.links.announcement_page + announcement.id
                                    }}
                                        title="Visit Announcement"
                                    >
                                      <Button  className="btn btn-primary-2">Visit Page  <i className="nav-icon fa fa-newspaper-o is-green" /></Button>
                                      
                                    </Link>
                                        
                                      }

                                  <Button variant="danger" style={{'padding': '10px 15px'}} onClick={ () => this.onDeleteHandler(announcement, index)} > 
                                      <i class="fa fa-trash"></i> Delete 
                                    </Button> 
                              </div>

                                
                            </Card.Body>
                          </Card>
                      </Col>;
              })}
        </Row>
          </Content>
        </ContainerWrapper>
        {/* </Joyride> */}
      </Wrapper>;
    }

    return <PageLoading/>
  }
}

const mapStateToProps = (state) => {

      return {
        departmentAnnouncement             : state.departmentAnnouncement,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      clearDepartmentAnnouncementListInstance : () => dispatch( clearDepartmentAnnouncementListInstance() ),
      fetchMyHandleAnnouncementList : () => dispatch( fetchMyHandleAnnouncementList() ),
      deleteDepartmentAnnouncement : (id) => dispatch( deleteDepartmentAnnouncement(id) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(DepartmentAnnouncementsList);
