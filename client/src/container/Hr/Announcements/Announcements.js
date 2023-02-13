import React, { Component } from "react";
import "./Announcements.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { fetchHrAnnouncements, deleteHrAnnouncement } from '../../../store/actions/hr/hrAnnouncementsActions';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import Wrapper from "../../../components/Template/Wrapper";
import { Link } from "react-router-dom";
import moment from 'moment';
import { setRedirect } from '../../../store/actions/redirectActions';

class Announcements extends Component {

  constructor(props) {
    super(props);
    this.initialState = {
      hrAnnouncementsInfo: {},
      isShowModel: false
    };

    this.state = this.initialState;  
  }
    
  componentWillMount(){ 
    // get list of announcements
    this.props.fetchHrAnnouncements();
  }

  deleteItem = async( id ) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      await this.props.deleteHrAnnouncement( id );
    }
  }

  render() {
    const hrAnnouncements = this.props.hrAnnouncement;

    return <Wrapper  {...this.props} >
      { hrAnnouncements?.length > 0  ? 
          <ContainerWrapper>
              <ContainerBody>
                <div className="hrAnnouncement-content">
                  <Row>  
                    <Content col="8" title="HR Announcement List" 
                      subtitle={<Link className="btn btn-primary addBtnHr" title="Post Announcement" to={{ pathname: global.links.base +'hr/PostHrAnnouncements/' }} ><i class="fa fa-plus" /> ADD</Link>} >
                        <Col size="8"> 
                        
                        <Table className="responsive hover dtr-table">
                          <thead>
                            <tr>
                                <th className="dtr-status">Title</th>
                                <th className="dtr-log">Date Posted</th>
                                <th className="dtr-log">Posted By</th>
                                <th className="dtr-actions"><i></i></th>
                            </tr>
                          </thead>
                          
                          <tbody>
                            {hrAnnouncements.map((hrAnn, index) => {
                              return (
                              <tr className={"center"}>
                                <td className="dtr-status">{hrAnn.title}</td>
                                <td className="dtr-log"><div>{moment(hrAnn.log_date).format('MMMM D, YYYY')}</div></td>
                                <td className="dtr-log"><div>{hrAnn.user.first_name} {hrAnn.user.last_name}</div></td>
                                <td className="dtr-log">
                                  <Button type="button" className="btn btn-primary" onClick={() => { this.props.setRedirect( '/app/hr/PostHrAnnouncements/' + hrAnn.id ) }} >Edit</Button> &nbsp;
                                  <Button type="button" className="btn btn-danger" onClick={() => { this.deleteItem( hrAnn.id ) }} >Delete</Button>
                                </td>
                              </tr>)
                            })}
                          </tbody>
                        </Table>
                        </Col> 
                    </Content>
                  </Row> 
                </div>
            </ContainerBody>
        </ContainerWrapper>
        :
        <div>No announcements to be displayed</div>
      } 
        </Wrapper>
    // }
    //   return <PageLoading/>;
    }
}


  
const mapStateToProps = (state) => {
  return {
    user : state.user,
    hrAnnouncement : state.hrAnnouncement.listInstance,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchHrAnnouncements  : ( ) => dispatch( fetchHrAnnouncements( ) ),
    deleteHrAnnouncement  : ( id ) => dispatch( deleteHrAnnouncement( id ) ),
    setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Announcements);








