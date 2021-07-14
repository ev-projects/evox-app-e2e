import React, { Component, useState } from "react";
import "./Schedule.css";
import { Container, Row, Col, Table, Image, Spinner, Button, Form, InputGroup, FormControl, Tabs, Tab, Card } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchTimeOff, setDateList, setScope, setWeekList } from '../../../store/actions/profile/profileActions';

import { ContainerHeader, Content, ContainerWrapper, ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik, FieldArray, Field, ErrorMessage, getIn } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import { Link } from "react-router-dom";
import moment from 'moment';
import Formatter from "../../../services/Formatter";
import { InputDate } from '../../../components/DatePickerComponent/DatePicker.js';
import LeaveCredits from "../LeaveCredits";
import DatePicker from "react-datepicker";
import ReportNavigator from "../../../components/Template/ReportNavigator";
import { getDaysArrayInMonth, generateWeekList, getDaysArrayInWeek, generateWeekListCustom } from "../../../services/Helper";

const Schedule = (props) => {

    const { profile, user } = props;
    let { start_date, end_date } = props;
    
    // Handles the change of date that'll be triggered by the ReportNavigator
    const handleChangeDate = (start_date, end_date, scope_type) => {
        props.setScope(scope_type)
        if (scope_type == 'month') {
            props.setDateList(getDaysArrayInMonth(start_date.format('YYYY'), start_date.format('M')))
            props.setWeekList(generateWeekList(start_date.format('YYYY'), start_date.format('M')))
        }

        if (scope_type == 'week') {
            let week = getDaysArrayInWeek(start_date.add(1, 'days'), end_date.add(1, 'days'))
            props.setDateList(week.date_list)
            props.setWeekList({ week_list: week.week_list, dates_list: week.dates })

        }

        if(scope_type == 'custom'){
            let custom = generateWeekListCustom(start_date,end_date,'custom')
            props.setDateList(custom.display_list)
            props.setWeekList({ week_list: custom.week_list, dates_list: custom.dates_list })
        }
    }

    return (
        Validator.isValid(profile) ?
            <Wrapper  >

                <div className="navigator-bar">
                    <ReportNavigator start_date={start_date} end_date={end_date} handleChangeDate={handleChangeDate} default_view_type={"week"} />
                </div>
                <ContainerBody>
                    <Content col="12">

                        { profile.scope == "week" ? (
                                <React.Fragment>
                                    <WeekTeamSchedule data={profile.dates} date_list={profile.date_list} schedule={profile.schedule} temporary_schedule={profile.temporary_schedule} />
                                </React.Fragment>)
                                : profile.scope == "month" || profile.scope == "custom" ? (
                                    <React.Fragment>
                                        <MonthTeamSchedule data={profile.dates} date_list={profile.date_list} week_list={profile.week_list} schedule={profile.schedule} temporary_schedule={profile.temporary_schedule} />
                                    </React.Fragment>)
                                    : "Neither"}
                    </Content>
                </ContainerBody>

            </Wrapper>
            :
            null
    );

};



const WeekTeamSchedule = (props) => {
    // return "asdasd"
    var week = props.data;
    var date_list = props.date_list;
    var schedule = props.schedule
    var temporary_schedule = props.temporary_schedule
    return (<Row className="emp_sched">
        {week.length > 0 ? (<React.Fragment>
            {week.map((value, index) => {
                var details = ''
                var time_in = schedule?.schedule_details?.all?.start_time
                var time_out = schedule?.schedule_details?.all?.end_time
                var flex_time_in = schedule?.schedule_details?.all?.start_flexy_time
                var flex_time_out = schedule?.schedule_details?.all?.end_flexy_time
                if (schedule?.rest_day?.includes(moment(value).format('ddd').toLowerCase())) {
                    details = 'rest_day'
                } else {
                    details = 'early'
                }

                return <Col>{date_list[index]}

                    <Card>
                        <div className={"card-body " + details}>
                            <div class="schedule_info" >
                                {schedule?.rest_day?.includes(moment(value).format('ddd').toLowerCase()) ? "REST DAY" :

                                    <div>
                                        {time_in} - {time_out}
                                        <br></br>
                                        {flex_time_in} - {flex_time_out}
                                    </div>
                                }
                            </div>
                        </div>
                    </Card>
                </Col>;
            })}
        </React.Fragment>) : (<React.Fragment></React.Fragment>)}
    </Row>);
}

