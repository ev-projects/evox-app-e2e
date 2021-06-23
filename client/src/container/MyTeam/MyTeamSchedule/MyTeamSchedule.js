import React, { Component } from "react";
import { Card,Col,Badge,Table,Tabs,Tab,Row,Button } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyTeamSchedule.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import { fetchTeamSchedule } from '../../../store/actions/filters/myTeamActions';
import { fetchTeamUnderDepartment } from '../../../store/actions/filters/myTeamActions';
import moment from 'moment';
import ReportNavigator from "../../../components/Template/ReportNavigator/ReportNavigator.js";

class MyTeamSchedule extends Component {

  constructor(props){
    super(props);

    this.initialState = {
        filters: {
          start_date:       moment().startOf('day'),
          end_date:         moment().endOf('day'),
          department_id : this.props.user.departments_handled.length > 0?  this.props.user.departments_handled[0].id : null,  
          name : this.props.filters?.name ?? null,  
          team_id :this.props.filters?.team_id ?? null,  
          scope_type : "day",
          pagination: "all"
      }
    }
    this.state = this.initialState.filters; 
  }

  onSubmitHandler = (values) => {
    var params = {};

    for ( var key in values) {
      if( values[key] != null && values[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            params[key] = values[key].format("YYYY-MM-DD");
            break;
          default:
            params[key] = values[key];
            break;
        }
      } 
    }

  this.props.fetchTeamSchedule( params );
  }

  handleChangeDate = ( start_date, end_date, scope_type) => {
    this.state.scope_type = scope_type;
    this.handleSubmit();
  }


  handleSubmit = () => {
    var formData = {};
    var filter = this.state
    for ( var key in filter) {
      if( filter[key] != null && filter[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            formData[key] = filter[key].format("YYYY-MM-DD");
            break;
          default:
            formData[key] = filter[key];
            break;
        }
      } 
    }
    console.log(filter);
    this.props.fetchTeamSchedule( formData );
  }

  componentDidMount(){
    var formData = {};
    var filter = this.state
    for ( var key in filter) {
      if( filter[key] != null && filter[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            formData[key] = filter[key].format("YYYY-MM-DD");
            break;
          default:
            formData[key] = filter[key];
            break;
        }
      } 
    }
    this.props.fetchTeamSchedule( formData );
  }

  handleSelectDepartment = (department_id) => {
    if( department_id != '' ) {
      this.state.department_id = department_id;
      this.props.fetchTeamUnderDepartment(this.props.user.id, department_id);
    }
  }

  handleSelectDepartment = (department_id) => {
    if( department_id != '' ) {
      this.state.department_id = department_id;
      this.props.fetchTeamUnderDepartment(this.props.user.id, department_id);
    }
  }

  handleFilterChange = (e) => {
    this.setState({ [e.target.name]: e.target.value })
  }
  
  componentDidUpdate(){
  }

