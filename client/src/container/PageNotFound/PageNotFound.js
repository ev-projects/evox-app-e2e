import React, { Component } from "react";
import { Container,Col } from 'react-bootstrap';
import "./PageNotFound.css";

class PageNotFound extends Component {
  render() {
    return <div><Container> 
        <Col sm={8} >
        <h1> ERROR 404</h1>
        <h2> The requested url doesn't exist</h2>
        </Col>
        </Container></div>;
  }
}

export default PageNotFound;