const MonthTeamSchedule = (props) => {

    var data = props.data;
    var date_list = props.date_list
    var week_list = props.week_list
    var schedule = props.schedule
    var temporary_schedule = props.temporary_schedule
    var week_list = props.week_list
    // var date_list = this.profile.date_list
    const week_dictionary = {
        
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6,
    };

    var day_number = 0;
    var length = data.length - 1;

    return (<React.Fragment>
        {data.length > 0 ? (<React.Fragment>
            {data.map((week, week_index) => {
                var first_week_offset = '';
                var last_week_offset = '';

                // FIRST WEEK OFFSET
                if (week_index == 0) {
                    var first_cols;
                    for (var i = 0; i < week_dictionary[[week_list[0][0]]]; i++) {
                        first_cols = <React.Fragment> {first_cols} <Col></Col></React.Fragment>;
                    }
                    first_week_offset = <React.Fragment>{first_cols}</React.Fragment>;
                }

                // LAST WEEK OFFSET
                if (length == week_index) {
                    var last_cols;
                    for (var i = 6; i > week_dictionary[[week_list[length][1]]]; i--) {
                        last_cols = <React.Fragment> {last_cols} <Col></Col></React.Fragment>;
                    }

                    last_week_offset = <React.Fragment>{last_cols}</React.Fragment>;
                }


                return <React.Fragment><Row className="emp_sched"> {first_week_offset} {week.map((day, day_index) => {
                    day_number = day_number + 1;
                    var details = ''
                    var time_in = schedule?.schedule_details?.all?.start_time
                    var time_out = schedule?.schedule_details?.all?.end_time
                    var flex_time_in = schedule?.schedule_details?.all?.start_flexy_time
                    var flex_time_out = schedule?.schedule_details?.all?.end_flexy_time
                    if (schedule?.rest_day?.includes(day.format('ddd').toLowerCase())) {
                        details = 'rest_day'
                    } else {
                        details = 'early'
                    }

                    return <Col>{date_list[day_number - 1]}
                        <Card>
                            <div className={"card-body " + details}>
                                <div class="schedule_info" >
                                    {schedule?.rest_day?.includes(day.format('ddd').toLowerCase()) ? "REST DAY" :

                                        <div>
                                            {time_in} - {time_out}
                                            <br></br>
                                            {flex_time_in} - {flex_time_out}
                                        </div>
                                    }
                                </div>
                            </div>
                        </Card>
                    </Col>
                })}{last_week_offset} </Row></React.Fragment>;
            })}
        </React.Fragment>) : (<React.Fragment></React.Fragment>)}
    </React.Fragment>);
}

function displayStatus(schedule_info) {
    var card = {
        class: "",
        text: ""
    }

    if (schedule_info.type.includes("early")) {
        card.class = 'early';
        card.text = schedule_info.Schedule[0];
    } else if (schedule_info.type.includes("on_leave")) {
        card.class = 'on_leave';
        card.text = 'On Leave';
    } else if (schedule_info.type.includes("holiday")) {
        card.class = 'holiday';
        card.text = 'Holiday';
    } else if (schedule_info.type.includes("rest_day")) {
        card.class = 'rest_day';
        card.text = 'Rest Day';
    } else if (schedule_info.type.includes("late")) {
        card.class = 'late';
        card.text = "Late";
    } else if (schedule_info.type.includes("absent")) {
        card.class = 'absent';
        card.text = "Absent";
    } else if (schedule_info.type.includes("no_schedule")) {
        card.class = 'no_schedule';
        card.text = "No Schedule";
    } else if (schedule_info.type.includes("no_status")) {
        card.class = 'no_status';
        card.text = "No Status";
    }

    return card;
}





// Component for the Leave Icon
export const LeaveIcon = (props) => {

    let icon = "";
    switch (Formatter.title_to_slug(props.type)) {
        case "vacation_leave":
            icon = <i class="fa fa-plane fa-icon" />
            break;
        case "sick_leave":
            icon = <i className="fa fa-medkit fa-icon" />
            break;
        case "magna_carta_leave_for_woman":
            icon = <i className="fa fa-female fa-icon" />
            break;
        case "maternity_leave":
        case "paternity_leave":
            icon = <i className="fa fa-child fa-icon" />
            break;
        case "birthday_leave":
            icon = <i className="fa fa-birthday-cake fa-icon" />
            break;
        case "bereavement_leave":
            icon = <i className="fa fa-handshake-o fa-icon" />
            break;
        default:
            icon = <i className="fa fa-user fa-icon" />
            break;
    }
    return icon;
}

// Component for the Leave Status
export const LeaveStatus = (props) => {

    let status = "";
    switch (props.status) {
        case "requested":
            status = <i className="fa fa-hourglass" style={{ "color": '#ffc84d' }} />
            break;
        case "approved":
            status = <i className="fa fa-check-circle" style={{ "color": '#82af13' }} />
            break;
        case "denied":
            status = <i className="fa fa-times-circle" style={{ "color": '#bd2130' }} />
            break;
        case "canceled":
            status = <i className="fa fa-ban" style={{ "color": '#999' }} />
            break;
    }
    return status;
}


const mapStateToProps = (state) => {
    return {
        profile: state.profile,
        user: state.user
    }
}
const mapDispatchToProps = (dispatch) => {

    return {
        fetchTimeOff: (id, start_date, end_date) => dispatch(fetchTimeOff(id, start_date, end_date)),
        setDateList: (date_list) => dispatch(setDateList(date_list)),
        setWeekList: (year, month) => dispatch(setWeekList(year, month)),
        setScope: (scope) => dispatch(setScope(scope)),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
