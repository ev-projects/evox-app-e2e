import React, { Component } from "react";
import "./JobOpenings.css";
import { connect } from "react-redux";
class JobOpenings extends Component {
  constructor(props, context) {
    super(props, context);
  }
  render() {
    return (
      <>
        <div className="jobs-tab">
          <iframe src="https://client.taptalent.io/career/eastvantage?showOnlyJobs=true " style={{ width:"100%", height:"1200px", border:"none" }}></iframe>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return { };
}
const mapDispatchToProps = (dispatch) => {
  return { };
}
export default connect(mapStateToProps, mapDispatchToProps)(JobOpenings);
