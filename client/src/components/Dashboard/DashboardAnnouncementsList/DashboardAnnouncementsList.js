import React, { Component } from "react";
import { Redirect, Link } from "react-router-dom";
import "./DashboardAnnouncementsList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../GridComponent/AdminLte.js';
import { fetchDashboardAnnouncementList, clearDepartmentAnnouncementListInstance, incrementDashboardAnnouncementList } from '../../../store/actions/announcement/departmentAnnouncementActions'
import { fetchDepartmentListWithAnnouncements  } from '../../../store/actions/lookup/lookupListActions';

import Figure from 'react-bootstrap/Figure';
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import ShowMore from 'react-show-more-list';
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button,Card,Tabs,Tab,Badge  } from 'react-bootstrap';
import PageLoading from "../../../container/PageLoading/PageLoading";
import { getDashboardOverall } from '../../../store/actions/dashboard/dashboardActions';
class DashboardAnnouncementsList extends Component {

  constructor(props, context) {
    super(props, context);

    this.handleSelect = this.handleSelect.bind(this);

    this.state = {
      key: "all-announcements",
      filters: {
        page: 3,
        dep_id: null,
        // department_id:  this.props.myTeamList?.filters?.department_id,
      },

    };
  }
  componentWillMount  = async() =>{ 
    await this.props.clearDepartmentAnnouncementListInstance();
    // await this.props.fetchDashboardAnnouncementList( );
    // await this.props.fetchDepartmentListWithAnnouncements();
    await this.props.getDashboardOverall(3);
	}

  handleSelectDepartmentAnnouncement = async (event) => {
    var formData = {};
    console.log(event.target)
    formData["dep_id"] = event.target.value;
    // console.log(formData)
    // var formData = {};
    // formData["category"] = values;
    var item_id = event.target.value;
    this.setState(prevState => ({
      filters: {
      
        page:3,
        dep_id:  item_id
      }
    }));
    // this.props.fetchDashboardAnnouncementList(formData );
    this.props.getDashboardOverall(3, formData );

  }
  handleSelect = (values) => {
    var formData = {};
    formData["category"] = values;
    // this.props.fetchDashboardAnnouncementList(formData );
    this.props.getDashboardOverall(3, formData );
  }

  handleIncrement = (values) => {
    var formData = {};
    formData["page"] =this.state.filters.page ;
     formData["dep_id"] =this.state.filters.dep_id ;
    console.log(this.state.filters);
    //  this.props.incrementDashboardAnnouncementList(this.state.filters );
    this.props.getDashboardOverall(3, this.state.filters );
     this.setState(prevState => ({
      filters: {
        ...prevState.filters,
        page: this.state.filters.page + 1
      }
    }));

   
   console.log(this.state.filters);
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
                    this.props.clearDepartmentAnnouncementListInstance()
                    this.handleSelectDepartmentAnnouncement(e);
                  }}
                  style={{ display: 'block' }}
              >
                  <option value="all" label="All" />

                  {/* Manually generate the Option element w/ extra attributes (Pass the Department Handlers as stringified JSON) */}
                  { !this.state.reloadingDepartmentList ? 
                      this.props.department.map((value, index) => {

                          return <option 
                                  value={value.Id} 
                                  >
                                    {value.Name}
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
          <AnnouncementListTable  {...this} />

            
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
    if(props.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded&& props.props.departmentAnnouncement.depAnnouncementlist  instanceof Array){
    console.log(props.props.departmentAnnouncement)
      if(props.props.departmentAnnouncement.depAnnouncementlist.length !== 0){
        showOpen = props.props.departmentAnnouncement.depAnnouncementlist.length > 6 ? true : false
        return < >

          <Row>
              {props.props.departmentAnnouncement.depAnnouncementlist.map((announcement, index) => {

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
{
  !props.props.departmentAnnouncement.hideShowMore ? <><Col  md={12} align="center">
  <Button
      
        onClick={() => {
          props.handleIncrement();
        }}

        className="show-more-dashboard"
      >
        Show More
      </Button> 
   
    </Col></>:<>
    
          <Col  md={12} align="center" className="">
              <h5>No More Announcements to Show</h5>
          </Col>
        
    </>
}


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

  const dateCreated = new Date(announcement.release_date);
  const currentDate = new Date();
  const threeDaysAgo = currentDate.getTime() - 3 * 24 * 60 * 60 * 1000;

  const originalUrl = announcement.thumbnail;
const transformedUrl = originalUrl.replace("public", "https://evox2.eastvantage.com/server/storage");
console.log(transformedUrl);
  return < >
  <div  className="announcement-list-item">
                          <Card className="announcement-list-card">
                          {announcement.thumbnail!=null? <Card.Img variant="top" src={transformedUrl} className="announcement-list-img"/> :
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
                                {/* <Badge className="tag-badge">{announcement.dep.department_name}</Badge> */}
                                <Badge className="tag-badge">{announcement.Department_name}</Badge>
                                {dateCreated.getTime() > threeDaysAgo ? <Badge className="new-badge">NEW ANNOUNCEMENT</Badge> : <></>}
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
    clearDepartmentAnnouncementListInstance : () => dispatch( clearDepartmentAnnouncementListInstance() ),
    fetchDashboardAnnouncementList : () => dispatch( fetchDashboardAnnouncementList() ),
    fetchDashboardAnnouncementList : (data) => dispatch( fetchDashboardAnnouncementList(data) ),
    incrementDashboardAnnouncementList : () => dispatch( incrementDashboardAnnouncementList() ),
    incrementDashboardAnnouncementList : (data) => dispatch( incrementDashboardAnnouncementList(data) ),
    getDashboardOverall: (page_type) =>
      dispatch(getDashboardOverall(page_type)),
    getDashboardOverall: (page_type, $params) =>
      dispatch(getDashboardOverall(page_type, $params)),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DashboardAnnouncementsList);