  render = () => {  
  var scope_type = this.state.scope_type;
  const validationSchema = Yup.object().shape({
  });

  var { team_list } = this.props.team;
  var { day, week, month } = this.props.team;
  var { user } = this.props; 

  return(
    <Wrapper {...this.props} >
          <ContainerWrapper>
          <h2>My Team Schedule</h2>  
          <div className="navigator-bar">
          <ReportNavigator start_date={this.state.start_date} end_date={this.state.end_date} scope_type={this.state.scope_type}  handleChangeDate={this.handleChangeDate} default_view_type={"day"} hide_filter_button={true}/>
          </div>
          <ContainerBody>  
              <Content col="12">
                <Row>
                <Col className="dept"> 
                    <div className="form-group">
                          <select
                          className="form-control" 
                            name="department_id"
                            value={this.state.department_id}
                            onChange={(e) => { 
                              this.handleSelectDepartment(e.target.value)
                            }}
                            style={{ display: 'block' }}
                          >
                          <option label="Select Department" value=''/>
                          {user.departments_handled.map(function(item){
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
                              value={this.state.team_id}
                              onChange={this.handleFilterChange}
                              style={{ display: 'block' }}
                            >
                            <option label="Select Team" />
                            {team_list.length > 0 && team_list.map(function(item){
                              return <option value={item.id} label={item.name} />;
                            })}
                            </select>
                        </div>
                  </Col> 
                  <Col size="2"> 
                        <div className="form-group">
                            <input type="textfield" className="form-control" variant="primary" placeholder="Enter Name" name="name" onChange={this.handleFilterChange} value={this.state.name} />
                        </div>
                      </Col> 
                      <Col size="2"> 
                          <Button variant="primary" type="submit" onClick={this.handleSubmit}>
                            <i className="fa fa-filter" /> Filter
                          </Button>
                      </Col>
                  </Row>

                {scope_type == "day" ? (
                <React.Fragment>
                <DayTeamSchedule data={day} />
              </React.Fragment>)
                :  scope_type == "week"  ? ( 
                <React.Fragment>
                  <WeekTeamSchedule  data={week}/>
              </React.Fragment>)
                :  scope_type == "month" || scope_type == "custom" ? ( 
                <React.Fragment>
                  <MonthTeamSchedule  data={month}/>
              </React.Fragment>)
                : "Neither"}
              </Content>
          </ContainerBody>  
          </ContainerWrapper>
        </Wrapper>);
  }
  }

  const DayTeamSchedule = (props) => {
    return (<React.Fragment> {  props.data.length > 0  ? (<React.Fragment> 
      <Row className="Hourframe">
      <div>12AM</div><div>1AM</div><div>2AM</div><div>3AM</div><div>4AM</div><div>5AM</div><div>6AM</div><div>7AM</div><div>8AM</div><div>9AM</div><div>10AM</div><div>11AM</div><div>12NN</div>
      <div>1PM</div><div>2PM</div><div>3PM</div><div>4PM</div><div>5PM</div><div>6PM</div><div>7PM</div><div>8PM</div><div>9PM</div><div>10PM</div><div>11PM</div><div>12AM</div>
      </Row>
      {props.data.map((value,index) => {
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

        var card = {};
        card = displayStatus(value);

        var card_class = card.class;
        var card_text = card.text;

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
    </React.Fragment>) : (<React.Fragment></React.Fragment>)}</React.Fragment>);
  }

  const WeekTeamSchedule = (props) => {

     var week = props.data;
    return ( <Row  className="emp_sched">
    {  week.data.length > 0  ? (<React.Fragment> 
      {week.data[0].map((value,index) => {
          return <Col>{week.date_list[index]}{value.map((schedule_info,index) => {

              var card = {};
              card = displayStatus(schedule_info);

              var card_class = card.class;
              var card_text = card.text;

              return <Card>
                <div className={"card-body "+card_class}>
                  <div class="schedule_info">
                    <div>{schedule_info.Name}</div>
                    <div> &nbsp; {card_text} &nbsp;</div>
                  </div>
              </div>
              </Card>;
          })}</Col>;
      })}
    </React.Fragment>) : (<React.Fragment></React.Fragment>)}
    </Row>);
  }

  const MonthTeamSchedule = (props) => {
  var { date_list, data, week_list } = props.data;
  const week_dictionary = {
    "Sunday": 0,
    "Monday" : 1,
    "Tuesday" : 2, 
    "Wednesday" : 3,
    "Thursday" : 4,
    "Friday" :5,
    "Saturday" : 6,
  } ;

  var day_number = 0;
  var length = data.length - 1 ;

  

   return (  <React.Fragment>
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
          
          
          return  <React.Fragment><Row  className="emp_sched"> {first_week_offset} {week.map((day,day_index) => {
            day_number = day_number + 1;
            return <Col>{date_list[day_number-1]}
            {day.map((schedule_info,index) => {
              var card = {};
              card = displayStatus(schedule_info);

              var card_class = card.class;
              var card_text = card.text;

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
    </React.Fragment>);
  }

  function displayStatus(schedule_info){
    var card = {
      class : "",
      text : ""
    }

    if(schedule_info.type.includes("early")){
      card.class = 'early';
      card.text = schedule_info.Schedule[0];                           
    }else if(schedule_info.type.includes("on_leave")){
      card.class = 'on_leave';
      card.text = 'On Leave';
    }else if(schedule_info.type.includes("holiday")){
      card.class = 'holiday';
      card.text = 'Holiday';
    }else if(schedule_info.type.includes("rest_day")){
      card.class = 'rest_day';
      card.text = 'Rest Day';
    }else if(schedule_info.type.includes("late")){
      card.class = 'late';
      card.text = "Late"; 
    }else if(schedule_info.type.includes("absent")){
      card.class = 'absent';
      card.text = "Absent"; 
    }else if(schedule_info.type.includes("no_schedule")){
      card.class = 'no_schedule';
      card.text = "No Schedule";
    }else if(schedule_info.type.includes("no_status")){
      card.class = 'no_status';
      card.text = "No Status";
    }

    return card;
  }

  const mapStateToProps = (state) => {
    return {
      user : state.user,
      team : state.myTeamList,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchTeamSchedule : ( params  ) => dispatch( fetchTeamSchedule( params ) ),
      fetchTeamUnderDepartment : ( user_id, department_id ) => dispatch( fetchTeamUnderDepartment( user_id, department_id ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(MyTeamSchedule);







