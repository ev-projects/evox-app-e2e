import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardAnnouncementsList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncementList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import { fetchDepartmentListWithAnnouncements  } from '../../../store/actions/lookup/lookupListActions';

import Figure from 'react-bootstrap/Figure';
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import ShowMore from 'react-show-more-list';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card,Tabs,Tab,Badge  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
class DashboardAnnouncementsList extends Component {

  constructor(props, context) {
    super(props, context);

    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      key: "all-announcements",
      filters: {
        department_id:  this.props.myTeamList?.filters?.department_id,
      },

    };
  }
  componentWillMount  = async() =>{ 
    await this.props.fetchDashboardAnnouncementList( );
    await this.props.fetchDepartmentListWithAnnouncements();
	}

  handleSelectDepartmentAnnouncement = async (event) => {
    var formData = {};
    formData["dep_id"] = event.target.value;
    // console.log(formData)
    // var formData = {};
    // formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData );

  }
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    this.props.fetchDashboardAnnouncementList(formData );
  }
  render= () => {  



        return(


             <>
          <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          // validationSchema={validationSchema} 
          initialValues={this.state.filters}>
          {
          ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
         




          <Row className="">  
            <Col size=""> 
            {
              this.props.department != undefined?   <div className="form-group dashboard-dep-select" >
              <label>Departments Announcement:</label>
              <select
                  name="department_id"
                  className="form-control"
                  value={values.department_id}
                  onChange={(e) => {
                    this.handleSelectDepartmentAnnouncement(e);
                  }}
                  style={{ display: 'block' }}
              >
                  <option value="all" label="All" />

                  {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                  { !this.state.reloadingDepartmentList ? 
                      this.props.department.map((value, index) => {

                          return <option 
                                  value={value.id} 
                                  >
                                    {value.department_name}
                                  </option>;
                      })
                    :
                    null
                  }
              </select>
</div>

: <PageLoading/>
            }
          
              </Col> 
          </Row>
          <AnnouncementListTable  {...this.props} />

            
          </form>
          )}
        
          </Formik>

             </>
                   
           
  
        )
      }
  }


const AnnouncementListTable = (props) => {
  {
    var showOpen = false;
    if(props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){
    console.log(props.departmentAnnouncement.depAnnouncementlist.length > 6)
      if(props.departmentAnnouncement.depAnnouncementlist.length !== 0){
        showOpen = props.departmentAnnouncement.depAnnouncementlist.length > 6 ? true : false
        return < >

          <Row>
              {props.departmentAnnouncement.depAnnouncementlist.slice(0,3).map((announcement, index) => {

              // let default_link  = announcement.on_link == 1 ? announcement.link : default_link
              // console.log(announcement.on_link, announcement.on_link);
                return <Col  md={4} className="announcement-list-content dashbaord-content card-content">
                      
                  {announcement.on_link == 1 ? 
                    
                    <a  href={  announcement.link.startsWith("http://") || announcement.link.startsWith("https://") ?
                                announcement.link
                                : `http://${announcement.link}`}  target="_blank">
                      <AnnouncementItem {...announcement}/>
                    </a>

                    :  
                    
                    <Link to={{
                              pathname: global.links.announcement_page + announcement.id
                              }}
                                  title="View Announcement" 
                              >

                        <AnnouncementItem {...announcement}/>
                      </Link>
                      
                    }

                    
                      </Col>;
              })}

            <ShowMore
                items={props.departmentAnnouncement.depAnnouncementlist.slice(3, props.departmentAnnouncement.depAnnouncementlist.length)}
                by={3}
              >
                {({
                  current,
                  onMore,
                }) => (
                  <React.Fragment>
                   
                      {current.map((announcement, index)=> (
                      <Col  md={4} className="announcement-list-content dashbaord-content card-content">


                             
                  {announcement.on_link == 1 ? 
                    
                    <a  href={  announcement.link.startsWith("http://") || announcement.link.startsWith("https://") ?
                    announcement.link
                    : `http://${announcement.link}`}  target="_blank">
                      <AnnouncementItem {...announcement}/>
                    </a>

                    :  
                    
                    <Link to={{
                              pathname: global.links.announcement_page + announcement.id
                              }}
                                  title="View Announcement" 
                              >

                        <AnnouncementItem {...announcement}/>
                      </Link>
                      
                    }
                    
                      </Col>
                      ))}
                    
                    <Col  md={12} align="center">
                     {props.departmentAnnouncement.depAnnouncementlist.length > 6?  <Button
                        disabled={!onMore}
                        onClick={() => { if (!!onMore) onMore(); }}

                        className="show-more-dashboard"
                      >
                        Show More
                      </Button> 
                    :
                    null  
                    }
                    </Col>
                  </React.Fragment>
                )}
              </ShowMore>
        </Row>
          
      
     </>
      }else{
       return <>
      
       
        <Row>
          <Col  md={12} align="center" className="">
              <h5>No Announcements.</h5>
          </Col>
        </Row>
       </>;
      }
      ;
    }

    return <PageLoading/>
  }
}

const AnnouncementItem = (announcement) => {

  return < >
  <div  className="announcement-list-item">
                          <Card className="announcement-list-card">
                          {announcement.thumbnail!=null? <Card.Img variant="top" src={announcement.thumbnail} className="announcement-list-img"/> :
                            <Card.Img variant="top" src="https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80https://images.unsplash.com/photo-1462396240927-52058a6a84ec?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" className="announcement-list-img"/>
                            }
                                <Card.ImgOverlay className={"mask-"+announcement.category} >
                                  <Card.Title  className="text-white card-text-white">{announcement.title} {announcement.on_link == 1 ? <i className="nav-icon fa fa-link" />:null}</Card.Title>
                                  <Card.Text  className="card-text-white card-text-overflow">
                                  {announcement.headline}
                                  </Card.Text>
                                  
                                </Card.ImgOverlay>
                              
                              </Card>
                              <div className="card-text-black ">
                                <div  className="card-bottom-content"> 
                                <Badge className="tag-badge">{announcement.dep.department_name}</Badge>
                                {/* {console.log(announcement.dep)} */}
                                <br/>
                                <> Posted on: {announcement.release_date}</> 
                                </div>
                              </div>
                          </div>

                          </>
}

  
const mapStateToProps = (state) => {
return {
  user : state.user,
  // holiday : state.dashboard
  departmentAnnouncement             : state.departmentAnnouncement,
  department             : state.lookup.department,

}
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDepartmentListWithAnnouncements               : () => dispatch( fetchDepartmentListWithAnnouncements() ),
    fetchDashboardAnnouncementList : () => dispatch( fetchDashboardAnnouncementList() ),
    fetchDashboardAnnouncementList : (data) => dispatch( fetchDashboardAnnouncementList(data) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DashboardAnnouncementsList);








