import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import { useFormikContext } from 'formik';
import Select from "react-select";

import "./DPAList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Paginate from '../../../components/Template/Paginate'
import Wrapper from "../../../components/Template/Wrapper";

import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchDpaList } from '../../../store/actions/filters/dpaActions';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import Validator from "../../../services/Validator";

class DPAList extends Component {

  
    constructor(props){
      super(props);

      this.initialState = {
          filters: {
            is_active:      this.props.dpaList?.filters?.is_active,
            submitted_dpa:  this.props.dpaList?.filters?.submitted_dpa,
            department_id:  this.props.dpaList?.filters?.department_id,
            page:           this.props.dpaList?.filters?.page
        }
      }
      
      this.state = this.initialState; 
    }

  onSubmitHandler = (values) => {
    console.log(values);
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

  this.props.fetchDpaList( formData );
  
  }

  componentWillMount(){
    
    // Fetch the my Team List upon mounting of the component if the My Team List is not yet initially loaded.
    if( ! Validator.isValid( this.props.dpaList.list ) ) {
      this.props.fetchDpaList( this.state.filters );
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
                    <Content col="12" title="DPA List">
                      <DPAListFilter {...this.props} />
                      <DPAListTable  {...this.props} />
                      
                    </Content>
                </ContainerBody>  
                </ContainerWrapper>
              </Wrapper>
          </form>
          )}
        
          </Formik>);
      }
  }

const DPAListFilter = (props) => {

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
                      name="is_active"
                      value={values.is_active}
                      onChange={handleChange}
                    >
                      <option label="Select Status..." />
                      <option value="1" label="Active" />
                      <option value="0" label="Inactive" />
                    </select>
              </Col>
              <Col size="4"> 
                    <label>Submitted DPA:</label>
                    <select
                    className="form-control" 
                      name="submitted_dpa"
                      value={values.submitted_dpa}
                      onChange={handleChange}
                    >
                      <option label="Select..." />
                      <option value="1" label="Yes" />
                      <option value="0" label="No" />
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
                    <i className="fa fa-filter" /> Filter
                  </Button>
                </div>
              </Col> 
            </Row>;
}

const DPAListTable = (props) => {
  
  const { values, handleChange, setFieldValue } = useFormikContext();

  var pagination = [];
  var list = [];

  // If there's a loaded myTeam props, Generate the Pagination component.
  if( props.dpaList.list != null && props.dpaList.list.data.length > 0 ){
    
      list = props.dpaList.list;

  }


  // If there's a loaded myTeam props already, then proceed on rendering for the Page.
  return ( props.dpaList.list != null && props.dpaList.list.data.length > 0   ? 
          <div>
            Record Displayed: { props.dpaList.list != null && props.dpaList.list.data.length > 0  ? props.dpaList.list.pagination.total : 0 }
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Emp #</th>
                  <th>Name</th>
                  <th>Department</th> 
                  <th>Date Submitted</th> 
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                { list.data.map((user) => {
                    return <tr>
                    <td>{user.emp_num}</td>
                    <td>{user.full_name}</td>
                    <td>{user.department} </td>
                    <td>{user.dpa_ticked_at} </td>
                    <td className="emp-status"> <Status status={user.is_active} /></td>
                  </tr>         
                })}
              </tbody>
            </Table>
            <Paginate pagination={props.dpaList.list.pagination} />
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
      dpaList  : state.dpaList

    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchDpaList : ( params ) => dispatch( fetchDpaList( params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DPAList);







