import React, { Component } from "react";
import { Card,Col,Badge,Table,Tabs,Tab,Row,Button } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./Daily.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import { Link } from "react-router-dom";
import { fetchTeamSchedule } from '../../../../store/actions/filters/myTeamActions';
import { fetchTeamUnderDepartment } from '../../../../store/actions/filters/myTeamActions';
import moment from 'moment';

class Daily extends Component {

  constructor(props){
    super(props);

    this.initialState = {
        filters: {
          department_id : this.props.user.departments_handled.length > 0?  this.props.user.departments_handled[0].id : null,  
          name : this.props.filters?.name ?? null,  
          team_id :this.props.filters?.team_id ?? null,  
          page : "daily",
          pagination: "all"
      }
    }
    this.state = this.initialState; 
  }

  onSubmitHandler = (values) => {
    var params = {};

    for (var key in values) {
      if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            default:
              params[key] = values[key];
            break;
          }
      } 
  }

  this.props.fetchTeamSchedule( params );
  }

  componentDidMount(){
    var params = this.initialState.filters;
    this.props.fetchTeamSchedule( params )
  }

  departmentSelected = (departmentId) => {
    if( departmentId != '' ) {
      this.props.fetchTeamUnderDepartment(this.props.user.id, departmentId);
    }
  }

  componentDidUpdate(){
  }

  render = () => {  
  var { team_list } = this.props.team;

  var { daily } = this.props.team;

  const validationSchema = Yup.object().shape({
  });

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
            <h2>My Team Schedule</h2> 
            <div className="request-tab">
              <nav class="nav nav-tabs" role="tablist">
                <Link className="nav-link active" to={ global.links.daily_team_schedule }>
                  Daily
                </Link>
                <Link className="nav-link" to={ global.links.weekly_team_schedule }>
                  Weekly
                </Link>
                <Link className="nav-link" to={ global.links.monthly_team_schedule }>
                 Monthly
                </Link>
              </nav>
            </div>  
            <ContainerBody>  
                <Content col="12">
                  <Row>
                  <Col className="dept"> 
                      <div className="form-group ">
                          
                          <select
                          className="form-control" 
                            name="department_id"
                            value={values.department_id}
                            onChange={(e) => { setFieldValue('department_id', e.target.value);  setFieldValue('team_id', '');  this.departmentSelected(e.target.value);}}
                            style={{ display: 'block' }}
                          >
                          <option    label="- Department -" />
                          {this.props.user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })}
                          </select>
                      </div>
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
                    <Col className="search-name">
                      <div className="form-group">
                          <input type="textfield" className="form-control" variant="primary" placeholder="Enter name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    </Col> 
                    <Col className="filter-button">
                    <div className="form-group">
                        <Button className="display-block" variant="primary" type="submit"  >
                          <i className="fa fa-filter" /> Filter
                        </Button>
                    </div>
                    </Col>
                    </Row>
                  
                    {  daily.length > 0  ? (<React.Fragment> 
                      <Row className="Hourframe">
                  <div>12AM</div><div>1AM</div><div>2AM</div><div>3AM</div><div>4AM</div><div>5AM</div><div>6AM</div><div>7AM</div><div>8AM</div><div>9AM</div><div>10AM</div><div>11AM</div><div>12NN</div>
                  <div>1PM</div><div>2PM</div><div>3PM</div><div>4PM</div><div>5PM</div><div>6PM</div><div>7PM</div><div>8PM</div><div>9PM</div><div>10PM</div><div>11PM</div><div>12AM</div>
                  </Row>
                      {daily.map((value,index) => {
                        var first_div = {
                          width: "0",
                          content: "",
                          class: ""
                        };

                        var second_div = {
                          width: "0",
                          content: "",
                          class: ""
                        };
                        var card_class;
                        var card_text;
  
                        if(value.type.includes("early")){
                          card_class = 'early';
                          card_text = "Early";                           
                        }else if(value.type.includes("on_leave")){
                          card_class = 'on_leave';
                          card_text = 'On Leave';
                        }else if(value.type.includes("holiday")){
                          card_class = 'holiday';
                          card_text = 'Holiday';
                        }else if(value.type.includes("rest_day")){
                          card_class = 'rest_day';
                          card_text = 'Rest Day';
                        }else if(value.type.includes("late")){
                          card_class = 'late';
                          card_text = "Late"; 
                        }else if(value.type.includes("absent")){
                          card_class = 'absent';
                          card_text = "Absent";
                        }else if(value.type.includes("no_schedule")){
                          card_class = 'no_schedule';
                          card_text = "No Schedule";
                        }else if(value.type.includes("no_status")){
                          card_class = 'no_status';
                          card_text = "No Status";
                        }

                        if(value.day_type=="underlapped"){
                          first_div.width = String(value.hour * 4) + "%";  
                          second_div.width = String( value.hour  * 4 ) + "%";
                          first_div.content = value.Name + " - " + card_text

                          first_div.class = card_class;
                        }else if (value.day_type=="overlapped"){
                          first_div.width = String( ( 25 - value.hour ) * 4) + "%";
                          second_div.width = String( value.hour  * 4 ) + "%";
                          second_div.content = value.Name + " - " + card_text;
                          
                          second_div.class = card_class;
                        }else{  
                          var schedule_in = moment(value.on_duty);
                          var space = (Number( schedule_in.format("HH") ) + Number(schedule_in.format("mm"))/60) * 4 ;
                          first_div.width = String( space ) + "%";
                          second_div.width = String( value.hour * 4 ) + "%";
                          second_div.content = value.Name + " - " + card_text

                          second_div.class = card_class;
                        }

                        return <Row className="emp_sched" >
                        <div style={first_div} className={first_div.class}>{first_div.content}</div>
                        <div style={second_div} className={second_div.class}>{second_div.content}</div>
                        <div></div>
                        </Row>;
                      })}
                    </React.Fragment>) : (<React.Fragment></React.Fragment>)}
                </Content>
            </ContainerBody>  
            </ContainerWrapper>
          </Wrapper>
      </form>
      )}
    
      </Formik>);
  }
 
  }


  const mapStateToProps = (state) => {
    return {
      team : state.myTeamList,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchTeamSchedule : ( params  ) => dispatch( fetchTeamSchedule( params ) ),
      fetchTeamUnderDepartment : ( user_id, department_id ) => dispatch( fetchTeamUnderDepartment( user_id, department_id ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(Daily);







