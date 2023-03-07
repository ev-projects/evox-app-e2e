import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardAnnouncements.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncementList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import Figure from 'react-bootstrap/Figure';
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';

import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card,Tabs,Tab,Badge  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
class DashboardAnnouncements extends Component {

  constructor(props, context) {
    super(props, context);

    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      key: "all"
    };
  }
  componentWillMount(){ 
    this.props.fetchDashboardAnnouncementList( );
	}
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData );
  }
  render() {
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
      if(this.props.departmentAnnouncement.depAnnouncementlist.length !== 0){
        return < >
        {/* <Formik 
      enableReinitialize
      onSubmit={this.onSubmitHandler} 

      // initialValues={this.state.filters}
      >
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
      <form onSubmit={handleSubmit}> */}
          <Tabs
            defaultActiveKey="all"
            id="fill-tab-example"
            className="mb-3 col-9 announcement-tabs"
            fill
            onSelect= { this.handleSelect
            }
          >
              <Tab eventKey="all" title="All">
                
              </Tab>
              <Tab eventKey="department" title="Department">
                
              </Tab>
              <Tab eventKey="hr" title="HR">
                
              </Tab>
              {/* <Tab eventKey="contact" title="Contact" disabled>
                
              </Tab> */}
          </Tabs>
          {/* </form>
          )}
        </Formik> */}
          <Row>
              {this.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {
                return <Col  md={6} className="announcement-list-content dashbaord-content card-content">
                      
                      <Link to={{
                                pathname: global.links.announcement_page + announcement.id
                              }}
                                  title="View Announcement"
                              >
                              
                                
                              
                          {/* <Card className="announcement-list-card"  >
                            {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                             <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                           
                            <Card.Body>
                           
                              <Card.Title> {announcement.title}</Card.Title>
                             
                                  {announcement.headline ? 
                                  
                                  <Card.Text className="black-card-text">{announcement.headline}
                                  
                                  </Card.Text>
                                  
                                  : <Card.Text>Check it out</Card.Text>}
                             
                            </Card.Body>
                          </Card> */}

                          <div  className="announcement-list-item">
                          <Card className="announcement-list-card">
                          {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                             <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                                <Card.ImgOverlay className={"mask-"+announcement.category} >
                                  <Card.Title  className="text-white card-text-white">{announcement.title}</Card.Title>
                                  <Card.Text  className="card-text-white card-text-overflow">
                                  {announcement.headline}
                                  </Card.Text>
                                  
                                </Card.ImgOverlay>
                              
                              </Card>
                              <div className="card-text-black ">
                                <div  className="card-bottom-content"> 
                                <Badge className="tag-badge">{announcement.category}</Badge>
                                <br/>
                                <> Posted on: {announcement.release_date}</> 
                                </div>
                              </div>
                          </div>
                      </Link>

                    
                      </Col>;
              })}
        </Row>
          
      
     </>
      }else{
       return <>
        <Row>
          <Col  md={12} align="center" className="">
              <h5>Your Department has yet to publish any Announcements</h5>
          </Col>
        </Row>
       </>;
      }
      ;
    }

    return <PageLoading/>
  }
}


  
const mapStateToProps = (state) => {
return {
  user : state.user,
  // holiday : state.dashboard
  departmentAnnouncement             : state.departmentAnnouncement,

}
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDashboardAnnouncementList : () => dispatch( fetchDashboardAnnouncementList() ),
    fetchDashboardAnnouncementList : (data) => dispatch( fetchDashboardAnnouncementList(data) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DashboardAnnouncements);








