import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardAnnouncments.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDepartmentAnnouncmentList, deleteDepartment } from '../../../store/actions/announcement/departmentAnnouncementActions'
import Figure from 'react-bootstrap/Figure';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
class DashboardAnnouncments extends Component {

  componentWillMount(){ 
    this.props.fetchDepartmentAnnouncmentList( );
	}

  render() {
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
      return < >
        
          
        
         <Row>
              {this.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {
                return <Col  md={6} className="announcement-list-content card-content">
                      
                      <Link to={{
                                pathname: global.links.announcement_page + announcement.id
                              }}
                                  title="View Announcement"
                              >
                              
                                
                             
                          <Card className="announcement-list-card"  >
                            <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/>
                            <Card.Body>
                              <Card.Title> {announcement.title}</Card.Title>
                              <Card.Text>
                              Headline: {announcement.headline}
                              </Card.Text>
                            </Card.Body>
                          </Card>
                      </Link>

                    
                      </Col>;
              })}
        </Row>
          
       
      </>;
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
    fetchDepartmentAnnouncmentList : () => dispatch( fetchDepartmentAnnouncmentList() ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DashboardAnnouncments);








