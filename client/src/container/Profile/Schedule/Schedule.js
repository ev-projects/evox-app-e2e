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
import { viewEmployeeDtr, } from '../../../store/actions/dtr/dtrActions';

const Schedule = (props) => {

    const { profile, user, dtr, id } = props;
    let { start_date, end_date } = props;

    // Handles the change of date that'll be triggered by the ReportNavigator
    const handleChangeDate = (start_date, end_date, scope_type) => {
        props.viewEmployeeDtr(id, start_date.format('YYYY-MM-DD'), end_date.format('YYYY-MM-DD'))
        props.setScope(scope_type)
        if (scope_type == 'month') {
            props.setDateList(getDaysArrayInMonth(start_date.format('YYYY'), start_date.format('M')))
            props.setWeekList(generateWeekList(start_date.format('YYYY'), start_date.format('M')))
        }

        if (scope_type == 'week') {
            let week = getDaysArrayInWeek(start_date, end_date)
            props.setDateList(week.date_list)
            props.setWeekList({ week_list: week.week_list, dates_list: week.dates })
        }

        if (scope_type == 'custom') {
            let custom = generateWeekListCustom(start_date, end_date, 'custom')
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
                        <Row className="days cl">
                            <Col>Monday</Col>
                            <Col>Tuesday</Col>
                            <Col>Wednesday</Col>
                            <Col>Thursday</Col>
                            <Col>Friday</Col>
                            <Col>Saturday</Col>
                            <Col>Sunday</Col>
                        </Row>
                        {profile.scope == "week" ? (
                            <React.Fragment>
                                <WeekTeamSchedule dtr={dtr} data={profile.dates} date_list={profile.date_list} schedule={profile.schedule} temporary_schedule={profile.temporary_schedule} />
                            </React.Fragment>)
                            : profile.scope == "month" || profile.scope == "custom" ? (
                                <React.Fragment>
                                    <MonthTeamSchedule dtr={dtr} data={profile.dates} date_list={profile.date_list} week_list={profile.week_list} schedule={profile.schedule} temporary_schedule={profile.temporary_schedule} />
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
    var week = props.data;
    var dtr = props.dtr;
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

                if (week.length == dtr.length) {

                    if (dtr[index].attendance_status.name == 'Rest Day') {
                        details = 'rest_day'
                    } else {
                        details = 'early'
                    }
                    time_in = moment(dtr[index].start_datetime).format('HH:mm')
                    time_out = moment(dtr[index].end_datetime).format('HH:mm')
                    flex_time_in = moment(dtr[index].start_flexy_datetime).format('HH:mm')
                    flex_time_out = moment(dtr[index].end_flexy_datetime).format('HH:mm')
                    return <Col><div className="schedule-date">{moment(date_list[index]).format("MMM DD")}</div>

                        <Card>
                            <div className={"card-body " + details}>
                                <div class="schedule_info" >
                                    {dtr[index].attendance_status.name == 'Rest Day' ? "REST DAY" :

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
                } else {
                    if (dtr[index]) {

                        if (dtr[index].attendance_status.name == 'Rest Day') {
                            details = 'rest_day'
                        } else {
                            details = 'early'
                        }
                        time_in = moment(dtr[index].start_datetime).format('HH:mm')
                        time_out = moment(dtr[index].end_datetime).format('HH:mm')
                        flex_time_in = moment(dtr[index].start_flexy_datetime).format('HH:mm')
                        flex_time_out = moment(dtr[index].end_flexy_datetime).format('HH:mm')
                        return <Col><div className="schedule-date">{moment(date_list[index]).format("MMM DD")}</div>

                            <Card>
                                <div className={"card-body " + details}>
                                    <div class="schedule_info" >
                                        {dtr[index].attendance_status.name == 'Rest Day' ? "REST DAY" :

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
                    } else {
                        var rest_day = schedule?.rest_day;
                        temporary_schedule.map((temp) => {

                            if (temp.valid_from == temp.valid_to && moment(date_list[index]).isSame(temp.valid_from)) {
                                time_in = temp?.schedule_details?.all?.start_time
                                time_out = temp?.schedule_details?.all?.end_time
                                flex_time_in = temp?.schedule_details?.all?.start_flexy_time
                                flex_time_out = temp?.schedule_details?.all?.end_flexy_time
                                rest_day = temp.rest_day;
                            }


                            if (temp.valid_from != temp.valid_to) {

                                if (moment(date_list[index]).isBetween(temp.valid_from, temp.valid_to)) {
                                    time_in = temp?.schedule_details?.all?.start_time
                                    time_out = temp?.schedule_details?.all?.end_time
                                    flex_time_in = temp?.schedule_details?.all?.start_flexy_time
                                    flex_time_out = temp?.schedule_details?.all?.end_flexy_time
                                    rest_day = temp.rest_day;
                                } else {
                                    if (moment(date_list[index]).isSame(temp.valid_from) || moment(date_list[index]).isSame(temp.valid_to)) {
                                        time_in = temp?.schedule_details?.all?.start_time
                                        time_out = temp?.schedule_details?.all?.end_time
                                        flex_time_in = temp?.schedule_details?.all?.start_flexy_time
                                        flex_time_out = temp?.schedule_details?.all?.end_flexy_time
                                        rest_day = temp.rest_day;
                                    }
                                }
                            }


                        })
                    }
                    return <Col><div className="schedule-date">{moment(date_list[index]).format("MMM DD")}</div>

                        <Card>
                            <div className={"card-body " + details}>
                                <div class="schedule_info" >
                                    {rest_day?.includes(moment(value).format('ddd').toLowerCase()) ? "REST DAY" :

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
                }

            })}
        </React.Fragment>) : (<React.Fragment></React.Fragment>)}
    </Row>);
}

const MonthTeamSchedule = (props) => {
    var dtr = props.dtr;

    var data = props.data;
    var date_list = props.date_list
    var week_list = props.week_list
    var schedule = props.schedule
    var temporary_schedule = props.temporary_schedule

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


                return <React.Fragment><Row className="emp_sched profile"> {first_week_offset} {week.map((day, day_index) => {
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

                    if (date_list.length == dtr.length) {
                        if (dtr[day_number - 1].attendance_status.name == 'Rest Day') {
                            details = 'rest_day'
                        } else {
                            details = 'early'
                        }
                        time_in = moment(dtr[day_number - 1].start_datetime).format('HH:mm')
                        time_out = moment(dtr[day_number - 1].end_datetime).format('HH:mm')
                        flex_time_in = moment(dtr[day_number - 1].start_flexy_datetime).format('HH:mm')
                        flex_time_out = moment(dtr[day_number - 1].end_flexy_datetime).format('HH:mm')
                        return <Col>{moment(date_list[day_number - 1]).format("MMM, D")}

                            <Card>
                                <div className={"card-body " + details}>
                                    <div class="schedule_info" >
                                        {dtr[day_number - 1].attendance_status.name == 'Rest Day' ? "REST DAY" :

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
                    } else {

                        if (dtr[day_number - 1]) {

                            if (dtr[day_number - 1].attendance_status.name == 'Rest Day') {
                                details = 'rest_day'
                            } else {
                                details = 'early'
                            }
                            time_in = moment(dtr[day_number - 1].start_datetime).format('HH:mm')
                            time_out = moment(dtr[day_number - 1].end_datetime).format('HH:mm')
                            flex_time_in = moment(dtr[day_number - 1].start_flexy_datetime).format('HH:mm')
                            flex_time_out = moment(dtr[day_number - 1].end_flexy_datetime).format('HH:mm')
                            return <Col>{moment(date_list[day_number - 1]).format("MMM, D")}

                                <Card>
                                    <div className={"card-body " + details}>
                                        <div class="schedule_info" >
                                            {dtr[day_number - 1].attendance_status.name == 'Rest Day' ? "REST DAY" :

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
                        } else {
                            var rest_day = schedule?.rest_day;
                            temporary_schedule.map((temp) => {

                                if (temp.valid_from == temp.valid_to && moment(date_list[day_number - 1]).isSame(temp.valid_from)) {
                                    time_in = temp?.schedule_details?.all?.start_time
                                    time_out = temp?.schedule_details?.all?.end_time
                                    flex_time_in = temp?.schedule_details?.all?.start_flexy_time
                                    flex_time_out = temp?.schedule_details?.all?.end_flexy_time
                                    rest_day = temp.rest_day;
                                }


                                if (temp.valid_from != temp.valid_to) {

                                    if (moment(date_list[day_number - 1]).isBetween(temp.valid_from, temp.valid_to)) {
                                        time_in = temp?.schedule_details?.all?.start_time
                                        time_out = temp?.schedule_details?.all?.end_time
                                        flex_time_in = temp?.schedule_details?.all?.start_flexy_time
                                        flex_time_out = temp?.schedule_details?.all?.end_flexy_time
                                        rest_day = temp.rest_day;
                                    } else {
                                        if (moment(date_list[day_number - 1]).isSame(temp.valid_from) || moment(date_list[day_number - 1]).isSame(temp.valid_to)) {
                                            time_in = temp?.schedule_details?.all?.start_time
                                            time_out = temp?.schedule_details?.all?.end_time
                                            flex_time_in = temp?.schedule_details?.all?.start_flexy_time
                                            flex_time_out = temp?.schedule_details?.all?.end_flexy_time
                                            rest_day = temp.rest_day;
                                        }
                                    }
                                }


                            })

                            return <Col>{moment(date_list[day_number - 1]).format("MMM, D")}
                                <Card>
                                    <div className={"card-body " + details}>
                                        <div class="schedule_info" >
                                            {rest_day.includes(day.format('ddd').toLowerCase()) ? "REST DAY" :

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
                        }

                    }



                })}{last_week_offset} </Row></React.Fragment>;
            })}
        </React.Fragment>) : (<React.Fragment></React.Fragment>)}
    </React.Fragment>);
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
        viewEmployeeDtr: (user_id, from, to) => dispatch(viewEmployeeDtr(user_id, from, to)),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
