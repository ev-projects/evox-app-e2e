import React, { useState, useEffect, useRef } from 'react';
import { connect, useDispatch } from 'react-redux';
import { Table, Accordion, Card, Button } from "react-bootstrap";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import JSZip from 'jszip';
import MultiSelect from "react-multi-select-component";
import {
  ContainerHeader,
  Content,
  ContainerWrapper,
  ContainerBody,
  Row,
  Col,
} from "../../components/GridComponent/AdminLte.js";
import Wrapper from "../Template/Wrapper";
import PoliciesDocumentViewer from './PoliciesDocumentViewer';
import "./PoliciesDocumentUpload.css";
import {
  fecthUserContry, fecthUserDepartment
} from "./PoliciesDocumentApi.js";
const PoliciesDocumentDownload = (props) => {
  const dispatch = useDispatch();
  const { user, usercountry, policiesdocument, userdepartment } = props;
  const [files, setFiles] = useState([]);
  const [vlaidatecountry, setValidateCountry] = useState(false);
  const [isindex, setIndex] = useState(false);
  const [isId, setId] = useState(false);
  const [vlaidatedepartment, setValidateDepartment] = useState(false);
  const [countryid, setCountryId] = useState(0);
  const [selectedOption, setSelectedOption] = useState('Global');
  const [radiovalidation, setRadioValidation] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    GlobalType: 1,
    CountryId: user.country_id,
    DepartmentId: [],
    selectedDepartments: "All"
  });
  // Function to open the modal
  const openModal = () => setIsModalOpen(true);

  // Function to close the modal
  const closeModal = () => {
    setId(false);
    setIsModalOpen(false);
    dispatch({ 'type': 'CLEAR_MY_POLICY_DOC' })
  }

  const handleviewer = (pos, id) => {
    setIndex(pos);
    setId(id);
    openModal();
  }

  useEffect(() => {
    // dispatch(fecthUserContry(1));
    // dispatch(fecthUserDepartment(1,0,1));

    handleFilter();
  }, []);

  const handleFilter = async () => {
    // if(formData.GlobalType === 0 && formData.CountryId === 0){
    //   setValidateCountry(true);
    // }else{
    await API.call({
      method: "get",
      url: `/show`,
      params: formData
    })
      .then((result) => {
        dispatch({
          type: 'FETCH_MY_POLICIES_DOC',
          data: result.data, // Ensure you're dispatching the correct data structure
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
    // }

  }

  return (
    <div>
      <Wrapper>
        <ContainerBody>
          <Content col="12" label="Create Room">

            <div className='heading-style'>
              {/* <h3 className='download-header'>Download Policies Document</h3> */}
            </div>

            <Accordion alwaysopen className='accordion-main'>
              {policiesdocument != undefined && Object.values(policiesdocument).length > 0 ?
                Object.values(policiesdocument).map((file, pos) => {
                  return (
                    <Card className='accordion-card' key={pos}>
                      <div className='accordion-card-header'>
                        <Accordion.Toggle as={Button}
                          variant="link" eventKey={pos + 1} className="tooglestyle">
                          {Object.keys(policiesdocument)[pos]}
                          <span className='accordion-card-header-icon'><i class="fa fa-caret-down"></i></span>
                        </Accordion.Toggle>
                      </div>
                      <Accordion.Collapse eventKey={pos + 1}>
                        <Card.Body className="removeborder">
                          <table class="table">
                            <thead>
                              <tr>
                                <th scope="col">Sno</th>
                                <th scope="col">Title</th>
                                <th scope="col">Geo</th>
                                <th scope="col" style={{ "textAlign": "center" }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {file.map((item, index) => {
                                let link = '';
                                switch (item.FileExtension) {
                                  case "csv":
                                    link = "/images/excel.png";
                                    break;
                                  case "xlsx":
                                    link = "/images/excel.png";
                                    break;
                                  case "docx":
                                    link = "/images/doc.png";
                                    break;
                                  case "pdf":
                                    link = "/images/pdf.png";
                                    break;
                                  case "png":
                                    link = "/images/img.png";
                                    break;
                                  case "jpg":
                                    link = "/images/img.png";
                                    break;
                                  case "jpeg":
                                    link = "/images/img.png";
                                    break;
                                  default:
                                    link = ''; // Handle the default case if needed
                                }
                                return (
                                  <tr key={index}>
                                    <th scope="row">{index + 1}</th>
                                    <td className='tdcontent'><img src={link} className='back-img'></img><span>{item.Title}</span></td>
                                    <td>{item.countryname}</td>
                                    <td style={{ "textAlign": "center" }}><button class="download-btn" onClick={() => handleviewer(index, item.Id)}><i class="fa fa-eye" aria-hidden="true"></i></button></td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </Card.Body>
                      </Accordion.Collapse>
                    </Card>
                  )
                }) :
                <div style={{ overflowY: 'auto', padding: '0px 33px', fontSize: '14px' }}>
                  <Table striped bordered hover tableheader>
                    <tbody>
                      <tr><td colSpan="3" className='notfound'><h4><img src="/images/nodata.png" className='back-img'></img> No Document Found</h4></td></tr>
                    </tbody>
                  </Table>
                </div>
              }
            </Accordion>
          </Content>
        </ContainerBody>
      </Wrapper>

      {isId && policiesdocument &&
        <PoliciesDocumentViewer isOpen={isModalOpen} closeModal={closeModal} policiesdocument={policiesdocument} index={isindex} id={isId} />
      }
    </div>

  )
}
const mapStateToProps = (state) => {
  return {
    user: state.user,
    usercountry: state.dashboard.my_country,
    policiesdocument: state.dashboard.my_doc,
    userdepartment: state.dashboard.my_department,
  };
};
export default connect(mapStateToProps)(PoliciesDocumentDownload);
