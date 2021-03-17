import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl, Container,Tabs,Tab,Badge,Table,Pagination  } from 'react-bootstrap';
import memoize from 'memoize-one';
import moment from 'moment';
import DataTable from 'react-data-table-component';

import "./EmployeeList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { addPayrollCutoff,
      updatePayrollCutoff,
      deletePayrollCutoff,
      fetchPayrollCutoff,
      fetchPayrollCutoffList,
      clearPayrollCutoffInstance,
      clearPayrollCutoffListInstance } from '../../../store/actions/admin/payrollCutoffActions';

import { fetchUserList, fetchDepartmentList } from '../../../store/actions/lookup/lookupListActions';

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";


class PayrollCutoff extends Component {
  
  constructor(props) {
    super(props);

    this.initialState = {
      method : null,
      showForm: false
    }

    this.state = this.initialState;  
  }
  

   showForm = async (id) =>{
    await this.hideForm();

    // Clear the Instance of Payroll Cutoff
    this.props.clearPayrollCutoffInstance();

    id = id || null;

    if( id != null ) {
      this.props.fetchPayrollCutoff( id );
    }

      this.setState({
        showForm: true,
        method :  ( id != null ) ? 'update' : 'store'
      });

  }

  hideForm = () => {
    this.setState(this.initialState);
  }

  deleteItem = async( id ) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await this.props.deletePayrollCutoff( id )
      
      // Clear the Instance of Payroll Cutoff before rendering new Instance (If applicable)
      // await this.props.clearPayrollCutoffListInstance();

      setTimeout( async() => {
        // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
        await this.props.fetchPayrollCutoffList()
    }, 100);
    }
  }


  componentWillMount(){
      
      // Clear the Instance of Payroll Cutoff before rendering new Instance (If applicable)
      this.props.clearPayrollCutoffListInstance();

      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      this.props.fetchUserList('employee', 1 )
  }

  render = () => {  

    const columns = memoize(clickHandler => [
      {
        name: 'ID',
        selector: 'id',
        width : '10%',
      },
      {
        name: 'Name',
        selector: 'name',
        width : '20%',
      },
      {
        name: 'Start Date',
        selector: 'start_date',
        sortable: true,
        format: row => moment(row.start_date).format('LL'),
        width : '25%',
      },
      {
        name: 'End Date',
        selector: 'end_date',
        sortable: true,
        format: row => moment(row.end_date).format('LL'),
        width : '25%',
      },
      {
        cell: (row) => <div>
          <Button type="button" className="btn btn-secondary" onClick={() => { this.showForm( row.id ) }} >Edit</Button> &nbsp;
          <Button type="button" className="btn btn-secondary"  onClick={() => { this.deleteItem( row.id ) }} >Delete</Button>
        </div>,
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
        width : '20%',
      }
    ]);
    
    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    // if( (method == 'store' && initialValue.date != undefined) || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
    
      return <Wrapper>
        <ContainerWrapper>
            <ContainerBody>
                  <Content col="12" title="Employee List" >
                      <Col size="12"> 
                      { this.props.employee.length > 0  ? (<div>
                
                        <Table striped bordered hover>
                          <thead>
                            <tr>
                              <th>
                                <input type="checkbox"/></th>
                              <th>Name / Department</th>
                              <th>Request Type / Date</th>
                              <th>Date Requested</th>
                              <th  colspan="2"> Request Information</th>
                              <th>Status</th>
                              <th>Updated By / Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {this.props.employee.map(function(item){

                              return <tr>
                                <td><input type="checkbox"/></td>
                                <td>{item.created_by} / {item.department_name}</td>
                                <td>{item.table_name} / Date</td>
                                <td>{item.date_requested}</td>
                                {/* <td>{fourthColumn}</td> */}
                                {/* <td>{fifthColumn}</td> */}
                                <td>{item.status}</td>
                                <td>{item.updated_by} / {item.updated_at}</td>
                                <td><i className="fa fa-eye" aria-hidden="true"></i>&nbsp;<i className="fa fa-check-circle" aria-hidden="true"></i>&nbsp;<i className="fa fa-times-circle" aria-hidden="true"></i></td>
                              </tr>         
                            })}
                          </tbody>
                        </Table>
                        {/* <Pagination className="justify-content-center" >{pagination}</Pagination> */}
                        </div>) : (<div> Sorry, No Record Found </div>)}
                      <DataTable
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
                      />
                      </Col> 
                  </Content>
          </ContainerBody>
      </ContainerWrapper>
      </Wrapper>
  // }
  //   return <PageLoading/>;
  }
}

const mapStateToProps = (state) => {
  return {
    employee             : state.lookup.employee,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchUserList                  : ( role, page ) => dispatch( fetchUserList( role, page ) ),
      fetchPayrollCutoff             : ( id ) => dispatch( fetchPayrollCutoff( id ) ),
      fetchPayrollCutoffList         : () => dispatch( fetchPayrollCutoffList() ),
      deletePayrollCutoff            : ( id ) => dispatch( deletePayrollCutoff( id ) ),
      clearPayrollCutoffInstance     : () => dispatch( clearPayrollCutoffInstance() ),
      clearPayrollCutoffListInstance : () => dispatch( clearPayrollCutoffListInstance() ),
      setRedirect                    : ( link ) => dispatch( setRedirect( link ) )
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(PayrollCutoff);








