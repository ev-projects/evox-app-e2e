import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Row,Col,Table, Card } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./AdminAnnouncementsList.css";

import { fetchDepartmentAnnouncementList, deleteDepartmentAnnouncement , clearDepartmentAnnouncementListInstance} from '../../../store/actions/announcement/departmentAnnouncementActions'


import Formatter from '../../../services/Formatter'

import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";

class AdminAnnouncementsList extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

  onSubmitHandler = (props,index) => {
    // this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
    // this.onDeleteHandler(props.id, index);
  }

  onDeleteHandler = (announcement, index) => {
    if (window.confirm("Are you sure you want to Remove this Department ?")) {

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
    this.props.fetchDepartmentAnnouncementList();
  }
  
  render = () => {
    // console.log(this.props.departmentAnnouncement);
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){



      return <Wrapper  {...this.props} >
        <ContainerWrapper>   
          <Content col="12" title="Manage All EVOX Announcements">
          
          <p>All Announcements from Each Department</p>
        
         <Row>
              {this.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {
                return <Col  md={4} className="announcement-list-content">
          
                          <Card className="announcement-list-card on-manager"  >
                          {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                             <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                            <Card.Body className="ann-details">
                            {  announcement.is_expired?<div className="expired">expired</div>: <div className="ongoing">ongoing</div>}
                              <Card.Title> {announcement.title}</Card.Title>
                              <Card.Text>
                                Details:
                                <br/>
                               
                                <ul className="punch-bullet-2">
                                  <li>Created by: {announcement.creator.full_name}</li>
                                  <li>Created at: {announcement.created_at} UTC</li>
                                  <li>Release/Expiry Date:  {announcement.release_date} / {announcement.expiry_date}</li>
                                  <li>Country: {announcement.set_country_all == 1? "Global": announcement.country_id != null? (this.props.settings.countries.filter((e) => e.country_id == announcement.country_id))[0]?.country_name: "UNDEFINED"} </li>
                                  <li>Departments:  {announcement.set_all == 1? "ALL":announcement.selectedDepartments.length + " Departments Posted"}</li>
                                  {/* <li>Expir Date:  {announcement.release_date}</li> */}
                                </ul>
                                    {/* {announcement.headline ? 
                                        
                                        <Card.Text className="black-card-text">{announcement.headline}
                                        
                                        </Card.Text>
                                        
                                        : <Card.Text></Card.Text>} */}
                              </Card.Text>
                              <div className="manage-announcement-option ann-admin">
                                  <Link to={{
                                    pathname: global.links.department_announcement_form + announcement.id
                                  }}
                                      title="Edit Announcement"
                                  >
                                    <Button variant="primary">Edit</Button>
                                    
                                  </Link>





                                  {announcement.on_link == 1 ? 
                    
                                  <a  href={  announcement.link.startsWith("http://") || announcement.link.startsWith("https://") ?
                                              announcement.link
                                              : `http://${announcement.link}`}  target="_blank">
                                    <Button variant="secondary">Link</Button>
                                  </a>

                                  :  
                                  
                                  <Link to={{
                                            pathname: global.links.announcement_page + announcement.id
                                            }}
                                                title="View Announcement" 
                                            >

                                          <Button variant="primary">Page</Button>
                                    </Link>
                                    
                                  }

                                  {/* <Link to={{
                                      pathname: global.links.announcement_page + announcement.id
                                  }}
                                      title="Visit Announcement"
                                  >
                                    <Button variant="primary">Visit Page</Button>
                                    
                                  </Link> */}


                                  <Button variant="danger" style={{'padding': '10px 15px'}} onClick={ () => this.onDeleteHandler(announcement, index)} > 
                                      <i class="fa fa-trash"></i>
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
        settings                           : state.settings,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      clearDepartmentAnnouncementListInstance : () => dispatch( clearDepartmentAnnouncementListInstance() ),
      fetchDepartmentAnnouncementList : () => dispatch( fetchDepartmentAnnouncementList() ),
      deleteDepartmentAnnouncement : (id) => dispatch( deleteDepartmentAnnouncement(id) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(AdminAnnouncementsList);
