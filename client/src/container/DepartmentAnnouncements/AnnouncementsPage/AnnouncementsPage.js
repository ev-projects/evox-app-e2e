import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl, Card,Badge  } from 'react-bootstrap';
import moment from 'moment';

import "./AnnouncementsPage.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";


import { fetchDashboardAnnouncementList, fetchDepartmentAnnouncementStrict ,clearDepartmentAnnouncementListInstance} from '../../../store/actions/announcement/departmentAnnouncementActions';
// import DashboardAnnouncementsSide from "../../../components/Dashboard/DashboardAnnouncementsSide";
import { setRedirect } from '../../../store/actions/redirectActions';


import Wrapper from "../../../components/Template/Wrapper";
// import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
// import Authenticator from "../../../services/Authenticator";
// import BackButton from "../../../components/Template/BackButton";

class AnnouncementsPage extends Component {
  constructor(props){
    super(props)

    this.initialState = {
        content : null,
        thumbnail: null,
        imgPrevInputFile: '/thumbnail/defthumb.jpg'
    }
    this.state = this.initialState; 


  }

 
  componentWillMount= () =>{
    this.props.clearDepartmentAnnouncementListInstance();
      // console.log(this.props.params.id);
    if( this.props.params.id != undefined ) {

      this.props.fetchDepartmentAnnouncementStrict( this.props.params.id )
    }
    this.props.fetchDashboardAnnouncementList( );
}


  render = () => {
    // Sets the Method of the current state.
    const method = (this.props.params.id != undefined) ? 'update' : 'store'
    var today = new Date();
    console.log(today, moment().format('MMMM d, yyyy'));
    console.log(this.props.instance);


    let title = null;

    if( this.props.isInstanceLoaded ){

      return <Wrapper {...this.props} >
          <ContainerWrapper className="Announcement Wrapper">   
          <Row>
                <Col size="9">
                    <Content col="12" title={title} >
                      {/* { this.props.instance?.id}

                      Here */}
                    {this.props.instance.title !== null && this.props.instance.title !== undefined?
                    
                      <>

                      <div  className="announcement-content-page">
                                          
                                          <div >
                                            <div className="page-content-title">{this.props.instance.title}</div>
                                              <div className="page-content-info">Posted: {this.props.instance.release_date}<br/><Badge className="tag-badge">{this.props.instance.category}</Badge></div>
                                              <img src={this.props.instance.thumbnail} className="page-img" alt={null}></img>
                                          <div className="page-content" dangerouslySetInnerHTML={{ __html:   this.props.instance.content}} />
                                        </div>
                                    </div>
                      </>

                      :

                      <h5>The Page you are accessing does seem to be part of your departmnets list of annoucements</h5>
                  
                  }
                    </Content>
                </Col>












                <Col size="3">
                <div className="card-header">
                        <h3 align="Left" className="card-title">Latest Announcements</h3>
                    </div>
                    {this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded? 
                    
                    <Row>
                    {this.props.departmentAnnouncement.depAnnouncementlist?.map((announcement, index) => {
                      return <Col  size={11} className="announcement-list-content card-content">
                            
                   
                                    
                                      
                                   
                          
                          <a href={ global.links.announcement_page + announcement.id}>

                            <Card className="announcement-list-card">
                                  <Card.Body className="small-card-body ">
                                    <Card.Text className="black-card-text-bigger"> {announcement.title}</Card.Text>
                                    <Card.Text> {announcement.release_date} <br/> <Badge className="tag-badge">{announcement.category}</Badge></Card.Text>
                                  </Card.Body>
                                </Card>
                                </a>
                           
                            
        
                          
                            </Col>;
                    })}
              </Row>
                    
                     :<>
                                          {this.props.fetchDashboardAnnouncementList()}
                                          <PageLoading/>
                     </>
                    }
                </Col>
               
                </Row>
                </ContainerWrapper>   
      </Wrapper>
    
    }
    return <PageLoading/>;
  }
}



const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.departmentAnnouncement.instance,
    isInstanceLoaded  : state.departmentAnnouncement.isInstanceLoaded,
		user			        : state.user,
    departmentAnnouncement             : state.departmentAnnouncement,

    
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchDashboardAnnouncementList : () => dispatch( fetchDashboardAnnouncementList() ),
      clearDepartmentAnnouncementListInstance : () => dispatch( clearDepartmentAnnouncementListInstance() ),
      fetchDepartmentAnnouncementStrict        : ( id ) => dispatch( fetchDepartmentAnnouncementStrict( id ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AnnouncementsPage);








