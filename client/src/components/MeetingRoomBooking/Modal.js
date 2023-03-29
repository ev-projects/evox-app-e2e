import React, { useState } from "react";
import {
  Row,
  Form,
  Button,
  Col,
  Collapse,
  Container,
  Modal,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
const ModalAlert = () => {
  const [show, setShow] = useState(true);

  const handleClose = () => setShow(false);
  //   const handleShow = () => setShow(true);
  return (
    <Modal show={show} aria-labelledby="contained-modal-title-vcenter" size='xl'>
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Using Grid in Modal
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="show-grid" style={{width: "125% !important"}}>
        <Container style={{width: "125% !important"}}>
          <Row>
            <Col xs={12} md={8}>
              .col-xs-12 .col-md-8
            </Col>
            <Col xs={6} md={4}>
              .col-xs-6 .col-md-4
            </Col>
          </Row>

          <Row>
            <Col xs={6} md={4}>
              .col-xs-6 .col-md-4
            </Col>
            <Col xs={6} md={4}>
              .col-xs-6 .col-md-4
            </Col>
            <Col xs={6} md={4}>
              .col-xs-6 .col-md-4
            </Col>
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalAlert;
