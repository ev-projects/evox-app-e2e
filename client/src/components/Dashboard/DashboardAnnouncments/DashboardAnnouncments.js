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








