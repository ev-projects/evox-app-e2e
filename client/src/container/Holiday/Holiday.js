import React, { Component } from "react";
import "./Holiday.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import { thisMonthHoliday } from '../../store/actions/client/clientActions'
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';
  
class Holiday extends Component {

  componentWillMount(){ 
    this.props.thisMonthHoliday( );
	}

  render() {
    const { holidays } = this.props.holiday;

    return  <div className="content-table bdr0">
      { holidays.length > 0  ? 
    <Table>
        <tbody>
            {holidays.map(function (data, i) {
              return  (
              <tr>
              <td className="date"><span className="icn"></span><span className="date">{data.holiday_date}</span></td>
              <td className="desc"> {data.holiday_name} </td>
              </tr>
              )
              }) 
            }
          </tbody>
    </Table>
    :
    <div>No holidays to be displayed</div>
    } 
 </div>;
  }
}


  
const mapStateToProps = (state) => {
return {
  user : state.user,
  holiday : state.dashboard
}
}
const mapDispatchToProps = (dispatch) => {
  return {
    thisMonthHoliday  : ( ) => dispatch( thisMonthHoliday( ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Holiday);








