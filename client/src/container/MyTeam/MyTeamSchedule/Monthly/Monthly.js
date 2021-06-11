import React, { Component } from "react";
import { Card,Col,Badge,Table,Tabs,Tab,Row,Button } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./Monthly.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import { fetchTeamSchedule } from '../../../../store/actions/filters/myTeamActions';
import { fetchTeamUnderDepartment } from '../../../../store/actions/filters/myTeamActions';
import { Link } from "react-router-dom";

class Monthly extends Component {

  constructor(props){
    super(props);

    this.initialState = {
        filters: {
          department_id : this.props.user.departments_handled.length > 0 ?  this.props.user.departments_handled[0].id : null,  
          name : this.props.filters?.name ?? null,  
          team_id :this.props.filters?.team_id ?? null, 
          page : "monthly",
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
    this.props.fetchTeamSchedule(params)
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

  var { date_list, data, week_list } = this.props.team.monthly;
  console.log(this.props.team);
  const week_dictionary = {
    "Sunday": 0,
    "Monday" : 1,
    "Tuesday" : 2, 
    "Wednesday" : 3,
    "Thursday" : 4,
    "Friday" :5,
    "Saturday" : 6,
  } ;

  var length = data.length - 1 ;
  const validationSchema = Yup.object().shape({
  });

  var day_number = 0;

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
                <Link className="nav-link" to={ global.links.daily_team_schedule }>
                  Daily
                </Link>
                <Link className="nav-link" to={ global.links.weekly_team_schedule }>
                  Weekly
                </Link>
                <Link className="nav-link active" to={ global.links.monthly_team_schedule }>
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
                  <Row>
                    <Col>
                      SUNDAY
                    </Col>
                    <Col>
                      MONDAY
                    </Col>
                    <Col>
                      TUESDAY
                    </Col>
                    <Col>
                      WEDNESDAY
                    </Col>
                    <Col>
                        THURSDAY
                    </Col>
                    <Col>
                        FRIDAY
                    </Col>
                    <Col>
                      SATURDAY
                    </Col>
                  </Row>
                    {  data.length > 0  ? (<React.Fragment> 
                        {data.map((week,week_index) => {
                          var first_week_offset = '';
                          var last_week_offset = '';

                          // FIRST WEEK OFFSET
                          if (week_index==0)
                          {
                            var first_cols;
                            for ( var i = 0; i <  week_dictionary[[week_list[0][0]]]; i++) {
                              first_cols =<React.Fragment> {first_cols} <Col></Col></React.Fragment>;
                            }
                            first_week_offset =<React.Fragment>{first_cols}</React.Fragment>;
                          }
                          
                            // LAST WEEK OFFSET
                          if(length==week_index){
                            var last_cols;
                            for ( var i = 6; i >  week_dictionary[[week_list[length][1]]]; i--) {
                              last_cols =<React.Fragment> {last_cols} <Col></Col></React.Fragment>;
                            }

                            last_week_offset =<React.Fragment>{last_cols}</React.Fragment>;
                          }
                          
                          
                          return  <React.Fragment><Row  className="empsched"> {first_week_offset} {week.map((day,day_index) => {
                            day_number = day_number + 1;
                            return <Col>{date_list[day_number-1]}
                            {day.map((schedule_info,index) => {
                              var card_class = '';
                              var card_text = ''; 
  
                              if(schedule_info.type.includes("early")){
                                card_class = 'early';
                                card_text = schedule_info.Schedule[0];                           
                              }else if(schedule_info.type.includes("on_leave")){
                                card_class = 'on_leave';
                                card_text = 'On Leave';
                              }else if(schedule_info.type.includes("holiday")){
                                card_class = 'holiday';
                                card_text = 'Holiday';
                              }else if(schedule_info.type.includes("rest_day")){
                                card_class = 'rest_day';
                                card_text = 'Rest Day';
                              }else if(schedule_info.type.includes("late")){
                                card_class = 'late';
                                card_text = schedule_info.Schedule[0]; 
                              }else if(schedule_info.type.includes("absent")){
                                card_class = 'absent';
                                card_text = schedule_info.Schedule[0]; 
                              }else if(schedule_info.type.includes("no_schedule")){
                                card_class = 'no_schedule';
                                card_text = "No Schedule";
                              }
  
                                return <Card>
                                  <div className={"card-body "+card_class}>
                                    <div class="schedule_info">
                                      <div>{schedule_info.Name}</div>
                                      <div> &nbsp; {card_text} &nbsp;</div>
                                    </div>
                                </div>
                                </Card>;
                            })}</Col> 
                          })}{last_week_offset} </Row></React.Fragment>;
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
      team : state.myTeamList
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchTeamSchedule : (  params ) => dispatch( fetchTeamSchedule(  params ) ),
      fetchTeamUnderDepartment : ( user_id, department_id ) => dispatch( fetchTeamUnderDepartment( user_id, department_id ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(Monthly);







