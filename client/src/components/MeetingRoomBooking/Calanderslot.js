import React, { useState, useEffect, Component } from "react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Calendar } from "@fullcalendar/core";
import Modal from "react-bootstrap/Modal";
import "bootstrap/dist/css/bootstrap.min.css";
import { Row, Form, Button, Col, Collapse, Container } from "react-bootstrap";
const CalanderSlot = () => {
    const [show, setShow] = useState(false);
    const [open, setOpen] = useState(false);
    const [projectchk, setProjectorchk] = useState(false);
    const [monitorchk, setMonitorchk] = useState(false);
    const [laptopchk, setLaptopchk] = useState(false);
    const [desktopchk, setDesktopchk] = useState(false);
    const [audiochk, setAudiochk] = useState(false);
    const [itchk, setITchk] = useState(false);
    const [myArray, setMyArray] = useState([]);
    const [startdate, setStartdate] = useState('');
    const [enddate, setEnddate] = useState('');
    const [starttime, setStarttime] = useState('');
    const [endtime, setEndtime] = useState('');
    const handleClose = () => setShow(false);
  
    const handlesave =(e)=>{
  
      event.push( {
        title: "event 2",
        start: startdate+" "+starttime,
        end: enddate+" "+endtime,
      },)
      setShow(false)
     }
    const [event,setEvent] = useState([
      {
        title: "event 1",
        start: "2023-03-14 12:00:00",
        end: "2023-03-14 12:30",
      },
      {
        title: "event 2",
        start: "2023-03-14 13:00:00",
        end: "2023-03-14 13:30",
      },
    ],)
  
    
    useEffect(() => {
        document.addEventListener("DOMContentLoaded", function () {
      const calendarEl = document.getElementById("calendar");
      const calendar = new Calendar(calendarEl, {
        plugins: [timeGridPlugin, interactionPlugin],
        initialView: "timeGridWeek",
        weekends: true,
        selectable: true,
        selectMirror: true,
        unselectAuto: false,
        
        editable: false,
        eventStartEditable: false,
        eventResizableFromStart: false,
        eventDurationEditable: false,
  
        select: function (selectionInfo) {
          let startDT = selectionInfo.start.toString();
          let endDT = selectionInfo.end.toString();
          let starttime = startDT.substring(16, 21);
          let endtime = endDT.substring(16, 21);
          let startdate = JSON.stringify(selectionInfo.start);
          startdate = startdate.slice(1, 11);
          let enddate = JSON.stringify(selectionInfo.end);
          enddate = enddate.slice(1, 11);
          setStartdate(startdate);
          setEnddate(enddate);
          setStarttime(starttime);
          setEndtime(endtime)
          setShow(true);
          
        },
        
        events: event
      });
  
      calendar.render();
    });
    });
  return (
    <Container>
    <Row className="mb-4 mt-3">
   
      <Col>
      <Form.Group>
              <span class="details">Meeting Rooms</span>
              <Form.Select aria-label="Default select example" >

              </Form.Select>
              </Form.Group>
      </Col>
    </Row>
    <div id="calendar"></div>
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Book Meeting Room</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <span class="details">Start Date </span>
              <input type="date" placeholder="Start Date" value={startdate}></input>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group>
              <span class="details">Start Time </span>
              <Form.Select aria-label="Default select example" value={starttime}>
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
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <span class="details">End Date </span>
              <input type="date" placeholder="End Date" value={enddate}></input>
            </Form.Group>
          </Col>
          <Col>
            <Form.Group>
              <span class="details">End Time </span>
              <Form.Select aria-label="Default select example" value={endtime}>
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
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <input type="text" placeholder="Note" name="Note"></input>
          </Col>
        </Row>
        <Row>
          <Col>
            <Form.Group className="mt-2" id="formGridCheckbox">
              <Form.Check type="checkbox" label="IT Requirement" 
               onChange={(e) => {
                if(itchk == false){
                  setITchk(true);
                  setOpen(true);
                }else{
                  setITchk(false);
                  setOpen(false);
                }
             
              }} />
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
                    onChange={(e) => {
                      if(projectchk == false){
                        setProjectorchk(true);
                        myArray.push(e.target.value);
                      }else{
                        setProjectorchk(false)
                        myArray.pop(e.target.value);
                      }
                    
                    
                      alert(myArray);
                    }}
                  />
                </Form.Group>
                <Form.Group className="mt-2" id="formGridCheckbox">
                  <Form.Check
                    type="checkbox"
                    label="Monitor"
                    value="monitor"
                    onChange={(e) => {
                      if(monitorchk == false){
                        setMonitorchk(true);
                        myArray.push(e.target.value);
                      }else{
                        setMonitorchk(false)
                        myArray.pop(e.target.value);
                      }
                      alert(myArray);
                    }}
                  />
                </Form.Group>
                <Form.Group className="mt-2" id="formGridCheckbox">
                  <Form.Check
                    type="checkbox"
                    label="Laptop"
                    value="laptop"
                    onChange={(e) => {
                      if(laptopchk == false){
                        setLaptopchk(true);
                        myArray.push(e.target.value);
                      }else{
                        setLaptopchk(false)
                        myArray.pop(e.target.value);
                      }
                      alert(myArray);
                    }}
                  />
                </Form.Group>
                <Form.Group className="mt-2" id="formGridCheckbox">
                  <Form.Check
                    type="checkbox"
                    label="Desktop"
                    value="desktop"
                    onChange={(e) => {
                      if(desktopchk == false){
                        setDesktopchk(true);
                        myArray.push(e.target.value);
                      }else{
                        setDesktopchk(false)
                        myArray.pop(e.target.value);
                      }
                      alert(myArray);
                    }}
                  />
                </Form.Group>
                <Form.Group className="mt-2" id="formGridCheckbox">
                  <Form.Check
                    type="checkbox"
                    label="Audio"
                    value="audio"
                    onChange={(e) => {
                      if(audiochk == false){
                        setAudiochk(true);
                        myArray.push(e.target.value);
                      }else{
                        setAudiochk(false)
                        myArray.pop(e.target.value);
                      }
                      alert(myArray);
                    }}
                  />
                </Form.Group>
              </div>
            </Collapse>
          </Col>
        </Row>
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
    </Container>
  )
}

export default CalanderSlot;