import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyRequestsDispute.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchRequestListDisputes, fetchStatusNumbers } from '../../store/actions/filters/requestListActions';
import { InputDate,InputTime   } from '../../components/DatePickerComponent/DatePicker.js';
import Paginate from "../../components/Template/Paginate";
import Validator from "../../services/Validator";
import Formatter from "../../services/Formatter";

class MyRequestsDispute extends Component {

  constructor(props){
    super(props);

    this.initialState = {
      filters: {
        status:           this.props.filters?.status ?? "pending",
        valid_from:       this.props.filters?.valid_from ? new Date( this.props.filters?.valid_from ) : (( this.props.settings?.current_payroll_cutoff?.start_date ) ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
        valid_to:         this.props.filters?.valid_to ? new Date( this.props.filters?.valid_to ) : (( this.props.settings?.current_payroll_cutoff?.end_date ) ? new Date( this.props.settings.current_payroll_cutoff.end_date ) : null),
        page:             this.props.filters?.page ?? 1,
        action:           this.props.filters?.action ?? null,
        bulk_action:      this.props.filters?.bulk_action ?? null,
        request_type:     this.props.filters?.request_type ?? 'all',
        url:              'my_requests_dispute'
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
    
    this.props.fetchRequestListDisputes( formData );
  }

  componentDidMount(){
    // Fetch the my Dispute Request list upon mounting of the component if the My Dispute Request List is not yet initially loaded.
    if( ! this.props.isListLoaded ) {
      var filters = {
        ...this.state.filters,
        valid_from: Validator.isValid(this.state.filters.valid_from) ? this.state.filters.valid_from.toISOString().substring(0, 10) : null,
        valid_to:   Validator.isValid(this.state.filters.valid_to) ? this.state.filters.valid_to.toISOString().substring(0, 10) : null
      };

      this.props.fetchRequestListDisputes( filters );
    }
  }

  render = () => {  
    var dispute_request_list = this.props.disputeRequestList;
    var dispute_request_count = this.props.disputeRequestCount;

    const validationSchema = Yup.object().shape({
      valid_from: Yup.date().nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
      valid_to: Yup.date().nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.'),
    });

    if (this.props.isDisputeListLoaded) {
      // Variables for status numbers
      var pending = 0;
      var approved = 0;
      var canceled = 0;
      var declined = 0;
      var all_status = pending + approved + canceled + declined;

      if(dispute_request_count){
        pending = dispute_request_count.pending;
        approved = dispute_request_count.approved;
        canceled = dispute_request_count.cancelled;
        declined = dispute_request_count.declined;
        all_status = pending + approved + canceled + declined;
      }

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
              <h2 className="header_text">My Dispute Requests</h2> 
              <div className="request-tab">
                <Tabs 
                  id="uncontrolled-tab-example"
                  defaultActiveKey={values.request_type}
                  onSelect={(key) =>  {
                    setFieldValue("request_type", key)
                    handleSubmit()
                    }
                  }
                >
                  <Tab eventKey="all" title="All Requests" type="submit"></Tab>
                  <Tab eventKey="alteration" title="Alteration" type="submit"></Tab>
                  <Tab eventKey="overtime" title="Overtime" type="submit"></Tab>
                  <Tab eventKey="rest_day_work" title="Rest Day Work" type="submit"></Tab>
                  {/* <Tab eventKey="change_schedule" title="Change Schedule" type="submit"></Tab>
                  <Tab eventKey="alter_logs_punches" title="MultiPunch Alteration" type="submit"></Tab> */}
                </Tabs> 
              </div>

              <div className="request-content my-request-page"> 
                <ContainerBody>        
                  <Content col="12" className="myrequests">
                    <ButtonGroup toggle className="mb-2 myrequests">
                      <ToggleButton
                        type="checkbox"
                        variant="secondary"
                        className="request_list_btn"
                        checked={values.status=="pending"}
                        onClick={() =>  { setFieldValue("status", "pending"); setFieldValue("page", 1); handleSubmit();}}
                      >
                        <i class="fa fa-circle request_i request_list_i-pending" aria-hidden="true"></i>Pending &nbsp;<Badge className="counter-request" variant="light">{pending}</Badge>
                      </ToggleButton>
                      <ToggleButton
                        type="checkbox"
                        variant="secondary"
                        className="request_list_btn"
                        checked={values.status=="approved"}
                        onClick={() =>{ setFieldValue("status", "approved"); setFieldValue("page", 1); handleSubmit();}}
                      >
                        <i class="fa fa-circle request_i request_list_i-approved" aria-hidden="true"></i>Approved &nbsp;<Badge className="counter-request" variant="light">{approved}</Badge>
                      </ToggleButton>
                      <ToggleButton
                        type="checkbox"
                        variant="secondary"
                        className="request_list_btn"
                        checked={values.status=="canceled"}
                        onClick={() =>  { setFieldValue("status", "canceled"); setFieldValue("page", 1); handleSubmit();}}
                      >
                        <i class="fa fa-circle request_i request_list_i-cancelled" aria-hidden="true"></i>Cancelled &nbsp;<Badge className="counter-request" variant="light">{canceled}</Badge>
                      </ToggleButton>
                      <ToggleButton
                        type="checkbox"
                        variant="secondary"
                        className="request_list_btn"
                        checked={values.status=="declined"}
                        onClick={() => { setFieldValue("status", "declined"); setFieldValue("page", 1); handleSubmit();}}
                      >
                        <i class="fa fa-circle request_i request_list_i-declined" aria-hidden="true"></i>Declined &nbsp;<Badge className="counter-request" variant="light">{declined}</Badge>
                      </ToggleButton>
                    </ButtonGroup>

                    <Row className="filters myrequest-filter">  
                      <Col className="date-range"> 
                        <div className="form-group">
                          <label>Date Range:</label>
                          <InputDate name="valid_from" value={values.valid_from}/>
                          <InputDate name="valid_to" value={values.valid_to}/>
                        </div>
                      </Col> 
                      
                      <Col className="filter-button">   
                        <Button variant="primary" type="submit" onClick={() => setFieldValue("page", 1)}><i className="fa fa-filter" /> Filter</Button>
                      </Col>
                    </Row>

                    { dispute_request_list.length > 0  ? (<div>
                      {/* { record_number } */}
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>Request Type / Date / Note</th>
                            <th>Date Requested</th>
                            <th colspan="2"> Request Information</th>
                            <th>Status</th>
                            <th>Updated By / Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="request_list">
                          {dispute_request_list.map(function(item){
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
                                  link =  global.links.change_schedule + item.id.toString();
                                  break;
                                case "alter_logs":
                                  const [newStartTime, newEndTime] = item.fifth_column.split(',');
                                  fourthColumn.push(
                                    <div>
                                    <span className="alter-logs-new">New</span>
                                      <p>In: {newStartTime}</p>
                                      <p>Out: {newEndTime}</p>
                                    </div>
                                  );
                                  const [currStartTime, currEndTime] = item.fourth_column.split(',');
                                  fifthColumn.push(
                                    <div>
                                      <span className="alter-logs-old">Old</span>
                                      <p>In: {currStartTime}</p>
                                      <p>Out: {currEndTime}</p>
                                    </div>
                                  );
                                  link =  global.links.alter_log + item.id.toString();
                                  break;
                                case "alter_log_punches":
                                  fourthColumn.push(
                                    <div>
                                      <span className="alter-logs-new">New</span>
                                      <p>
                                        Timelog:  {item.fifth_column}
                                      </p>
                                    </div>
                                  );
                                  fifthColumn.push(
                                    <div>
                                      <span className="alter-logs-old">Old</span>
                                      <p>Timelog: {item.fourth_column}</p>
                                    </div>
                                  );
                                  link =  global.links.alter_log_punch + item.id.toString();
                                  break;
                                case "rest_day_works":
                                  fourthColumn.push(
                                    <span>From: {item.fourth_column}</span>

                                  );
                                  fifthColumn.push(
                                    <span>To: {item.fifth_column}</span>

                                  );
                                  link =  global.links.rest_day_work + item.id.toString();
                                  break;
                                case "overtimes":
                                  fifthColumn.push(
                                    <span>
                                      {item.fifth_column
                                        .split('_')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ')}
                                    </span>
                                  );
                                  fourthColumn.push(
                                    <span>{item.fourth_column}</span>

                                  );
                                  link =  global.links.overtime + item.id.toString();
                                  break;
                              }
                              return <tr>
                              <td><b>{ Formatter.slug_to_title( item.table_name.slice(0, -1) ) }</b> <br/><small>{item.created_at}</small> <br/><br/> { item.employee_note ? <small><b>NOTE: </b>{item.employee_note}</small> : null} </td>
                              <td>{item.date_requested}</td>
                              <td>{fourthColumn}</td>
                              <td>{fifthColumn}</td>
                              <td className="status"><div className={item.status.charAt(0).toUpperCase() + item.status.slice(1)}><Status status={item.status.charAt(0).toUpperCase() + item.status.slice(1)} /></div></td>
                              <td>{item.updated_by} <br/><small> {item.updated_at}</small></td>
                              <td> <Link to={{ pathname: link, previousPath:  global.links.base +'account/MyRequests' }} className="nav-link" ><i className="fa fa-eye" aria-hidden="true"></i></Link></td>
                            </tr>         
                          })}
                          </tbody>
                      </Table>
                    <Paginate pagination={dispute_request_list} />
                    </div>) : (<div> Sorry, No Record Found </div>)}
                  </Content>
                </ContainerBody>
              </div>
            </ContainerWrapper>
          </Wrapper>
        </form>
      )}</Formik>);
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
    disputeRequestList  : state.myDisputeRequestList.instance,
    isDisputeListLoaded : state.myDisputeRequestList.isListLoaded,
    disputeRequestCount : state.myDisputeRequestList.instanceCount,
    settings            : state.settings
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    fetchRequestListDisputes : ( params  ) => dispatch( fetchRequestListDisputes(  params  ) ), 
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MyRequestsDispute);