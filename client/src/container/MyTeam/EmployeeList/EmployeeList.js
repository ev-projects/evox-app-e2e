import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import { useFormikContext } from 'formik';
import Select from "react-select";

import "./EmployeeList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Paginate from '../../../components/Template/Paginate'
import Wrapper from "../../../components/Template/Wrapper";

import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchMyTeamList, fetchTeamUnderDepartment } from '../../../store/actions/filters/myTeamActions';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";

class EmployeeList extends Component {

  
    constructor(props){
      super(props);

      this.initialState = {
          filters: {
            status:         1,
            department_id:  this.props.myTeamList?.filters?.department_id,
            team_id:        this.props.myTeamList?.filters?.team_id,
            job_title:      this.props.myTeamList?.filters?.job_title,
            name:           this.props.myTeamList?.filters?.name,
            page:           this.props.myTeamList?.filters?.page,
            order_by:       this.props.myTeamList?.filters?.order_by,
            url:           'MyTeam'
        }
      }
      
      this.state = this.initialState; 
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
  this.props.fetchMyTeamList( this.props.user.id, formData );
  
  }

  componentWillMount(){
    // Fetch the my Team List upon mounting of the component if the My Team List is not yet initially loaded.
    if( ! Validator.isValid( this.props.myTeamList.list ) ) {
      this.props.fetchMyTeamList( this.props.user.id, this.state.filters);
    }

  }


  departmentSelected = (departmentId) => {
    if( departmentId != '' ) {
      this.props.fetchTeamUnderDepartment(this.props.user.id, departmentId);
    }
  }
  
  render = () => {  

    var total = [];
    var validationSchema = Yup.object().shape({});

        return(<Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler} 
          validationSchema={validationSchema} 
          initialValues={this.state.filters}>
          {
          ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
          <form onSubmit={handleSubmit}>
          <Wrapper {...this.props} >
                <ContainerWrapper>   
                <ContainerBody>
                <h2 className="page-title"> Employee list</h2>
                <MyTeamListFilter {...this} />
                <div className="content-table">
                 <MyTeamListTable  {...this.props} />
                </div>
                   
                </ContainerBody>  
                </ContainerWrapper>
              </Wrapper>
          </form>
          )}
        
          </Formik>);
      }
  }

const MyTeamListFilter = (props) => {
  const { values, handleChange, setFieldValue,handleSubmit } = useFormikContext();
  const { team_list } = props.props.myTeamList;

    return <React.Fragment> <Row className="filters filter-dtr">  
              <Col size="2"> 
                <div className="form-group">
                    <select
                    className="form-control" 
                      name="department_id"
                      value={values.department_id}
                      onChange={(e) => { setFieldValue('department_id', e.target.value);  setFieldValue('team_id', '');  props.departmentSelected(e.target.value)}}
                      style={{ display: 'block' }}
                    >
                    <option label="Select Department" value=''/>
                    {props.props.user.departments_handled.map(function(item){
                      return <option value={item.id} label={item.department_name} />;
                    })}
                    </select>
                </div>
              </Col> 
              <Col size="4">
                    <select
                    className="form-control"
                      name="status"
                      value={values.status}
                      onChange={handleChange}
                    >
                      <option label="Select Status..." />
                      <option value="1" label="Active" />
                      <option value="0" label="Inactive" />
                    </select>
              </Col>
              <Col size="2"> 
                <div className="form-group">
                    <select
                    className="form-control" 
                      name="team_id"
                      value={values.team_id}
                      onChange={handleChange}
                      style={{ display: 'block' }}
                    >
                    <option label="Select Team" />
                    {team_list.map(function(item){
                      return <option value={item.id} label={item.name} />;
                    })}
                    </select>
                </div>

              </Col> 
              <Col size="2"> 
                <div className="form-group">
                    <input type="textfield" className="form-control" variant="primary" placeholder="Enter Job Title" name="job_title" onChange={handleChange} value={values.job_title} />
                </div>
              </Col> 
              <Col size="2"> 
                <div className="form-group">
                    <input type="textfield" className="form-control" variant="primary" placeholder="Enter Name" name="name" onChange={handleChange} value={values.name} />
                </div>
              </Col> 
              <Col size="2"> 
                
                  <Button variant="primary" type="submit" onClick={() => setFieldValue("page", 1)}>
                    <i className="fa fa-filter" /> Filter
                  </Button>
              
              </Col> 
            </Row>
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
                    <option label="Default" />
                    <option value="name:asc"  label="Name: A-Z" />
                    <option value="name:desc" label="Name: Z-A" />
                    <option value="job_title:asc" label="Job Title: Ascending" />
                    <option value="job_title:desc" label="Job Title: Descending" />
                    </select>
                </div>

              </div> 
            </Row>
            </React.Fragment>;
}

