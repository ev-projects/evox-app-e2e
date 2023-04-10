import React, { useState, useEffect, useRef } from "react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Calendar } from "@fullcalendar/core";
import Modal from "react-bootstrap/Modal";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Row,
  Form,
  Button,
  Col,
  Collapse,
  Container,
  Overlay,
  Popover,
} from "react-bootstrap";
// import ModalAlert from "./Modal";
import "./MeetingRoom.css";
import { format } from "date-fns";
import dayjs from "dayjs";
import axios from "axios";
import { useParams } from "react-router-dom";
import moment from "moment";
import { Content } from "../GridComponent/AdminLte";
import PreLoader from "./PreLoader";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import PageLoading from "../../container/PageLoading/PageLoading";
import { useDispatch } from "react-redux";
import { fecthLocationdetails1 } from "./MeetingApprovalapi";
import {
  changeLocation,
  dropdownLocationdetails,
  dropdownMeetingRoomdetails,
} from "./FecthDetailsapi";
import { connect, dispatch } from "react-redux";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

const Meetingcalander = (props) => {
  const dispatch = useDispatch();
  const { user } = props;
  const [showalert, setShowalert] = useState(false);
  const [loader, setLoader] = useState(false);
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [projectchk, setProjectorchk] = useState(false);
  const [monitorchk, setMonitorchk] = useState(false);
  const [laptopchk, setLaptopchk] = useState(false);
  const [desktopchk, setDesktopchk] = useState(false);
  const [audiochk, setAudiochk] = useState(false);
  const [itchk, setITchk] = useState(false);
  const [myArray, setMyArray] = useState([]);
  const [startdate, setStartdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [starttime, setStarttime] = useState("");
  const [endtime, setEndtime] = useState("");
  const [roomlist, setRoomlist] = useState([]);
  const [event, setEvent] = useState([]);
  const [roomid, setRoomid] = useState("");
  const [roomname, setRoomname] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState("");
  const [hours, setHours] = useState(0);
  const [datalocation, setDatalocation] = useState([]);
  const [pageload, setPageload] = useState(false);
  const [validatenote, setValidatenote] = useState(false);
  const [validateit, setValidateit] = useState(false);
  const [validtimein, setValidtimein] = useState(false);
  const [validtimeout, setValidtimeout] = useState(false);
  const [timeinhours, setTimeinhours] = useState(0);
  const [timeouthours, setTimeouthours] = useState(0);
  const clearcheck = () => {
    setProjectorchk(false);
    setMonitorchk(false);
    setAudiochk(false);
    setLaptopchk(false);
    setDesktopchk(false);
    setMyArray([]);
  };

  useEffect(() => {
    dispatch(dropdownLocationdetails(setDatalocation));

    // dispatch(dropdownMeetingRoomdetails(setRoomlist));

    const calendarEl = document.getElementById("calendar");
    const calendar = new Calendar(calendarEl, {
      plugins: [timeGridPlugin, interactionPlugin],
      initialView: "timeGridWeek",
      weekends: true,
      selectable: true,
      selectMirror: true,
      unselectAuto: false,
      // default: false,
      contentHeight: "auto",
      editable: false,
      eventStartEditable: false,
      eventResizableFromStart: false,
      eventDurationEditable: false,

      eventMouseEnter: function (arg) {
        let startDT = arg.event.start.toString();
        let endDT = arg.event.end.toString();

        let starttime = startDT.substring(16, 21);
        let endtime = endDT.substring(16, 21);
        tippy(arg.el, {
          content:
            "StartTime: " +
            starttime +
            "  EndTime: " +
            endtime +
            " " +
            arg.event.title,
          // animation:true,
          allowHTML: true,
          theme: "light",
        });
      },

      select: function (selectionInfo) {
        if (roomid !== "") {
          let startDT = selectionInfo.start.toString();
          let endDT = selectionInfo.end.toString();

          let starttime = startDT.substring(16, 21);
          let endtime = endDT.substring(16, 21);
          let startmon = startDT.substring(4, 7);
          let startday = startDT.substring(8, 10);
          let startyear = startDT.substring(11, 15);
          let endmon = endDT.substring(4, 7);
          let endday = endDT.substring(8, 10);
          let endyear = endDT.substring(11, 15);
          let startdate = startday + "-" + startmon + "-" + startyear;
          let enddate = endday + "-" + endmon + "-" + endyear;

          var stdate = Date.parse(startdate);
          var eddate = Date.parse(enddate);
          var d = format(stdate, "yyyy-MM-dd");
          var e = format(eddate, "yyyy-MM-dd");

          setStartdate(d);
          setEnddate(e);
          setStarttime(starttime);
          setEndtime(endtime);
          setShow(true);
          console.log(show);
        } else {
          alert("Please Choose Meeting Room...");
          setShowalert(true);
        }
      },

      events: event,
      eventColor: "#0097a7",
    });

    calendar.render();
  }, []);
  let validit = false;
  const vaildatecheck = async () => {
    if (itchk == true) {
      // alert("test11")
      if (
        projectchk == true ||
        monitorchk == true ||
        desktopchk == true ||
        audiochk == true ||
        laptopchk == true
      ) {
        // alert("test12");
        setValidateit(false);
        validit = false;
      } else {
        // alert("test13");
        setValidateit(true);
        validit = true;
      }
    }
  };

  const handlesave = async (e) => {
    if (hours > 0) {
      await vaildatecheck();
      console.log(validit);
      if (validit == false) {
        setLoader(true);
        setPageload(true);
        var stdate = startdate + " " + starttime;
        var endate = enddate + " " + endtime;
        var idate = Date.parse(startdate);
        var dateq;
        if (day == "Mon") {
          dateq = dayjs(idate).subtract(1, "day");
          var d = Date.parse(dateq);
          dateq = format(d, "yyyy-MM-dd");
        }
        if (day == "Tue") {
          dateq = dayjs(idate).subtract(2, "day");
          var d = Date.parse(dateq);
          dateq = format(d, "yyyy-MM-dd");
        }
        if (day == "Wed") {
          dateq = dayjs(idate).subtract(3, "day");
          var d = Date.parse(dateq);
          dateq = format(d, "yyyy-MM-dd");
        }
        if (day == "Thu") {
          dateq = dayjs(idate).subtract(4, "day");
          var d = Date.parse(dateq);
          dateq = format(d, "yyyy-MM-dd");
        }
        if (day == "Fri") {
          dateq = dayjs(idate).subtract(5, "day");
          var d = Date.parse(dateq);
          dateq = format(d, "yyyy-MM-dd");
        }
        if (day == "Sat") {
          dateq = dayjs(idate).subtract(6, "day");
          var d = Date.parse(dateq);
          dateq = format(d, "yyyy-MM-dd");
        }
        if (day == "Sun") {
          dateq = format(idate, "yyyy-MM-dd");
        }
        if (note !== "") {
          API.call({
            method: "post",
            url: "/storebooking",
            data: {
              Roomid: roomid,
              Userid: props.params.id,
              Startdatetime: stdate,
              EnddateTime: endate,
              Note: note,
              ITRequirement: myArray,
              Totalhours: hours,
            },
          })
            .then((response) => {
              if (response.data.status === "200") {
                setLoader(false);
                setNote("");
                // setPageload(false);
                if (hours <= 2) {
                  event.push({
                    title:
                      roomname +
                      " Booked by " +
                      user.first_name +
                      " " +
                      user.last_name,
                    start: startdate + " " + starttime,
                    end: enddate + " " + endtime,
                  });
                  dispatch(Formatter.alert_success(response, 3000));
                } else {
                  handleClose();
                  // alert(response.data.message + ", Kindly Wait For Approval");
                  dispatch(Formatter.alert_success(response, 3000));
                }

                var len = myArray.length + 1;

                for (var i = 0; i <= len; i++) {
                  myArray.pop();
                }
                setOpen(false);
                setProjectorchk(false);
                setMonitorchk(false);
                setAudiochk(false);
                setDesktopchk(false);
                setLaptopchk(false);
                setITchk(false);
                // setOpen(false);

                const calendarEl = document.getElementById("calendar");
                const calendar = new Calendar(calendarEl, {
                  plugins: [timeGridPlugin, interactionPlugin],
                  initialView: "timeGridWeek",
                  weekends: true,
                  selectable: true,
                  selectMirror: true,
                  unselectAuto: false,
                  contentHeight: "auto",
                  initialDate: dateq,
                  editable: false,
                  eventStartEditable: false,
                  eventResizableFromStart: false,
                  eventDurationEditable: false,

                  eventMouseEnter: function (arg) {
                    let startDT = arg.event.start.toString();
                    let endDT = arg.event.end.toString();

                    let starttime = startDT.substring(16, 21);
                    let endtime = endDT.substring(16, 21);
                    tippy(arg.el, {
                      content:
                        "StartTime: " +
                        starttime +
                        "  EndTime: " +
                        endtime +
                        " " +
                        arg.event.title,
                      // animation:true,
                      allowHTML: true,
                      theme: "light",
                    });
                  },

                  select: function (selectionInfo) {
                    let startDT = selectionInfo.start.toString();
                    let endDT = selectionInfo.end.toString();

                    let starttime = startDT.substring(16, 21);
                    let endtime = endDT.substring(16, 21);
                    let startmon = startDT.substring(4, 7);
                    let startday = startDT.substring(8, 10);
                    let startyear = startDT.substring(11, 15);
                    let endmon = endDT.substring(4, 7);
                    let endday = endDT.substring(8, 10);
                    let endyear = endDT.substring(11, 15);
                    let startdate = startday + "-" + startmon + "-" + startyear;
                    let enddate = endday + "-" + endmon + "-" + endyear;
                    let day = startDT.substring(0, 3);
                    setDay(day);
                    var stdate = Date.parse(startdate);
                    var eddate = Date.parse(enddate);
                    var d = format(stdate, "yyyy-MM-dd");
                    var e = format(eddate, "yyyy-MM-dd");

                    const current = new Date();
                    const date = `${current.getFullYear()}-${
                      current.getMonth() + 1
                    }-${current.getDate()}`;
                    const cudate = Date.parse(date);
                    var dq = format(cudate, "yyyy-MM-dd");
                    if (d >= dq) {
                      if (d == e) {
                        const startDate = moment(d + " " + starttime);
                        const timeEnd = moment(e + " " + endtime);
                        const diff = timeEnd.diff(startDate);
                        const diffDuration = moment.duration(diff);
                        const hours = diffDuration.asMinutes() / 60;
                        setHours(hours);
                        setStartdate(d);
                        setEnddate(e);
                        setStarttime(starttime);
                        setEndtime(endtime);
                        setShow(true);
                        console.log(show);
                      } else {
                        alert("Could Not Book For Multiple Dates");
                        handleClose();
                      }
                    } else {
                      alert("Could Not Book For Previous Dates");
                      handleClose();
                    }
                  },
                  selectOverlap: function (event) {
                    return event.rendering === "background";
                  },

                  events: event,
                  eventColor: "#0097a7",
                });

                calendar.render();
                console.log(event);
                setShow(false);
              } else if (response.data.status === "201") {
                setLoader(false);
                setShow(false);
                dispatch(Formatter.alert_success(response, 5000));
                handleClose();
              }

              dispatch({
                type: "SET_REDIRECT",
                link: global.links.dashboard,
              });
            })
            .catch((e) => {
              setLoader(false);
              dispatch(Formatter.alert_error(e));
            });
        } else {
          setValidatenote(true);
          setLoader(false);
        }
      }
    } else {
      alert("Please Select Vaild Start And End Time");
      setValidtimein(true);
      setValidtimeout(true);
    }
  };

  const onlocationchange = (e) => {
    dispatch(changeLocation(e.target.value, setRoomlist));
  };

  const onroomchange = (e) => {
    var len = event.length + 1;

    for (var i = 0; i <= len; i++) {
      event.pop();
    }
    var val = e.target.value;
    setRoomname(e.target.selectedOptions[0].text);
    setRoomid(val);
    API.call({
      method: "get",
      url: `/Getbookingroom/${val}`,
    })
      .then((response) => {
        for (var i = 0; i < response.data.length; i++) {
          console.log(response.data[i].name);

          event.push({
            title:
              response.data[i].name +
              " Booked By " +
              response.data[i].first_name +
              " " +
              response.data[i].last_name,
            start: response.data[i].start_date,
            end: response.data[i].end_date,
            // color: "blue"
          });
        }

        const calendarEl = document.getElementById("calendar");
        const calendar = new Calendar(calendarEl, {
          plugins: [timeGridPlugin, interactionPlugin],
          initialView: "timeGridWeek",
          weekends: true,
          selectable: true,
          selectMirror: true,
          unselectAuto: false,
          contentHeight: "auto",
          editable: false,
          eventStartEditable: false,
          eventResizableFromStart: false,
          eventDurationEditable: false,

          eventMouseEnter: function (arg) {
            let startDT = arg.event.start.toString();
            let endDT = arg.event.end.toString();

            let starttime = startDT.substring(16, 21);
            let endtime = endDT.substring(16, 21);
            tippy(arg.el, {
              content:
                "StartTime: " +
                starttime +
                "  EndTime: " +
                endtime +
                " " +
                arg.event.title,
              // animation:true,
              allowHTML: true,
              theme: "light",
            });
          },

          select: function (selectionInfo) {
            let startDT = selectionInfo.start.toString();
            let endDT = selectionInfo.end.toString();

            let starttime = startDT.substring(16, 21);
            let endtime = endDT.substring(16, 21);
            let startmon = startDT.substring(4, 7);
            let startday = startDT.substring(8, 10);
            let startyear = startDT.substring(11, 15);
            let endmon = endDT.substring(4, 7);
            let endday = endDT.substring(8, 10);
            let endyear = endDT.substring(11, 15);
            let startdate = startday + "-" + startmon + "-" + startyear;
            let enddate = endday + "-" + endmon + "-" + endyear;
            let day = startDT.substring(0, 3);
            setDay(day);
            var stdate = Date.parse(startdate);
            var eddate = Date.parse(enddate);
            var d = format(stdate, "yyyy-MM-dd");
            var e = format(eddate, "yyyy-MM-dd");
            const current = new Date();
            const date = `${current.getFullYear()}-${
              current.getMonth() + 1
            }-${current.getDate()}`;
            const cudate = Date.parse(date);
            var dq = format(cudate, "yyyy-MM-dd");
            if (d >= dq) {
              if (d == e) {
                const startDate = moment(d + " " + starttime);
                const timeEnd = moment(e + " " + endtime);
                const diff = timeEnd.diff(startDate);
                const diffDuration = moment.duration(diff);
                const hours = diffDuration.asMinutes() / 60;

                setHours(hours);
                setStartdate(d);
                setEnddate(e);
                setStarttime(starttime);
                setEndtime(endtime);
                setShow(true);
                console.log(show);
              } else {
                alert("Could Not Book For Multiple Dates");
                handleClose();
              }
            } else {
              alert("Could Not Book For Previous Dates");
              handleClose();
            }
          },

          selectOverlap: function (event) {
            return event.rendering === "background";
          },

          events: event,
          eventColor: "#0097a7",
        });

        calendar.render();
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };

  const handleClose = () => {
    var stdate = startdate + " " + starttime;
    var endate = enddate + " " + endtime;
    var idate = Date.parse(startdate);
    setValidatenote(false);
    setValidateit(false);
    var dateq;
    if (day == "Mon") {
      dateq = dayjs(idate).subtract(1, "day");
      var d = Date.parse(dateq);
      dateq = format(d, "yyyy-MM-dd");
    }
    if (day == "Tue") {
      dateq = dayjs(idate).subtract(2, "day");
      var d = Date.parse(dateq);
      dateq = format(d, "yyyy-MM-dd");
    }
    if (day == "Wed") {
      dateq = dayjs(idate).subtract(3, "day");
      var d = Date.parse(dateq);
      dateq = format(d, "yyyy-MM-dd");
    }
    if (day == "Thu") {
      dateq = dayjs(idate).subtract(4, "day");
      var d = Date.parse(dateq);
      dateq = format(d, "yyyy-MM-dd");
    }
    if (day == "Fri") {
      dateq = dayjs(idate).subtract(5, "day");
      var d = Date.parse(dateq);
      dateq = format(d, "yyyy-MM-dd");
    }
    if (day == "Sat") {
      dateq = dayjs(idate).subtract(6, "day");
      var d = Date.parse(dateq);
      dateq = format(d, "yyyy-MM-dd");
    }
    if (day == "Sun") {
      dateq = format(idate, "yyyy-MM-dd");
    }
    const calendarEl = document.getElementById("calendar");
    const calendar = new Calendar(calendarEl, {
      plugins: [timeGridPlugin, interactionPlugin],
      initialView: "timeGridWeek",
      weekends: true,
      selectable: true,
      selectMirror: true,
      unselectAuto: false,
      contentHeight: "auto",
      initialDate: dateq,
      editable: false,
      eventStartEditable: false,
      eventResizableFromStart: false,
      eventDurationEditable: false,

      eventMouseEnter: function (arg) {
        let startDT = arg.event.start.toString();
        let endDT = arg.event.end.toString();

        let starttime = startDT.substring(16, 21);
        let endtime = endDT.substring(16, 21);
        tippy(arg.el, {
          content:
            "StartTime: " +
            starttime +
            "  EndTime: " +
            endtime +
            " <br> " +
            arg.event.title,
          // animation:true,
          allowHTML: true,
          theme: "light",
        });
      },

      select: function (selectionInfo) {
        let startDT = selectionInfo.start.toString();
        let endDT = selectionInfo.end.toString();

        let starttime = startDT.substring(16, 21);
        let endtime = endDT.substring(16, 21);
        let startmon = startDT.substring(4, 7);
        let startday = startDT.substring(8, 10);
        let startyear = startDT.substring(11, 15);
        let endmon = endDT.substring(4, 7);
        let endday = endDT.substring(8, 10);
        let endyear = endDT.substring(11, 15);
        let startdate = startday + "-" + startmon + "-" + startyear;
        let enddate = endday + "-" + endmon + "-" + endyear;
        let day = startDT.substring(0, 3);
        setDay(day);
        var stdate = Date.parse(startdate);
        var eddate = Date.parse(enddate);
        var d = format(stdate, "yyyy-MM-dd");
        var e = format(eddate, "yyyy-MM-dd");
        const current = new Date();
        const date = `${current.getFullYear()}-${
          current.getMonth() + 1
        }-${current.getDate()}`;
        const cudate = Date.parse(date);
        var dq = format(cudate, "yyyy-MM-dd");
        if (d >= dq) {
          if (d == e) {
            const startDate = moment(d + " " + starttime);
            const timeEnd = moment(e + " " + endtime);
            const diff = timeEnd.diff(startDate);
            const diffDuration = moment.duration(diff);
            const hours = diffDuration.asMinutes() / 60;
            setHours(hours);
            setStartdate(d);
            setEnddate(e);
            setStarttime(starttime);
            setEndtime(endtime);
            setShow(true);
            console.log(show);
          } else {
            alert("Could Not Book For Multiple Dates");
            handleClose();
          }
        } else {
          alert("Could Not Book For Previous Dates");
          handleClose();
        }
      },

      selectOverlap: function (event) {
        return event.rendering === "background";
      },

      events: event,
      eventColor: "#0097a7",
    });

    calendar.render();
    setShow(false);
    setProjectorchk(false);
    setMonitorchk(false);
    setAudiochk(false);
    setDesktopchk(false);
    setLaptopchk(false);
    setITchk(false);
    setOpen(false);
    setNote("");
    setValidtimein(false);
    setValidtimeout(false);
    setMyArray([]);
  };

  return (
    <div>
      <div style={{ paddingLeft: "7%", paddingRight: "2%" }}>
        <Row>
          <Col>
            <div className="form-group">
              <label>Location</label>
              <select
                name="type"
                className="form-control"
                onChange={onlocationchange}
              >
                <option value="">- Select Location -</option>
                {datalocation.length > 0 &&
                  datalocation.map((items, pos) => (
                    <option value={items.id}>{items.location_name}</option>
                  ))}
              </select>
            </div>
          </Col>
          <Col>
            <div className="form-group">
              <label>Meeting Room</label>
              <select
                name="type"
                className="form-control"
                onChange={onroomchange}
              >
                <option value="">- Select Room -</option>
                {roomlist.length > 0 &&
                  roomlist.map((items, pos) => (
                    <option value={items.id}>{items.name}</option>
                  ))}
              </select>
            </div>
          </Col>
        </Row>

        <div className="mb-5">
          <Content>
            <div id="calendar"></div>
          </Content>
        </div>

        {/* {show && <ModalAlert modalstate={show} />} */}

        <Modal
          show={show}
          aria-labelledby="contained-modal-title-vcenter"
          size="xl"
          fullscreen="lg-down"
          onHide={handleClose}
        >
          {loader && <PreLoader />}
          <Modal.Header closeButton={false}>
            <Modal.Title id="contained-modal-title-vcenter">
              Reserve Meeting Room
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="show-grid">
            <Container>
              <Row className="mb-3">
                <Col>
                  <label>
                    Room Name:
                    <span style={{ fontWeight: "bold" }}>{roomname}</span>
                  </label>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col>
                  <Form.Group>
                    <span class="details">Start Date</span>
                    <input
                      type="date"
                      disabled
                      placeholder="Start Date"
                      className="form-control"
                      value={startdate}
                      onChange={(e) => {
                        setStartdate(e.target.value);
                      }}
                    ></input>
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <span class="details">Start Time </span>
                    <br></br>
                    <select
                      className="form-control"
                      value={starttime}
                      onChange={(e) => {
                        // setStarttime(e.target.value);
                        const startDate = moment(
                          startdate + " " + e.target.value
                        );
                        const timeEnd = moment(enddate + " " + endtime);
                        const diff = timeEnd.diff(startDate);
                        const diffDuration = moment.duration(diff);
                        const hours = diffDuration.asMinutes() / 60;
                        // alert(hours);
                        // if(hours>0){
                        setHours(hours);
                        setStarttime(e.target.value);
                        setValidtimein(false);
                        setValidtimeout(false);
                        setTimeinhours(hours);
                        // }else{
                        //   setValidtimein(true);
                        // }
                      }}
                    >
                      <option value="00:00">12:00 AM</option>
                      <option value="00:30">12:30 AM</option>
                      <option value="01:00">01:00 AM</option>
                      <option value="01:30">01:30 AM</option>
                      <option value="02:00">02:00 AM</option>
                      <option value="02:30">02:30 AM</option>
                      <option value="03:00">03:00 AM</option>
                      <option value="03:30">03:30 AM</option>
                      <option value="04:00">04:00 AM</option>
                      <option value="04:30">04:30 AM</option>
                      <option value="05:00">05:00 AM</option>
                      <option value="05:30">05:30 AM</option>
                      <option value="06:00">06:00 AM</option>
                      <option value="06:30">06:30 AM</option>
                      <option value="07:00">07:00 AM</option>
                      <option value="07:30">07:30 AM</option>
                      <option value="08:00">08:00 AM</option>
                      <option value="08:30">08:30 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="13:30">01:30 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="14:30">02:30 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="15:30">03:30 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="16:30">04:30 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="17:30">05:30 PM</option>
                      <option value="18:00">06:00 PM</option>
                      <option value="18:30">06:30 PM</option>
                      <option value="19:00">07:00 PM</option>
                      <option value="19:30">07:30 PM</option>
                      <option value="20:00">08:00 PM</option>
                      <option value="20:30">08:30 PM</option>
                      <option value="21:00">09:00 PM</option>
                      <option value="21:30">09:30 PM</option>
                      <option value="22:00">10:00 PM</option>
                      <option value="22:30">10:30 PM</option>
                      <option value="23:00">11:00 PM</option>
                      <option value="23:30">11:30 PM</option>
                    </select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col>
                  <Form.Group>
                    <span class="details">End Date </span>
                    <input
                      type="date"
                      disabled
                      placeholder="End Date"
                      className="form-control"
                      value={enddate}
                      onChange={(e) => {
                        setEnddate(e.target.value);
                      }}
                    ></input>
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group>
                    <span class="details">End Time </span>
                    <br></br>
                    <select
                      className="form-control"
                      value={endtime}
                      onChange={(e) => {
                        const startDate = moment(startdate + " " + starttime);
                        const timeEnd = moment(enddate + " " + e.target.value);
                        const diff = timeEnd.diff(startDate);
                        const diffDuration = moment.duration(diff);
                        const hours = diffDuration.asMinutes() / 60;

                        // if(hours>0){
                        setHours(hours);
                        setEndtime(e.target.value);
                        setValidtimeout(false);
                        setValidtimein(false);
                        setTimeouthours(hours);
                        // }else{
                        //   setValidtimeout(true);
                        // }
                      }}
                    >
                      <option value="00:00">12:00 AM</option>
                      <option value="00:30">12:30 AM</option>
                      <option value="01:00">01:00 AM</option>
                      <option value="01:30">01:30 AM</option>
                      <option value="02:00">02:00 AM</option>
                      <option value="02:30">02:30 AM</option>
                      <option value="03:00">03:00 AM</option>
                      <option value="03:30">03:30 AM</option>
                      <option value="04:00">04:00 AM</option>
                      <option value="04:30">04:30 AM</option>
                      <option value="05:00">05:00 AM</option>
                      <option value="05:30">05:30 AM</option>
                      <option value="06:00">06:00 AM</option>
                      <option value="06:30">06:30 AM</option>
                      <option value="07:00">07:00 AM</option>
                      <option value="07:30">07:30 AM</option>
                      <option value="08:00">08:00 AM</option>
                      <option value="08:30">08:30 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="13:30">01:30 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="14:30">02:30 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="15:30">03:30 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="16:30">04:30 PM</option>
                      <option value="17:00">05:00 PM</option>
                      <option value="17:30">05:30 PM</option>
                      <option value="18:00">06:00 PM</option>
                      <option value="18:30">06:30 PM</option>
                      <option value="19:00">07:00 PM</option>
                      <option value="19:30">07:30 PM</option>
                      <option value="20:00">08:00 PM</option>
                      <option value="20:30">08:30 PM</option>
                      <option value="21:00">09:00 PM</option>
                      <option value="21:30">09:30 PM</option>
                      <option value="22:00">10:00 PM</option>
                      <option value="22:30">10:30 PM</option>
                      <option value="23:00">11:00 PM</option>
                      <option value="23:30">11:30 PM</option>
                    </select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  {validtimeout == true ||
                    validtimein == true && (
                      <label style={{ color: "red" }}>
                        Please Select Valid Start And End Time
                      </label>
                    )}
                </Col>
              </Row>

              <Row>
                <Col>
                  <input
                    type="text"
                    placeholder="Note"
                    name="Note"
                    className="form-control"
                    onChange={(e) => {
                      setNote(e.target.value);
                      if (e.target.value == "") {
                        setValidatenote(true);
                      } else {
                        setValidatenote(false);
                      }
                    }}
                  ></input>
                  {validatenote && (
                    <label style={{ color: "red" }}>Please Enter Note</label>
                  )}
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mt-2" id="formGridCheckbox">
                    <Form.Check
                      type="checkbox"
                      label="IT Requirement"
                      onChange={(e) => {
                        if (itchk == false) {
                          setITchk(true);
                          setOpen(true);
                          console.log("Test" + open);

                          // alert("Test");
                        } else {
                          setITchk(false);
                          setOpen(false);
                          clearcheck();

                          console.log("test");
                        }
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Collapse in={open}>
                    <div id="example-collapse-text">
                      <Form.Group className="mt-2" id="formGridCheckbox">
                        <Form.Check
                          type="checkbox"
                          label="Projector"
                          value="projector"
                          checked={projectchk}
                          onChange={(e) => {
                            if (projectchk == false) {
                              setProjectorchk(true);
                              myArray.push(e.target.value);
                            } else {
                              setProjectorchk(false);
                              // myArray.pop(e.target.value);
                              var index = myArray.indexOf(e.target.value);
                              if (index !== -1) {
                                myArray.splice(index, 1);
                              }
                            }
                          }}
                        />
                      </Form.Group>
                      <Form.Group className="mt-2" id="formGridCheckbox">
                        <Form.Check
                          type="checkbox"
                          label="Monitor"
                          value="monitor"
                          checked={monitorchk}
                          onChange={(e) => {
                            if (monitorchk == false) {
                              setMonitorchk(true);
                              myArray.push(e.target.value);
                            } else {
                              setMonitorchk(false);
                              // myArray.pop(e.target.value);
                              var index = myArray.indexOf(e.target.value);
                              if (index !== -1) {
                                myArray.splice(index, 1);
                              }
                            }
                          }}
                        />
                      </Form.Group>
                      <Form.Group className="mt-2" id="formGridCheckbox">
                        <Form.Check
                          type="checkbox"
                          label="Laptop"
                          value="laptop"
                          checked={laptopchk}
                          onChange={(e) => {
                            if (laptopchk == false) {
                              setLaptopchk(true);
                              myArray.push(e.target.value);
                            } else {
                              setLaptopchk(false);
                              // myArray.pop(e.target.value);
                              var index = myArray.indexOf(e.target.value);
                              if (index !== -1) {
                                myArray.splice(index, 1);
                              }
                            }
                          }}
                        />
                      </Form.Group>
                      <Form.Group className="mt-2" id="formGridCheckbox">
                        <Form.Check
                          type="checkbox"
                          label="Desktop"
                          value="desktop"
                          checked={desktopchk}
                          onChange={(e) => {
                            if (desktopchk == false) {
                              setDesktopchk(true);
                              myArray.push(e.target.value);
                            } else {
                              setDesktopchk(false);
                              // myArray.pop(e.target.value);
                              var index = myArray.indexOf(e.target.value);
                              if (index !== -1) {
                                myArray.splice(index, 1);
                              }
                            }
                          }}
                        />
                      </Form.Group>
                      <Form.Group className="mt-2" id="formGridCheckbox">
                        <Form.Check
                          type="checkbox"
                          label="Audio"
                          value="audio"
                          checked={audiochk}
                          onChange={(e) => {
                            if (audiochk == false) {
                              setAudiochk(true);
                              myArray.push(e.target.value);
                            } else {
                              setAudiochk(false);
                              // myArray.pop(e.target.value);
                              var index = myArray.indexOf(e.target.value);
                              if (index !== -1) {
                                myArray.splice(index, 1);
                              }
                            }
                          }}
                        />
                      </Form.Group>
                      {validateit && (
                        <label style={{ color: "red" }}>
                          Please Check Atleast One
                        </label>
                      )}
                    </div>
                  </Collapse>
                </Col>
              </Row>
            </Container>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button variant="primary" onClick={handlesave}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>

        {/* {showalert &&  <AlertCalander/>} */}

        {/* {pageload && <PageLoading />} */}

        {/* <button onClick={handleClose}>asddadsadasdadasdasdasdasdasdasdddddddddddddddddddddddddddddd</button> */}
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    user: state.user,
    myTeamList: state.myTeamList,
  };
};

export default connect(mapStateToProps)(Meetingcalander);
