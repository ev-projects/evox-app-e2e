import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyRequests.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchRequestList,fetchStatusNumbers } from '../../store/actions/filters/requestListActions';
import { InputDate,InputTime   } from '../../components/DatePickerComponent/DatePicker.js';
import Paginate from "../../components/Template/Paginate";
import Validator from "../../services/Validator";
import Formatter from "../../services/Formatter";

class MyRequests extends Component {

  constructor(props){
    super(props);

    this.initialState = {
        filters: {
          status:           this.props.filters?.status ?? null,
          valid_from:       this.props.filters?.valid_from ? new Date( this.props.filters?.valid_from ) : (( this.props.settings?.current_payroll_cutoff?.start_date ) ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
          valid_to:         this.props.filters?.valid_to ? new Date( this.props.filters?.valid_to ) : (( this.props.settings?.current_payroll_cutoff?.end_date ) ? new Date( this.props.settings.current_payroll_cutoff.end_date ) : null),
          department_id:    this.props.filters?.department_id ?? null,
          name:             this.props.filters?.name ?? null,
          page:             this.props.filters?.page ?? 1,
          checkedList:      this.props.filters?.checkedList ?? [],
          isAll:            this.props.filters?.isAll ?? false,
          action:           this.props.filters?.action ?? null,
          bulk_action:      this.props.filters?.bulk_action ?? null,
          url:              'my_requests'
      }
    }
    this.state = this.initialState; 
  }

  onSubmitHandler = (values) => {
    var formData = {};

    for (var key in values) {
      if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
              formData[key] = moment( values[key] ).format("YYYY-MM-DD")
            break;
            default:
              formData[key] = values[key];
            break;
          }
      } 
    }
    
