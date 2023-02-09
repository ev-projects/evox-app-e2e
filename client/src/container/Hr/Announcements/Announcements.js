import React, { Component } from "react";
import "./Announcements.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { fetchHrAnnouncements } from '../../../store/actions/hr/hrAnnouncementsActions';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
import Wrapper from "../../../components/Template/Wrapper";
import { Link } from "react-router-dom"; 

class Announcements extends Component {

  constructor(props) {
    super(props);
    this.initialState = {
      hrAnnouncementsInfo: {},
      isShowModel: false
    };

    this.state = this.initialState;  
    // this.handleShow = this.handleShow.bind(this);
  }
    
  componentWillMount(){ 
    // get list of announcements
    this.props.fetchHrAnnouncements(); 
  }

  // handleShow = (data) => {    
  //   this.setState({
  //     changelogInfo: data,
  //     isShowModel: true
  //   });
  // }

  // handleOnhide = () => {
  //   this.setState({
  //       isShowModel: false
  //   });
  // }

  render() {
    const hrAnnouncements = this.props.hrAnnouncement;

  //   return  <div className="content-table bdr0">
  //     { hrAnnouncements?.length > 0  ? 
  //       <Table>
  //           <tbody>
  //               {hrAnnouncements.map(data =>
  //               <tr className="changelogs-tr" onClick={ () => { this.handleShow(data); }}>
  //                   <td className="log-title"><span className="icn"></span> <span className="date">{data.log_date}</span></td>
  //                   <td className="desc">{data.title ?? '(No title given)'}</td>
  //               </tr>
  //               )}
  //           </tbody>
  //       </Table>
  //       :
  //       <div>No announcements to be displayed</div>
  //     } 
  //     {/* {
  //       this.state.isShowModel &&
  //       <ChangeLogsInfo 
  //         changelogInfo = { this.state.changelogInfo }
  //         showModel = {this.state.isShowModel}
  //         handleModalClose = {() => {this.handleOnhide()}}
  //       />
  //       } */}
  //   </div>;
  // }
    return <Wrapper  {...this.props} >
      { hrAnnouncements?.length > 0  ? 
          <ContainerWrapper>
              <ContainerBody>
                <div className="hrAnnouncement-content">
                  <Row>  
                    <Content col="8" title="HR Announcement List" 
                      subtitle={<Link className="btn btn-primary addBtnHr" title="Alter Log" to={{ pathname: global.links.base +'hr/PostHrAnnouncements/' }} >+ADD</Link>} >
                        <Col size="8"> 
                        
                        <Table className="responsive hover dtr-table">
                          <thead>
                            <tr>
                                <th className="dtr-status">Title</th>
                                {/* <th className="dtr-schedule">Description</th> */}
                                <th className="dtr-log">Date Posted</th>
                                <th className="dtr-log">Posted By</th>
                                {/* <th className="dtr-item">Late</th>
                                <th className="dtr-item">Undertime</th>
                                <th className="dtr-item">NSD</th>
                                <th className="dtr-item">OT</th>
                                <th className="dtr-item">OTND</th>
                                <th className="dtr-requests">Requests STATUS</th> */}
                                <th className="dtr-actions"><i></i></th>
                            </tr>
                          </thead>
                          
                          <tbody>
                            {hrAnnouncements.map((hrAnn, index) => {
                              return (
                              <tr className={"center"}>
                                <td className="dtr-status">{hrAnn.title}</td>
                                <td className="dtr-log"><div>{hrAnn.log_date}</div></td>
                                <td className="dtr-log"><div>{hrAnn.created_by}</div></td>
                                <td className="dtr-actions"></td>
                              </tr>)
                            })}
                          </tbody>
                        </Table>
                        {/* <DataTable
                          data={ this.props?.listInstance != null ? this.props.listInstance: null }
                          columns={columns(this.handleButtonClick)}
                          onSelectedRowsChange={this.handleChange}
                          progressPending={ this.props?.listInstance == null ? true: false }
                          defaultSortField="start_date"
                          defaultSortAsc="true"
                          noHeader="false"
                          fixedHeader="true"
                          loading="true"
                          pagination="true"
                        /> */}
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
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Announcements);