const MyTeamListTable = (props) => {
  
  const { values, handleChange, setFieldValue } = useFormikContext();

  var pagination = [];
  var list = [];

  // If there's a loaded myTeam props, Generate the Pagination component.
  if( props.myTeamList.list != null && props.myTeamList.list.data.length > 0 ){
    
      list = props.myTeamList.list;

  }


  // If there's a loaded myTeam props already, then proceed on rendering for the Page.
  return ( props.myTeamList.list != null && props.myTeamList.list.data.length > 0   ? 
          <div>
            Record Displayed: { props.myTeamList.list != null && props.myTeamList.list.data.length > 0  ? props.myTeamList.list.pagination.total : 0 }
            <Table striped bordered hover>
              <thead>
                <tr>
                <th>Emp #</th>
                  <th>Name</th>
                  <th>Job Title</th> 
                  <th>Department</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                { list.data.map((user) => {
                    return <tr>
                    <td>{user.emp_num}</td>
                    <td>{user.full_name}</td>
                    <td>{user.job_title} </td>
                    <td>{user.department} </td>
                    <td>{user.email} </td>
                    <td className="actions">
  
                      
                      &nbsp;&nbsp;&nbsp;
                      { !Authenticator.checkRole('client') ? 
                        <span>
                          { Authenticator.check('supervisor', 'view_employee_dtr') &&
                            <Link to={{
                                pathname: global.links.dtr + user.id,
                                resetInitialState: true
                              }}
                                title="View DTR"
                            >
                              <i className="fa fa-clock-o ev-color" aria-hidden="true"></i>
                            </Link>
                          }
                          &nbsp;&nbsp;
                          { Authenticator.check('supervisor', 'manage_schedule') &&
                            <Link to={{
                                    pathname: global.links.schedule_assign_user + user.id
                                  }}
                                title="View Schedule"
                            >
                              <i className="fa fa-calendar-o ev-color" aria-hidden="true"></i>
                            </Link>
                          }
                          &nbsp;&nbsp;
                        </span>
                        : 
                        null
                      }
                      { Authenticator.check('supervisor', ['view_employee_personal_info','view_employee_job_info','view_employee_time_off']) &&
                        <Link to={{
                                pathname: global.links.profile + user.id
                              }}
                            title="View Profile"
                        >
                          <i className="fa fa-info ev-color" aria-hidden="true"></i>
                        </Link>
                      }
                    </td>
                  </tr>         
                })}
              </tbody>
            </Table>
            <Paginate pagination={props.myTeamList.list.pagination} />
        </div>
        :
       <div className="pd20">Sorry, no record found</div>
      )
}

// Component for the Status Badge
const Status = (props) => {
    let status = [];
    switch( props.status ) { 
      case 1:
          status.push( <Badge variant="success">Active</Badge>);
          break;
      case 0:
          status.push(<Badge variant="danger">Inactive</Badge>);
          break;
   }
    return status;
}



  const mapStateToProps = (state) => {
    return {
      user  :  state.user,
      myTeamList  : state.myTeamList

    }
  }
  const mapDispatchToProps = (dispatch) => {
    return { 
      fetchMyTeamList : ( user_id, params ) => dispatch( fetchMyTeamList( user_id, params ) ),
      fetchTeamUnderDepartment : ( user_id, department_id ) => dispatch( fetchTeamUnderDepartment( user_id, department_id ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(EmployeeList);







