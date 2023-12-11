import React, { Component,useState  } from "react";
import { Redirect, Link } from "react-router-dom";
import { Modal,Button,Container,Row,Col,Table, Card } from 'react-bootstrap';
import { connect } from 'react-redux';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./AdminAnnouncementsList.css";
import { useFormikContext } from 'formik';
import { fetchDepartmentAnnouncementList, deleteDepartmentAnnouncement , clearDepartmentAnnouncementListInstance} from '../../../store/actions/announcement/departmentAnnouncementActions'
import { fetchDepartmentListWithAnnouncements  } from '../../../store/actions/lookup/lookupListActions';
import Select from "react-select";
import Formatter from '../../../services/Formatter'
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { ContainerHeader,Content,ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";
import { fetchUserList } from '../../../store/actions/lookup/lookupListActions';

class AdminAnnouncementsList extends Component {    
  state = { modal_bool:false, modal_name: '', modal_id : '',index : null }

    
  constructor(props){
    super(props);

    this.initialState = {
      modal_bool:false,
      modal_name: '',
      modal_id : ''
      ,index : null,
        filters: {
          status:         1,
          department_id:  '',
          team_id:        '',
          country_id:        '',
          announcement_title:      '',
          status:  '',
          employee:      '',
          name:           '',
          page:           '',
          order_by:      '',
          url:           'MyTeam'
      },
      disable_others: false
    }
    
    this.state = this.initialState; 
  }

  onSubmitHandler = (props,index) => {
    // this.setState({ modal_bool: !this.state.modal_bool , modal_name: props.name, modal_id : props.id, index : index}) 
    // this.onDeleteHandler(props.id, index);
  }


  onSubmitHandler = (values) => {

    var formData = {};

    for (var key in values) {
      if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            default:
              formData[key] = values[key];
            break;
          }
      } 
  }
  this.props.fetchDepartmentAnnouncementList(formData)
  
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

  componentWillMount = async () => {
    
    await this.props.fetchDepartmentListWithAnnouncements()
    await this.props.clearDepartmentAnnouncementListInstance();
    await this.props.fetchDepartmentAnnouncementList();
    await this.props.fetchUserList('employee', { page: 'all' });
  }
  
  render = () => {
   
  
    var validationSchema = Yup.object().shape({});
    // console.log(this.props.departmentAnnouncement);
    if(this.props.departmentAnnouncement.isDepartmentAnnouncementListLoaded){



      return <Wrapper  {...this.props} >
        <ContainerWrapper>   
          <Content col="12" title="Manage All EVOX Announcements">
          
          <p>All Announcements from Each Department</p>

          <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          validationSchema={validationSchema} 
          initialValues={this.state.filters}>
          {
          ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
         
               
             
  
                <ListFilter {...this} />
               
             
             
                   
            
          </form>
          )}
        
          </Formik>
          
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


const ListFilter = (props) => {
  const { values, handleChange, setFieldValue,handleSubmit } = useFormikContext();
  let country_list = props.props.settings.countries !== undefined ?(props.props.settings.countries): []
  let employee_list = Formatter.array_to_multiselect_array(props.props?.employee, 'full_name', 'id');
  // const { team_list } = props.props.myTeamList;
  console.log(props.state.filters);
  // console.log(props.props.user.departments_handled , props.props);
    return <React.Fragment> <Row className="filters filter-dtr">  
              <Col size="4"> 
                <div className="form-group">
                    <select
                    className="form-control" 
                      name="department_id"
                      value={values.department_id}
                      onChange={(e) => { setFieldValue('department_id', e.target.value);}}
                      style={{ display: 'block' }}
                      // disabled = {values.employee.length > 0}
                      //  disabled = {props.state.disable_others}
                    >
                    <option label="Select Department(Default - ALL)" value=''/>
                    {props.props.department.map(function(item){
                      return <option value={item.id} label={item.department_name} />;
                    })}
                    </select>
                </div>
              </Col> 
              <Col size="4"> 
                <div className="form-group">
                    <select
                    className="form-control" 
                      name="country_id"
                      value={values.country_id}
                      onChange={(e) => { setFieldValue('country_id', e.target.value);}}
                      style={{ display: 'block' }}
                      // disabled = {props.state.filters?.employee != null || props.state.filters?.employee != ''}
                    >
                    <option label="Select Country(Default - Global)" value=''/>
                    {country_list.map(function(item){
                                return <option value={item.country_id} label={item.country_name} />;
                    })}
                    </select>
                </div>
              </Col> 
              <Col size="4"> 
                <div className="form-group">
                    <select
                    className="form-control" 
                      name="status"
                      value={values.status}
                      onChange={(e) => { setFieldValue('status', e.target.value);}}
                      style={{ display: 'block' }}
                    >
                    <option label="Select Status(Default)" value=''/>
                    <option label="Ongoing" value='ongoing'/>
                    <option label="Expired" value='expired'/>
                   
                    </select>
                </div>
              </Col> 
              <Col size="4"> 
                <div className="form-group">
                    <input type="textfield" className="form-control" variant="primary" placeholder="Enter Announcement Title" name="announcement_title" onChange={handleChange} value={values.announcement_title} />
                </div>
              </Col> 
              <Col size="4"> 
                <div className="form-group">
                <Select
                        name="employee"
                        options={employee_list}
                        // value={values.employee}
                        onChange={(e) => {  
                          e != null ? setFieldValue('employee', e.value):setFieldValue('employee', null) ;
                          this.setState({ disable_others:true})
                        
                        }}
                        placeholder = "Select Employee POV"
                        isClearable
                      />
                </div>
              </Col> 
              {/* <Col size="4"> 
                <div className="form-group">
                    <input type="textfield" className="form-control" variant="primary" placeholder="Enter Name" name="name" onChange={handleChange} value={values.name} />
                </div>
              </Col>  */}

              <Col size="2">
              <Row className="sortby">
                <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12"> 
                  <label>Sort</label>
                  <div className="form-group">
                      <select
                      className="form-control" 
                        name="order_by"
                        value={values.order_by}
                        onChange={(e) => { setFieldValue('order_by', e.target.value);   handleSubmit();}}
                        style={{ display: 'block' }}
                      >
                      <option label="Created: Latest(Default)" />
                      <option value="created_at:desc" label="Created: Oldest" />
                      <option value="announcement_title:asc" label="Title: Ascending" />
                      <option value="announcement_title:desc" label="Title: Descending" />
                      
                      </select>
                  </div>

                </div> 
                </Row>
              </Col>
              
            </Row>
              <Col size="2"> 
                
                  <Button variant="primary" type="submit" onClick={() => setFieldValue("page", 1)}>
                    <i className="fa fa-filter" /> Filter
                  </Button>
              
              </Col> 
         
            {/* <Row className="sortby">
            
              
            </Row> */}
            </React.Fragment>;
}

const mapStateToProps = (state) => {

      return {
        departmentAnnouncement             : state.departmentAnnouncement,
        settings                           : state.settings,
        department                         : state.lookup.department,
        employee: state.lookup.employee,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {

      fetchUserList: (role, params) => dispatch(fetchUserList(role, params)),
      fetchDepartmentListWithAnnouncements               : () => dispatch( fetchDepartmentListWithAnnouncements() ),
      clearDepartmentAnnouncementListInstance : () => dispatch( clearDepartmentAnnouncementListInstance() ),
      fetchDepartmentAnnouncementList : () => dispatch( fetchDepartmentAnnouncementList() ),
      fetchDepartmentAnnouncementList : (params) => dispatch( fetchDepartmentAnnouncementList(params) ),
      deleteDepartmentAnnouncement : (id) => dispatch( deleteDepartmentAnnouncement(id) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(AdminAnnouncementsList);