    this.props.fetchRequestList( formData );
    this.props.fetchStatusNumbers( formData );
  }

  componentDidMount(){

    // Fetch the my Request list upon mounting of the component if the My Request List is not yet initially loaded.
    if( ! this.props.isListLoaded ) {
      var filters = {
        ...this.state.filters,
        valid_from: Validator.isValid(this.state.filters.valid_from) ? this.state.filters.valid_from.toISOString().substring(0, 10) : null,
        valid_to:   Validator.isValid(this.state.filters.valid_to) ? this.state.filters.valid_to.toISOString().substring(0, 10) : null
      };

      this.props.fetchRequestList( filters );
      this.props.fetchStatusNumbers( filters );
    }

  }



  render = () => {  

  var request_list = this.props.requestList.result;
  var record_number = this.props.requestList.record_number;

  const validationSchema = Yup.object().shape({

    valid_from: Yup.date().nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
    valid_to: Yup.date().nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.'),
  });
  if(this.props.isListLoaded){
    let pagination = [];
    for (let number = 1; number <= request_list.last_page; number++) {
      pagination.push(
        <Field>
          {({ field, form }) => (
            <div>
              <Button type="submit" className="pagination_btn text-center" active={number === request_list.current_page} onClick={() => form.setFieldValue("page",number)}>{number}</Button>
            </div>
          )}
        </Field>
      );
      
    }

    // Variables for status numbers
    var pending = 0;
    var approved = 0;
    var canceled = 0;
    var declined = 0;
    var all_status = pending + approved + canceled+ declined;

    if(this.props.isNumbersLoaded){
      pending = this.props.statusNumbers.pending===undefined?0:this.props.statusNumbers.pending;
      approved = this.props.statusNumbers.approved===undefined?0:this.props.statusNumbers.approved;
      canceled = this.props.statusNumbers.canceled===undefined?0:this.props.statusNumbers.canceled;
      declined = this.props.statusNumbers.declined===undefined?0:this.props.statusNumbers.declined;
      all_status = pending + approved + canceled+ declined;
    }

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
                <Content col="12" title="My Requests">
                <Tabs defaultActiveKey="home" id="uncontrolled-tab-example">
                  <Tab eventKey="home" title="All Requests">
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status==null}
                      onClick={() => setFieldValue("status", null)}
                    >
                      <Badge variant="light">{all_status}</Badge>
                       &nbsp;All Status
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="pending"}
                      onClick={() => setFieldValue("status", "pending")}
                    >
                      <Badge className="pending" variant="light">{pending}</Badge>
                       &nbsp;Pending
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="approved"}
                      onClick={() => setFieldValue("status", "approved")}
                    >
                      <Badge className="approved" variant="light">{approved}</Badge>
                      &nbsp;Approved 
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="canceled"}
                      onClick={() => setFieldValue("status", "canceled")}
                    >
                      <Badge className="canceled" variant="light">{canceled}</Badge>
                      &nbsp;Canceled 
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="declined"}
                      onClick={() => setFieldValue("status", "declined")}
                    >
                      <Badge className="denied" variant="light">{declined}</Badge>
                      &nbsp;Declined 
                    </ToggleButton>
                  </ButtonGroup>
                  
                  <Row className="date-range">  
                    <Col className="col-lg-2 col-4"> 
                      <div className="form-group">
                        <label>Date From:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                      </div>
                    </Col> 
                    <Col className="col-lg-2  col-4">  
                    <div className="form-group">
                        <label>Date To:</label>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>
                    <Col className="col-lg-2  col-4 col-btn">   
                    <Button variant="primary" type="submit" onClick={() => setFieldValue("page", 1)}>
                    Filter
                  </Button>
                    </Col>
                    
                    </Row>
                    { request_list.data.length > 0  ? (<div>
                      Record Displayed: { record_number }
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Request Type / Date / Note</th>
                      <th>Date Requested</th>
                      <th  colspan="2"> Request Information</th>
                      <th>Status</th>
                      <th>Updated By / Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request_list.data.map(function(item){
                        var fourthColumn = [];
                        var fifthColumn = [];
                        var link= '';
                        switch( item.table_name ) { 
                          case "change_schedules":

                            var payroll_items = {allow_late:"Late", allow_undertime:"Undertime", allow_night_diff: "Night Differential"};

                            for (var key in item.fifth_column) {
                              if(item.fifth_column[key]=='1'){
                                fourthColumn.push(
                                  <span>{eval('payroll_items.'+key)},</span>
                                );
                              }
                            }
                            fifthColumn.push(
                              <div>
                               <p> Rest Days: {item.fourth_column?.rest_day.join()}</p>
                              <p> Work Days: {item.fourth_column?.work_days.join()}</p>
                              </div>
                            ); 
                            link =  global.change_schedule + item.id.toString();
                              break;
                          case "alter_logs":
                            fourthColumn.push(
                              <div>
                              <span className="alter-logs-new">New</span>
                                <p>In: {item.fifth_column.new_time_in}</p>
                                <p>Out: {item.fifth_column.new_time_out}</p>
                              </div>
                            );
                            fifthColumn.push(
                              <div>
                                <span className="alter-logs-old">Old</span>
                                <p>In: {item.fourth_column.current_time_in}</p>
                                <p>Out: {item.fourth_column.current_time_out}</p>
                              </div>
                            );
                            link =  global.alter_log + item.id.toString();
                              break;
                          case "rest_day_works":
                            fourthColumn.push(
                              <span>From: {item.fourth_column}</span>

                            );
                            fifthColumn.push(
                              <span>To: {item.fifth_column}</span>

                            );
                            link =  global.rest_day_work + item.id.toString();
                              break;
                          case "overtimes":
                              fifthColumn.push(
                                <span>{item.fifth_column}</span>

                              );
                              fourthColumn.push(
                                <span>{item.fourth_column}</span>

                              );
                              link =  global.overtime + item.id.toString();
                              break;
                       }
                        return <tr>
                        <td><b>{ Formatter.slug_to_title( item.table_name.slice(0, -1) ) }</b> <br/><small>{item.created_at}</small> <br/><br/> { item.employee_note ? <small><b>NOTE: </b>{item.employee_note}</small> : null} </td>
                        <td>{item.date_requested}</td>
                        <td>{fourthColumn}</td>
                        <td>{fifthColumn}</td>
                        <td> <Status status={item.status} /></td>
                        <td>{item.updated_by} <br/><small> {item.updated_at}</small></td>
                        <td> <Link to={{ pathname: link, previousPath:  global.base_url +'account/MyRequests' }} className="nav-link" ><i className="fa fa-eye" aria-hidden="true"></i></Link></td>
                      </tr>         
                    })}
                    </tbody>
                  </Table>
                  <Paginate pagination={request_list} />
                  </div>) : (<div> Sorry, No Record Found </div>)}
                    </Tab>
                  </Tabs>    
                  </Content>
                </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
        </form>
        )}
      
        </Formik>);
    }
    return <PageLoading/>;
    }
    }


  const Status = (props) => {
    let pagination = [];
    switch( props.status ) { 
      case "Pending":
          pagination.push( <Badge variant="secondary"><span></span>{props.status}</Badge>);
          break;
      case "Canceled":
          pagination.push(<Badge variant="dark"><span></span>{props.status}</Badge>);
          break;
      case "Approved":
          pagination.push(<Badge variant="success"><span></span>{props.status}</Badge>);
          break;
      case "Declined":
          pagination.push(<Badge variant="danger"><span></span>{props.status}</Badge>);
      break;
   }
    return pagination;
}



  const mapStateToProps = (state) => {
    return {
      requestList     : state.myRequestList.instance,
      isListLoaded    : state.myRequestList.isListLoaded,
      isNumbersLoaded : state.myRequestList.isNumbersLoaded,
      statusNumbers   : state.myRequestList.statusNumbers,
      filters         : state.myRequestList.filters,
      settings        : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchRequestList : ( params  ) => dispatch( fetchRequestList(  params  ) ), 
      fetchStatusNumbers : ( params  ) => dispatch( fetchStatusNumbers( params  ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(MyRequests);







