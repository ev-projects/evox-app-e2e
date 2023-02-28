import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardAnnouncments.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncmentList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import Figure from 'react-bootstrap/Figure';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
class DashboardAnnouncments extends Component {

  componentWillMount(){ 
    this.props.fetchDashboardAnnouncmentList( );
	}

  render() {
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
      if(this.props.departmentAnnouncement.depAnnouncementlist.length !== 0){
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
                            {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                             <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                           
                            <Card.Body>
                              {/* ImgOverlay */}
                              <Card.Title> {announcement.title}</Card.Title>
                             
                                  {announcement.headline ? 
                                  
                                  <Card.Text className="black-card-text">{announcement.headline}
                                  
                                  </Card.Text>
                                  
                                  : <Card.Text>Check it out</Card.Text>}
                             
                            </Card.Body>
                          </Card>
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
    fetchDashboardAnnouncmentList : () => dispatch( fetchDashboardAnnouncmentList() ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DashboardAnnouncments);








