import React, { Component } from "react";
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import DatePicker from "react-datepicker";

/* Note: This is how the Admin LTE Structured */

/** This is for the Header */
const ContainerHeader = (props) => {
    return(<div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0 text-dark">{props.children}</h1>
          </div>
        </div>
      </div>
    </div>);
}

/** Content Wrapper */
const ContainerWrapper = (props) => {
    return(<div class="content-wrapper">{props.children}</div>);
}

/** Content Body */
const ContainerBody = (props) => {
    return(<div class="content">{props.children}</div>);
}

/** Content - Contains the grid number, title and the body */
const Content = (props) => {
    return(
      <div class="container-fluid">
        <div class="row">
          <div class={"col-lg-" + props.col}>
            <div class="card">
              <div class="card-header border-0">
                <div class="d-flex justify-content-between">
                  <h3 class="card-title">{props.title}</h3>
                </div>
              </div>
              <div class="card-body">
                {props.children}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}

export {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody
}