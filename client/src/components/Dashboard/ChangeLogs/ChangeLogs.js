import React, { Component } from "react";
import "./ChangeLogs.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { getChangeLogs } from '../../../store/actions/dashboard/dashboardActions'
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';


function ChangeLogsInfo(props) {
    return (
      <div id="myModal" className="modal-main">
        <div className="modal-content">
          <div className="modal-header">
            <span className="close" onClick = {() => props.handleModalClose()}>&times;</span>
          </div>

          <div className="modal-body">
            <h2>Change Logs</h2>
            <p>{ props.changelogInfo.title } ({props.changelogInfo.log_from} - {props.changelogInfo.log_to})</p>
            <p><pre>{ props.changelogInfo.description }</pre></p>
          </div>
        </div>
      </div>    
    )
  }

class ChangeLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      changelogInfo: {},
      isShowModel: false
    };
    this.handleShow = this.handleShow.bind(this);
  }
    
  componentWillMount(){ 
    this.props.getChangeLogs();
  }

  handleShow = (data) => {    
    this.setState({
      changelogInfo: data,
      isShowModel: true
    });
  }

  handleOnhide = () =>{
    this.setState({
        isShowModel: false
    });
  }

  render() {
    const { changelogs } = this.props.changelog;

    return  <div className="content-table bdr0">
      { changelogs.length > 0  ? 
        <Table>
            <tbody>
                {changelogs.map(data =>
                <tr className="changelogs-tr" onClick={ () => { this.handleShow(data); }}>
                    <td className="date log-title"><span className="icn"></span><span className="date">{data.title}</span></td>
                    <td className="desc"> {data.log_from_short} to {data.log_to_short} </td>
                </tr>
                )}
            </tbody>
        </Table>
        :
        <div>No change logs to be displayed</div>
      } 
      {
        this.state.isShowModel &&
        <ChangeLogsInfo 
          changelogInfo = { this.state.changelogInfo }
          showModel = {this.state.isShowModel}
          handleModalClose = {() => {this.handleOnhide()}}
        />
        }
    </div>;
  }
}


  
const mapStateToProps = (state) => {
return {
  user : state.user,
  changelog : state.dashboard
}
}
const mapDispatchToProps = (dispatch) => {
  return {
    getChangeLogs  : ( ) => dispatch( getChangeLogs( ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(ChangeLogs);








