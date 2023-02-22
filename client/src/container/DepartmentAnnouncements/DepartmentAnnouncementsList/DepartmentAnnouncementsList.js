import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Row,Col,Table, Card } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./DepartmentAnnouncementsList.css";

import { fetchDashboardAnnouncmentList, deleteDepartmentAnnouncment } from '../../../store/actions/announcement/departmentAnnouncementActions'


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
    if (window.confirm("Are you sure you want to Remove this Department ?")) {

      this.props.deleteDepartmentAnnouncment(announcement.id);
      this.props.departmentAnnouncement.depAnnouncementlist.splice(index, 1);
      this.toggleModal();
    }
  }

  toggleModal = () => {
    this.setState({ modal_bool: !this.state.modal_bool });
  }

  componentWillMount(){
    this.props.fetchDashboardAnnouncmentList();
  }
  
  render = () => {
    console.log(this.props.departmentAnnouncement);
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
      return <Wrapper  {...this.props} >
        <ContainerWrapper>   
          <Content col="12" title="Manage my Departments Announcements">
            <p>In the Announcement Management page, you can publish <u>Announcements</u> and this can only be seen by users of the same dapartments as you. 
            Users with the same permission as you can also edit your post if you have your hands are full. </p>
            <p>Note: the Editor will not save images, but for now, you can upload one image as a thmbnail and primary image of your announcement, you can also leave it empty </p>
          <Link className="btn btn-primary create-announcement"  to={global.links.department_announcement_form}>
                       
                       Create Announcement
           </Link>  
        
         <Row>
              {this.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {
                return <Col  md={6} className="announcement-list-content">
                          {/* <td>{index + 1}</td>  */}
                          {/* <td>{announcement.id + 1}</td> 
                          <td>{announcement.department_name}</td> 
                          <td>

                                <Button variant="danger" style={{'padding': '10px 15px'}} onClick={ () => this.onDeleteHandler(announcement, index)} > 
                                  <i class="fa fa-trash"></i> Soft Delete 
                                </Button> 
                          </td> */}

                          <Card className="announcement-list-card"  >
                            <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/>
                            <Card.Body>
                              <Card.Title> {announcement.title}</Card.Title>
                              <Card.Text>
                              Headline: {announcement.headline}
                              </Card.Text>
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
      fetchDashboardAnnouncmentList : () => dispatch( fetchDashboardAnnouncmentList() ),
      deleteDepartmentAnnouncment : (id) => dispatch( deleteDepartmentAnnouncment(id) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(DepartmentAnnouncementsList);
