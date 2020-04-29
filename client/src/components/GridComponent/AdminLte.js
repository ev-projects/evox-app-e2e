import React, { Component } from "react";
import DatePicker from "react-datepicker";

/* Note: This is how the Admin LTE Structured */

/** This is for the Header */
const ContainerHeader = (props) => {
    return(<div className="content-header">
      <div className="container-fluid">
        <div className="row mb-2">
          <div className="col-sm-6">
            <h1 className="m-0 text-dark">{props.children}</h1>
          </div>
        </div>
      </div>
    </div>);
}

/** Content Wrapper */
const ContainerWrapper = (props) => {
    return(<div className="content-wrapper">{props.children}</div>);
}

/** Content Body */
const ContainerBody = (props) => {
    return(<div className="content">{props.children}</div>);
}

/** Content - Contains the grid number, title and the body */
const Content = (props) => {
    return(
      <div className="container-fluid">
        <div className="row">
          <div className={"col-lg-" + props.col}>
            <div className="card">
              <div className="card-header border-0">
                <div className="d-flex justify-content-between">
                  <h3 className="card-title">{props.title}</h3>
                </div>
              </div>
              <div className="card-body">
                {props.children}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}

/** This is for row of grid system */
const Row = (props) => {
    return(<div className="row">{props.children}</div>);
}

/** This is for row of grid system */
const Col = (props) => {
    return(<div className={"col-sm-"+props.size}>{props.children}</div>);
}

/** */
const Timepicker = (props) => {
    return(<div className={"col-sm-"+props.size}>{props.children}</div>);
}


export {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
  Row,
  Col,
}