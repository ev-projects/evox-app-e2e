import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import { useFormikContext } from 'formik';
import Select from "react-select";

import "./MyTeamList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Paginate from '../../../components/Template/Paginate'
import Wrapper from "../../../components/Template/Wrapper";

import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchMyTeamList } from '../../../store/actions/filters/myTeamActions';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import Validator from "../../../services/Validator";

class MyTeamList extends Component {

  
    constructor(props){
      super(props);

      this.initialState = {
          filters: {
            status:         this.props.myTeamList?.filters?.status,
            department_id:  this.props.myTeamList?.filters?.department_id,
            name:           this.props.myTeamList?.filters?.name,
            page:           this.props.myTeamList?.filters?.page,
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
          <Wrapper>
                <ContainerWrapper>   
                <ContainerBody>  
                    <Content col="12" title="My Team List">
                      <MyTeamListFilter {...this.props} />
                      <MyTeamListTable  {...this.props} />
                      
                    </Content>
                </ContainerBody>  
                </ContainerWrapper>
              </Wrapper>
          </form>
          )}
        
          </Formik>);
      }
  }

const MyTeamListFilter = (props) => {

  const { values, handleChange, setFieldValue } = useFormikContext();

    // Generate status data
    var statusOptions = [
      {
       'label' : 'Active', 
       'value' : 1 
      },{
       'label' : 'Inactive', 
       'value' : 2 
      },
    ];

    return  <Row>  
              <Col size="4"> 
                    <label>Status:</label>
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
                    <label>Department:</label>
                    <select
                    className="form-control" 
                      name="department_id"
                      value={values.department_id}
                      onChange={handleChange}
                      style={{ display: 'block' }}
                    >
                    <option label="Select a Department..." />
                    {props.user.departments_handled.map(function(item){
                      return <option value={item.id} label={item.department_name} />;
                    })}
                    </select>
                </div>
              </Col> 
              <Col size="2"> 
                <div className="form-group">
                    <label>Name:</label>
                    <input type="textfield" className="form-control" variant="primary" placeholder="Enter Name..." name="name" onChange={handleChange} value={values.name} />
                </div>
              </Col> 
              <Col size="2"> 
                <div style={{ 'marginTop' : '30px'}}>
                  <Button variant="primary" type="submit" onClick={() => setFieldValue("page", 1)}>
                    Filter
                  </Button>
                </div>
              </Col> 
            </Row>;
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
                  <th>Name</th>
                  <th>Department</th> 
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                { list.data.map((user) => {
                    return <tr>
                    <td>{user.full_name}</td>
                    <td>{user.department} </td>
                    <td className="emp-status"> <Status status={user.is_active} /></td>
                    <td className="actions">
                      <Link to={{
                              pathname: global.daily_time_record_view + user.id,
                              previousPath: props.location.pathname,
                              resetInitialState: true
                            }}
                          title="View DTR"
                      >
                        <i className="fa fa-clock-o ev-color" aria-hidden="true"></i>
                      </Link>
                      &nbsp;&nbsp;&nbsp;
                      <Link to={{
                              pathname: global.schedule_assign_user + user.id,
                              previousPath: props.location.pathname
                            }}
                          title="View Schedule"
                      >
                        <i className="fa fa-calendar-o ev-color" aria-hidden="true"></i>
                      </Link>
                      &nbsp;&nbsp;&nbsp;
                      <Link to={{
                              pathname: global.profile_url + user.id,
                              previousPath: props.location.pathname
                            }}
                          title="View Profile"
                      >
                        <i className="fa fa-info ev-color" aria-hidden="true"></i>
                      </Link>
                    </td>
                  </tr>         
                })}
              </tbody>
            </Table>
            <Paginate pagination={props.myTeamList.list.pagination} />
        </div>
        :
        <div> Sorry, No Record Found </div>
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
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(MyTeamList);







