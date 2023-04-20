import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Row,Col,Table, Card } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./DepartmentAnnouncementsList.css";

import { fetchMyHandleAnnouncementList, deleteDepartmentAnnouncement } from '../../../store/actions/announcement/departmentAnnouncementActions'


import Formatter from '../../../services/Formatter'

import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";

class DepartmentAnnouncementsList extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

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
    this.props.fetchMyHandleAnnouncementList();
  }
  
  render = () => {
    console.log(this.props.departmentAnnouncement);
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
      return <Wrapper  {...this.props} >
        <ContainerWrapper>   
          <Content col="12" title="Manage my Departments Announcements">
            <div className="announcement-all-desc"> 
              <p>In the Announcement Management page, you can publish <u>Announcements</u> and this can only be seen by users of the same dapartments as you. 
              Users with the same permission as you can also edit your post if you have your hands are full. </p>
              <p>Note: the Editor will not save images, but for now, you can upload one image as a thmbnail and primary image of your announcement, you can also leave it empty. </p>
            </div>
          <Link className="btn btn-primary create-announcement"  to={global.links.department_announcement_form}>
                       
                       Create Announcement
           </Link>  
        
         <Row>
              {this.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {
                return <Col  md={6} className="announcement-list-content">

                          <Card className="announcement-list-card"  >
                          {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                             <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                            <Card.Body>
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
                                    <Button variant="primary">Edit</Button>
                                    
                                  </Link>



                                  <Link to={{
                                      pathname: global.links.announcement_page + announcement.id
                                  }}
                                      title="Visit Announcement"
                                  >
                                    <Button variant="primary">Visit Page</Button>
                                    
                                  </Link>


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
      fetchMyHandleAnnouncementList : () => dispatch( fetchMyHandleAnnouncementList() ),
      deleteDepartmentAnnouncement : (id) => dispatch( deleteDepartmentAnnouncement(id) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(DepartmentAnnouncementsList);
